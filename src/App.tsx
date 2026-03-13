import { GoogleGenAI, Type } from '@google/genai';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState, useRef, useCallback } from 'react';
import ProcessingView from './components/ProcessingView';
import ResultsView from './components/ResultsView';
import Sidebar from './components/Sidebar';
import UploadZone from './components/UploadZone';
import { extractTextFromPDF, fileToBase64 } from './lib/pdf';
import type { HistoryItem, Redaction, Status } from './types';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_TEXT_LENGTH } from './types';

// NOTE: The API key is injected at build time and visible in the client bundle.
// For production, consider using a server-side proxy to protect the key.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'reconstructed' | 'raw'>('reconstructed');
  const [selectedRedaction, setSelectedRedaction] = useState<{
    type: string;
    content: string;
    score: number;
    explanation?: string;
    alternatives?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<boolean>(false);

  // Load history from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('pdf-unredactor-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old history items that don't have redactions
        const migrated = parsed.map((item: any) => ({
          ...item,
          redactions: item.redactions ?? [],
        }));
        setHistory(migrated);
      }
    } catch {
      // Corrupted localStorage — ignore
    }
  }, []);

  const saveToHistory = useCallback(
    (fileName: string, resultText: string, resultRedactions: Redaction[]) => {
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        fileName,
        result: resultText,
        redactions: resultRedactions,
        timestamp: Date.now(),
      };
      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      try {
        localStorage.setItem('pdf-unredactor-history', JSON.stringify(newHistory));
      } catch {
        // localStorage full — silently fail
      }
    },
    [history]
  );

  const downloadResult = useCallback((resultText: string, fileName: string) => {
    const blob = new Blob([resultText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace('.pdf', '')}_recovered.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setRawText('');
    setResult('');
    setRedactions([]);
    setError('');
    setStatus('idle');
    setProgress(0);
    setSelectedRedaction(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const stopProcessing = useCallback(() => {
    cancelRef.current = true;
    reset();
  }, [reset]);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        setStatus('error');
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please try a smaller PDF.`);
        setStatus('error');
        return;
      }

      cancelRef.current = false;
      setFile(selectedFile);
      setError('');
      setProgress(0);
      setRedactions([]);
      setSelectedRedaction(null);
      setStatus('extracting');

      try {
        // Step 1: Extract raw text layer
        const arrayBuffer = await selectedFile.arrayBuffer();
        const extractedText = await extractTextFromPDF(
          arrayBuffer,
          (p) => setProgress(p),
          () => cancelRef.current
        );

        if (cancelRef.current) return;

        setRawText(extractedText);

        // Truncate extracted text if too long to prevent payload issues
        const truncatedText =
          extractedText.length > MAX_TEXT_LENGTH
            ? extractedText.substring(0, MAX_TEXT_LENGTH) + '\n... [Text truncated for processing] ...'
            : extractedText;

        // Step 2: Analyze with Gemini
        setStatus('analyzing');
        const base64 = await fileToBase64(selectedFile);

        if (cancelRef.current) return;

        const prompt = `You are an expert forensic document analyst. The user has provided a PDF that contains redactions (black boxes over text).
Often, these redactions are improperly applied, and the original text remains in the document's text layer.

I have extracted the raw text layer from the PDF and provided it below.
I have also provided the PDF file itself so you can see where the visual redactions are located.

Raw Text Layer:
<raw_text>
${truncatedText}
</raw_text>`;

        // Helper for retries with exponential backoff
        const callWithRetry = async (fn: () => Promise<any>, retries = 2) => {
          for (let i = 0; i <= retries; i++) {
            try {
              return await Promise.race([
                fn(),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 90_000)),
              ]);
            } catch (err: any) {
              const isNetworkError =
                err.message?.toLowerCase().includes('xhr error') ||
                err.message?.toLowerCase().includes('rpc failed') ||
                err.message?.toLowerCase().includes('fetch');
              if (i === retries || !isNetworkError) throw err;
              console.warn(`Retry ${i + 1} after network error...`);
              await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
            }
          }
        };

        const response = await callWithRetry(() =>
          ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-05-20',
            contents: [
              {
                inlineData: {
                  data: base64,
                  mimeType: 'application/pdf',
                },
              },
              {
                text:
                  prompt +
                  `
Your task:
1. Reconstruct the original document as accurately as possible.
2. Compare the visual PDF (which has black boxes) with the Raw Text Layer (which might have the hidden text).
3. Whenever you restore a word or phrase that is visually redacted in the PDF but present in the raw text, wrap it in [RECOVERED:score]text[/RECOVERED] where score is your confidence (0-100) that this text was indeed the redacted part.
4. If there is a visual redaction but the text is TRULY missing from the raw text layer, use the surrounding context to make your best educated guess. Wrap your guesses in [GUESSED:score]text[/GUESSED] where score is your confidence (0-100).
5. Output the clean, reconstructed text. Maintain the original document's structure as much as possible.
6. Also, return a JSON object with the structure:
{
  "redactions": [
    {
      "type": "RECOVERED" | "GUESSED",
      "text": "...",
      "score": 0-100,
      "alternatives": ["...", "..."],
      "explanation": "..."
    }
  ]
}`,
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  reconstructedText: { type: Type.STRING },
                  redactions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        text: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
                        explanation: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
            },
          })
        );

        if (cancelRef.current) return;

        const resultData = JSON.parse(response.text || '{}');
        const resultText = resultData.reconstructedText || 'No text could be generated.';
        const resultRedactions: Redaction[] = resultData.redactions || [];

        setResult(resultText);
        setRedactions(resultRedactions);
        saveToHistory(selectedFile.name, resultText, resultRedactions);
        setStatus('done');
      } catch (err: any) {
        if (err.message === 'Cancelled') return;
        console.error('Processing error:', err);

        let errorMessage = 'An unexpected error occurred during processing.';
        if (err.message) {
          errorMessage = err.message;
          try {
            const parsed = JSON.parse(err.message);
            if (parsed.error?.message) {
              errorMessage = parsed.error.message;
            }
          } catch {
            // Not JSON, keep original
          }
        }

        // Categorize known error types
        if (err.status === 429 || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('429')) {
          errorMessage = 'AI API quota exceeded. Please try again later or use a smaller document.';
        } else if (errorMessage.toLowerCase().includes('safety')) {
          errorMessage = 'The document was flagged by AI safety filters and could not be processed.';
        } else if (
          errorMessage.toLowerCase().includes('xhr error') ||
          errorMessage.toLowerCase().includes('rpc failed') ||
          errorMessage.toLowerCase().includes('status code: 6')
        ) {
          errorMessage =
            'Network error. The connection to the AI service failed. Please try a smaller PDF or check your network.';
        } else if (
          errorMessage.toLowerCase().includes('fetch') ||
          errorMessage.toLowerCase().includes('status code: 0') ||
          errorMessage.includes('500 level')
        ) {
          errorMessage =
            'Network error. The connection to the AI service failed. Please check your internet connection and try again.';
        }

        setError(errorMessage);
        setStatus('error');
      }
    },
    [saveToHistory]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setResult(item.result);
    setRedactions(item.redactions);
    setFile({ name: item.fileName } as File);
    setSelectedRedaction(null);
    setActiveTab('reconstructed');
    setStatus('done');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight">PDF Unredactor</h1>
              <p className="text-xs text-zinc-400 font-medium">Forensic Document Analysis</p>
            </div>
          </div>
          {status === 'done' && (
            <button onClick={reset} className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {status === 'idle' || status === 'error' ? (
          <UploadZone fileInputRef={fileInputRef} error={error} hasError={status === 'error'} onFileSelect={handleFileSelect} />
        ) : status === 'extracting' || status === 'analyzing' ? (
          <ProcessingView status={status} progress={progress} onStop={stopProcessing} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="lg:col-span-4"
            >
              <Sidebar
                fileName={file?.name}
                history={history}
                onDownload={() => downloadResult(result, file?.name || 'document.pdf')}
                onHistorySelect={handleHistorySelect}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
              className="lg:col-span-8"
            >
              <ResultsView
                result={result}
                rawText={rawText}
                redactions={redactions}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedRedaction={selectedRedaction}
                setSelectedRedaction={setSelectedRedaction}
              />
            </motion.div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
      </main>
    </div>
  );
}

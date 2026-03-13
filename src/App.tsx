import { GoogleGenAI, Type } from '@google/genai';
import { FileText, UploadCloud, AlertCircle, Loader2, CheckCircle2, FileSearch, ShieldAlert, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import { extractTextFromPDF, fileToBase64 } from './lib/pdf';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Status = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error';

interface RedactionSegment {
  type: 'text' | 'recovered' | 'guessed';
  content: string;
  score?: number;
}

interface HistoryItem {
  id: string;
  fileName: string;
  result: string;
  timestamp: number;
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [redactions, setRedactions] = useState<any[]>([]);
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

  React.useEffect(() => {
    const saved = localStorage.getItem('pdf-unredactor-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (fileName: string, result: string) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      fileName,
      result,
      timestamp: Date.now(),
    };
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('pdf-unredactor-history', JSON.stringify(newHistory));
  };

  const downloadResult = (result: string, fileName: string) => {
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace('.pdf', '')}_recovered.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stopProcessing = () => {
    cancelRef.current = true;
    setStatus('idle');
    setFile(null);
    setRawText('');
    setResult('');
    setProgress(0);
    setSelectedRedaction(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      setStatus('error');
      return;
    }

    if (selectedFile.size > 3 * 1024 * 1024) {
      setError('File size exceeds 3MB limit. Please try a smaller PDF to avoid network timeouts.');
      setStatus('error');
      return;
    }

    cancelRef.current = false;
    setFile(selectedFile);
    setError('');
    setProgress(0);
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

      // Truncate extracted text if it's too long to prevent payload issues
      const maxTextLength = 50000; // ~50k characters
      const truncatedText = extractedText.length > maxTextLength 
        ? extractedText.substring(0, maxTextLength) + "\n... [Text truncated for processing] ..."
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
</raw_text>
`;

      // Helper for retries
      const callWithRetry = async (fn: () => Promise<any>, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await Promise.race([
              fn(),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 90000))
            ]);
          } catch (err: any) {
            const isNetworkError = err.message?.toLowerCase().includes('xhr error') || 
                                 err.message?.toLowerCase().includes('rpc failed') ||
                                 err.message?.toLowerCase().includes('fetch');
            if (i === retries || !isNetworkError) throw err;
            console.warn(`Retry ${i + 1} after network error...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
          }
        }
      };

      const response = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: base64,
              mimeType: 'application/pdf',
            },
          },
          {
            text: prompt + `
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
          responseMimeType: "application/json",
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
      }));

      if (cancelRef.current) return;

      const resultData = JSON.parse(response.text || '{}');
      setResult(resultData.reconstructedText || 'No text could be generated.');
      setRedactions(resultData.redactions || []);
      saveToHistory(selectedFile.name, resultData.reconstructedText || 'No text could be generated.');
      setStatus('done');
    } catch (err: any) {
      if (err.message === 'Cancelled') return;
      console.error("Processing error:", err);
      
      let errorMessage = 'An unexpected error occurred during processing.';
      if (err.message) {
        errorMessage = err.message;
        // Attempt to parse JSON error messages from the API
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Not JSON, keep original message
        }
      }
      
      // Handle Gemini specific errors
      if (err.status === 429 || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('429')) {
        errorMessage = 'AI API quota exceeded. Please try again later or use a smaller document.';
      } else if (errorMessage.toLowerCase().includes('safety')) {
        errorMessage = 'The document was flagged by AI safety filters and could not be processed.';
      } else if (errorMessage.toLowerCase().includes('xhr error') || errorMessage.toLowerCase().includes('rpc failed') || errorMessage.toLowerCase().includes('status code: 6')) {
        errorMessage = 'Network error. The connection to the AI service failed. This is often caused by large files or unstable connections. Please try a smaller PDF file (under 5MB) or check your network.';
      } else if (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('status code: 0') || errorMessage.includes('500 level')) {
        errorMessage = 'Network error. The connection to the AI service failed. Please check your internet connection, disable ad blockers, and try again.';
      }

      setError(errorMessage);
      setStatus('error');
    }
  };

  const parseResult = (text: string) => {
    const regex = /\[(RECOVERED|GUESSED):(\d+)\](.*?)\[\/\1\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      
      // Find metadata
      const content = match[3];
      const metadata = redactions.find(r => r.text === content);
      
      parts.push({
        type: match[1].toLowerCase(),
        score: parseInt(match[2]),
        content: content,
        alternatives: metadata?.alternatives || [],
        explanation: metadata?.explanation || ''
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts;
  };

  const reset = () => {
    setFile(null);
    setRawText('');
    setResult('');
    setError('');
    setStatus('idle');
    setSelectedRedaction(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
            <button
              onClick={reset}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {status === 'idle' || status === 'error' ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight mb-3">Reveal Hidden Text</h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
                Upload a redacted PDF. We'll extract the raw text layer to uncover improperly applied redactions, and use AI to infer missing context.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-emerald-500/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center hover:border-emerald-500/50 transition-colors duration-300 bg-zinc-900/20">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-800 group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <h3 className="text-lg font-medium mb-2">Click to upload PDF</h3>
                <p className="text-sm text-zinc-500">Maximum file size: 20MB</p>
              </div>
            </div>

            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Processing Failed</h3>
                  <p className="text-sm text-red-200/80 max-w-md mx-auto leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Try Another File
                </button>
              </motion.div>
            )}
          </div>
        ) : status === 'extracting' || status === 'analyzing' ? (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-r-2 border-zinc-500 animate-spin animation-delay-150" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                {status === 'extracting' ? (
                  <FileSearch className="w-8 h-8 text-zinc-400" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-emerald-400" />
                )}
              </div>
            </div>
            <h3 className="text-xl font-medium mb-2">
              {status === 'extracting' ? 'Extracting Text Layer...' : 'Analyzing Redactions...'}
            </h3>
            <p className="text-sm text-zinc-500 mb-8">
              {status === 'extracting'
                ? 'Scanning document for improperly hidden text.'
                : 'Using AI to reconstruct document and infer missing context.'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-800/50 rounded-full h-2 mb-3 overflow-hidden border border-zinc-700/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${status === 'analyzing' ? 'bg-emerald-500 w-full animate-pulse' : 'bg-emerald-500'}`}
                style={{ width: status === 'extracting' ? `${progress}%` : '100%' }}
              />
            </div>
            <div className="text-xs text-zinc-400 font-medium mb-8 h-4">
              {status === 'extracting' ? `${progress}% Complete` : 'Processing with Gemini...'}
            </div>

            {/* Stop Button */}
            <button
              onClick={stopProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-medium"
            >
              <XCircle className="w-4 h-4" />
              Stop Processing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="lg:col-span-4 space-y-6"
            >
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Analysis Complete</h3>
                    <p className="text-xs text-zinc-400 truncate max-w-[200px]">{file?.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadResult(result, file?.name || 'document.pdf')}
                    className="flex-1 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium transition-colors border border-emerald-500/20"
                  >
                    Download
                  </button>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-300 mb-4">History</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setResult(item.result);
                        setFile({ name: item.fileName } as File);
                        setStatus('done');
                      }}
                      className="w-full text-left p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-sm"
                    >
                      <div className="font-medium truncate">{item.fileName}</div>
                      <div className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleDateString()}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Legend</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-emerald-400 shrink-0">**bold**</span>
                    <span className="text-zinc-400">Text recovered from the raw text layer (improper redaction).</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="italic text-amber-400 shrink-0">*italic*</span>
                    <span className="text-zinc-400">Text guessed by AI based on surrounding context.</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
              className="lg:col-span-8"
            >
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col h-[600px] lg:h-[800px]">
                <div className="flex border-b border-zinc-800 bg-zinc-900/50">
                  <button
                    onClick={() => setActiveTab('reconstructed')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'reconstructed'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    Reconstructed Document
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'raw'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    Raw Text Layer
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                  {activeTab === 'reconstructed' ? (
                    <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed">
                      {parseResult(result).map((part, i) => {
                        if (part.type === 'text') {
                          return <Markdown key={i}>{part.content}</Markdown>;
                        }
                        const isRecovered = part.type === 'recovered';
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedRedaction({ 
                              type: part.type, 
                              content: part.content, 
                              score: part.score!,
                              explanation: part.explanation,
                              alternatives: part.alternatives
                            })}
                            className={`inline-block px-1 rounded cursor-pointer transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-zinc-900 ${
                              isRecovered 
                                ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500/50 hover:bg-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500/50 hover:bg-amber-500/30 italic'
                            }`}
                          >
                            {part.content}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-words">
                      {rawText || 'No raw text found in the document layer.'}
                    </pre>
                  )}

                  {/* Redaction Info Overlay */}
                  <AnimatePresence>
                    {selectedRedaction && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-8 right-8 w-72 p-5 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-2xl z-20"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Info className={`w-4 h-4 ${selectedRedaction.type === 'recovered' ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <h4 className="text-sm font-semibold uppercase tracking-wider">
                              {selectedRedaction.type === 'recovered' ? 'Recovered' : 'AI Inference'}
                            </h4>
                          </div>
                          <button 
                            onClick={() => setSelectedRedaction(null)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-xs text-zinc-500 mb-1 uppercase font-bold">Content</p>
                          <p className="text-sm text-zinc-200 font-medium leading-relaxed">"{selectedRedaction.content}"</p>
                        </div>

                        {selectedRedaction.explanation && (
                          <div className="mb-4">
                            <p className="text-xs text-zinc-500 mb-1 uppercase font-bold">AI Explanation</p>
                            <p className="text-sm text-zinc-300 leading-relaxed">{selectedRedaction.explanation}</p>
                          </div>
                        )}

                        {selectedRedaction.alternatives && selectedRedaction.alternatives.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-zinc-500 mb-1 uppercase font-bold">Alternatives</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedRedaction.alternatives.map((alt: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-300 border border-zinc-700">
                                  {alt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-end mb-1">
                            <p className="text-xs text-zinc-500 uppercase font-bold">Confidence Score</p>
                            <p className={`text-sm font-bold ${selectedRedaction.score > 80 ? 'text-emerald-400' : selectedRedaction.score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                              {selectedRedaction.score}%
                            </p>
                          </div>
                          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedRedaction.score}%` }}
                              className={`h-full rounded-full ${selectedRedaction.score > 80 ? 'bg-emerald-500' : selectedRedaction.score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />
      </main>
    </div>
  );
}

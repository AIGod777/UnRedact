import { Info, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import Markdown from 'react-markdown';
import { parseResult } from '../lib/parseResult';
import type { ParsedSegment, Redaction } from '../types';

interface ResultsViewProps {
  result: string;
  rawText: string;
  redactions: Redaction[];
  activeTab: 'reconstructed' | 'raw';
  setActiveTab: (tab: 'reconstructed' | 'raw') => void;
  selectedRedaction: {
    type: string;
    content: string;
    score: number;
    explanation?: string;
    alternatives?: string[];
  } | null;
  setSelectedRedaction: (r: ResultsViewProps['selectedRedaction']) => void;
}

export default function ResultsView({
  result,
  rawText,
  redactions,
  activeTab,
  setActiveTab,
  selectedRedaction,
  setSelectedRedaction,
}: ResultsViewProps) {
  const parsedSegments: ParsedSegment[] = useMemo(
    () => parseResult(result, redactions),
    [result, redactions]
  );

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col h-[600px] lg:h-[800px]">
      {/* Tab Bar */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {activeTab === 'reconstructed' ? (
          <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed">
            {parsedSegments.map((part, i) => {
              if (part.type === 'text') {
                return <Markdown key={i}>{part.content}</Markdown>;
              }
              const isRecovered = part.type === 'recovered';
              return (
                <button
                  key={i}
                  onClick={() =>
                    setSelectedRedaction({
                      type: part.type,
                      content: part.content,
                      score: part.score!,
                      explanation: part.explanation,
                      alternatives: part.alternatives,
                    })
                  }
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
                  <Info
                    className={`w-4 h-4 ${
                      selectedRedaction.type === 'recovered' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  />
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
                <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                  &ldquo;{selectedRedaction.content}&rdquo;
                </p>
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
                  <p
                    className={`text-sm font-bold ${
                      selectedRedaction.score > 80
                        ? 'text-emerald-400'
                        : selectedRedaction.score > 50
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {selectedRedaction.score}%
                  </p>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedRedaction.score}%` }}
                    className={`h-full rounded-full ${
                      selectedRedaction.score > 80
                        ? 'bg-emerald-500'
                        : selectedRedaction.score > 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

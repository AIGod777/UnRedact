import { Info, XCircle, Search, Layers, Database, History, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import Markdown from 'react-markdown';
import { parseResult } from '../lib/parseResult';
import type { ForensicReport, ParsedSegment, Redaction } from '../types';

interface ResultsViewProps {
  result: string;
  rawText: string;
  redactions: Redaction[];
  forensicReport: ForensicReport | null;
  activeTab: 'reconstructed' | 'raw' | 'forensics';
  setActiveTab: (tab: 'reconstructed' | 'raw' | 'forensics') => void;
  selectedRedaction: {
    type: string;
    content: string;
    score: number;
    method?: string;
    explanation?: string;
    alternatives?: string[];
  } | null;
  setSelectedRedaction: (r: ResultsViewProps['selectedRedaction']) => void;
}

export default function ResultsView({
  result,
  rawText,
  redactions,
  forensicReport,
  activeTab,
  setActiveTab,
  selectedRedaction,
  setSelectedRedaction,
}: ResultsViewProps) {
  const parsedSegments: ParsedSegment[] = useMemo(
    () => parseResult(result, redactions),
    [result, redactions]
  );

  const getSegmentClasses = (type: string) => {
    switch (type) {
      case 'recovered':
        return 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500/50 hover:bg-emerald-500/30';
      case 'inferred':
        return 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500/50 hover:bg-blue-500/30';
      case 'guessed':
        return 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500/50 hover:bg-amber-500/30 italic';
      default:
        return '';
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col h-[600px] lg:h-[800px]">
      {/* Tab Bar */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        {(['reconstructed', 'raw', 'forensics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'reconstructed' ? 'Reconstructed' : tab === 'raw' ? 'Raw Text' : 'Forensic Signals'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {activeTab === 'reconstructed' ? (
          <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed">
            {parsedSegments.map((part, i) => {
              if (part.type === 'text') {
                return <Markdown key={i}>{part.content}</Markdown>;
              }
              return (
                <button
                  key={i}
                  onClick={() =>
                    setSelectedRedaction({
                      type: part.type,
                      content: part.content,
                      score: part.score!,
                      method: part.method,
                      explanation: part.explanation,
                      alternatives: part.alternatives,
                    })
                  }
                  className={`inline-block px-1 rounded cursor-pointer transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-zinc-900 ${getSegmentClasses(part.type)}`}
                >
                  {part.content}
                </button>
              );
            })}
          </div>
        ) : activeTab === 'raw' ? (
          <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-words">
            {rawText || 'No raw text found in the document layer.'}
          </pre>
        ) : (
          <ForensicsTab report={forensicReport} />
        )}

        {/* Redaction Info Overlay */}
        <AnimatePresence>
          {selectedRedaction && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-8 right-8 w-80 p-5 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-2xl z-20"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Info
                    className={`w-4 h-4 ${
                      selectedRedaction.type === 'recovered'
                        ? 'text-emerald-400'
                        : selectedRedaction.type === 'inferred'
                          ? 'text-blue-400'
                          : 'text-amber-400'
                    }`}
                  />
                  <h4 className="text-sm font-semibold uppercase tracking-wider">
                    {selectedRedaction.type === 'recovered'
                      ? 'Recovered'
                      : selectedRedaction.type === 'inferred'
                        ? 'Inferred'
                        : 'AI Guess'}
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

              {selectedRedaction.method && (
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 mb-1 uppercase font-bold">Recovery Method</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selectedRedaction.method}</p>
                </div>
              )}

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
                  <p className="text-xs text-zinc-500 uppercase font-bold">Confidence</p>
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

/**
 * Forensic Signals tab — shows raw forensic extraction data.
 */
function ForensicsTab({ report }: { report: ForensicReport | null }) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">Forensic data not available for this item.</p>
        <p className="text-xs">Re-analyze the PDF to generate forensic signals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metadata */}
      {(report.metadata.author || report.metadata.creator || report.metadata.producer) && (
        <ForensicSection
          icon={<FileText className="w-4 h-4 text-zinc-400" />}
          title="Document Metadata"
        >
          <div className="grid grid-cols-2 gap-3">
            {report.metadata.author && <MetadataField label="Author" value={report.metadata.author} />}
            {report.metadata.creator && <MetadataField label="Creator" value={report.metadata.creator} />}
            {report.metadata.producer && <MetadataField label="Producer" value={report.metadata.producer} />}
            {report.metadata.creationDate && <MetadataField label="Created" value={formatPdfDate(report.metadata.creationDate)} />}
            {report.metadata.modificationDate && <MetadataField label="Modified" value={formatPdfDate(report.metadata.modificationDate)} />}
            <MetadataField label="Pages" value={String(report.metadata.pageCount)} />
          </div>
        </ForensicSection>
      )}

      {/* Redaction Boxes */}
      <ForensicSection
        icon={<Layers className="w-4 h-4 text-red-400" />}
        title={`Redaction Boxes (${report.redactionBoxes.length})`}
        badge={report.redactionBoxes.length > 0 ? 'DETECTED' : undefined}
        badgeColor="bg-red-500/20 text-red-400"
      >
        {report.redactionBoxes.length === 0 ? (
          <p className="text-xs text-zinc-500">No filled black rectangles detected.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {report.redactionBoxes.map((box, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-3 py-2 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Page {box.page}</span>
                <span className="font-mono text-zinc-500">
                  ({Math.round(box.x)}, {Math.round(box.y)}) — {Math.round(box.width)}×{Math.round(box.height)}px
                </span>
              </div>
            ))}
          </div>
        )}
      </ForensicSection>

      {/* Text Under Redactions — KEY SIGNAL */}
      <ForensicSection
        icon={<Search className="w-4 h-4 text-emerald-400" />}
        title={`Text Under Redactions (${report.textUnderRedactions.length})`}
        badge={report.textUnderRedactions.length > 0 ? 'RECOVERED' : undefined}
        badgeColor="bg-emerald-500/20 text-emerald-400"
      >
        {report.textUnderRedactions.length === 0 ? (
          <p className="text-xs text-zinc-500">No text found directly under redaction boxes. The redaction may have properly removed the underlying text.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {report.textUnderRedactions.map((item, i) => (
              <div key={i} className="px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">Page {item.textItem.page}</span>
                  <span className="text-xs font-medium text-emerald-400">{item.overlapPercent}% overlap</span>
                </div>
                <p className="text-sm text-emerald-300 font-medium">&ldquo;{item.text}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </ForensicSection>

      {/* Version History */}
      <ForensicSection
        icon={<History className="w-4 h-4 text-amber-400" />}
        title="Version History"
        badge={report.versionInfo.hasMultipleVersions ? 'MULTIPLE VERSIONS' : undefined}
        badgeColor="bg-amber-500/20 text-amber-400"
      >
        <p className="text-xs text-zinc-400">
          {report.versionInfo.hasMultipleVersions
            ? `${report.versionInfo.count} incremental saves detected. This PDF contains previous versions that may include content from before redaction was applied.`
            : 'Single version — no incremental save history found.'}
        </p>
      </ForensicSection>

      {/* Orphaned Strings */}
      <ForensicSection
        icon={<Database className="w-4 h-4 text-blue-400" />}
        title={`Orphaned Strings (${report.orphanedStrings.length})`}
        badge={report.orphanedStrings.length > 0 ? 'FOUND' : undefined}
        badgeColor="bg-blue-500/20 text-blue-400"
      >
        {report.orphanedStrings.length === 0 ? (
          <p className="text-xs text-zinc-500">No orphaned text strings found in the raw PDF binary.</p>
        ) : (
          <>
            <p className="text-xs text-zinc-500 mb-3">
              These strings are embedded in the raw PDF but may not be displayed. Some could be remnants of deleted content.
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
              {report.orphanedStrings.slice(0, 30).map((str, i) => (
                <div key={i} className="px-3 py-1.5 bg-zinc-800/50 rounded text-xs font-mono text-zinc-400 truncate">
                  {str}
                </div>
              ))}
              {report.orphanedStrings.length > 30 && (
                <p className="text-xs text-zinc-500 mt-2">+{report.orphanedStrings.length - 30} more...</p>
              )}
            </div>
          </>
        )}
      </ForensicSection>

      {/* Annotations */}
      {report.annotations.length > 0 && (
        <ForensicSection
          icon={<Layers className="w-4 h-4 text-purple-400" />}
          title={`Annotations (${report.annotations.length})`}
        >
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {report.annotations.map((ann, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-3 py-2 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Page {ann.page} — {ann.subtype}</span>
                {ann.contents && <span className="text-zinc-300 truncate ml-2 max-w-[200px]">{ann.contents}</span>}
              </div>
            ))}
          </div>
        </ForensicSection>
      )}
    </div>
  );
}

function ForensicSection({
  icon,
  title,
  badge,
  badgeColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">{label}</p>
      <p className="text-xs text-zinc-300 truncate">{value}</p>
    </div>
  );
}

function formatPdfDate(dateStr: string): string {
  // PDF dates: D:YYYYMMDDHHmmSS+HH'mm'
  const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (match) {
    const [, y, m, d, h, min] = match;
    return `${y}-${m}-${d}${h ? ` ${h}:${min || '00'}` : ''}`;
  }
  return dateStr;
}

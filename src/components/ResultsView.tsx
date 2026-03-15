import { Info, XCircle, Search, Layers, Database, History, FileText, AlertTriangle, Users } from 'lucide-react';
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
        return 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500/50 hover:bg-emerald-500/30 active:bg-emerald-500/35';
      case 'inferred':
        return 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500/50 hover:bg-blue-500/30 active:bg-blue-500/35';
      case 'guessed':
        return 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500/50 hover:bg-amber-500/30 active:bg-amber-500/35 italic';
      default:
        return '';
    }
  };

  return (
    <div className="rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col h-[450px] sm:h-[600px] lg:h-[800px]">
      {/* Tab Bar */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        {(['reconstructed', 'raw', 'forensics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 sm:py-4 text-[11px] sm:text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-zinc-400 hover:text-zinc-200 active:text-zinc-200'
            }`}
          >
            {tab === 'reconstructed' ? 'Result' : tab === 'raw' ? 'Raw' : 'Forensics'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
        {activeTab === 'reconstructed' ? (
          <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base">
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
                  className={`inline-block px-1 rounded cursor-pointer transition-all ${getSegmentClasses(part.type)}`}
                >
                  {part.content}
                </button>
              );
            })}
          </div>
        ) : activeTab === 'raw' ? (
          <pre className="text-[10px] sm:text-xs font-mono text-zinc-400 whitespace-pre-wrap break-words">
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
              className="fixed sm:absolute bottom-2 left-2 right-2 sm:bottom-6 sm:right-6 sm:left-auto sm:w-72 lg:w-80 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-800 border border-zinc-700 shadow-2xl z-30"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info
                    className={`w-3.5 h-3.5 ${
                      selectedRedaction.type === 'recovered' ? 'text-emerald-400'
                        : selectedRedaction.type === 'inferred' ? 'text-blue-400'
                        : 'text-amber-400'
                    }`}
                  />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    {selectedRedaction.type === 'recovered' ? 'Recovered'
                      : selectedRedaction.type === 'inferred' ? 'Inferred'
                      : 'AI Guess'}
                  </h4>
                </div>
                <button onClick={() => setSelectedRedaction(null)} className="text-zinc-500 hover:text-zinc-300 active:text-zinc-200 p-1 -mr-1">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Content</p>
                <p className="text-xs sm:text-sm text-zinc-200 font-medium">&ldquo;{selectedRedaction.content}&rdquo;</p>
              </div>

              {selectedRedaction.method && (
                <div className="mb-3">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Method</p>
                  <p className="text-xs text-zinc-300">{selectedRedaction.method}</p>
                </div>
              )}

              {selectedRedaction.explanation && (
                <div className="mb-3">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Explanation</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedRedaction.explanation}</p>
                </div>
              )}

              {selectedRedaction.alternatives && selectedRedaction.alternatives.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Alternatives</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRedaction.alternatives.map((alt: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-900 rounded text-[10px] text-zinc-300 border border-zinc-700">{alt}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Confidence</p>
                  <p className={`text-xs font-bold ${
                    selectedRedaction.score > 80 ? 'text-emerald-400'
                      : selectedRedaction.score > 50 ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>{selectedRedaction.score}%</p>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedRedaction.score}%` }}
                    className={`h-full rounded-full ${
                      selectedRedaction.score > 80 ? 'bg-emerald-500'
                        : selectedRedaction.score > 50 ? 'bg-amber-500'
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
 * Forensic Signals tab
 */
function ForensicsTab({ report }: { report: ForensicReport | null }) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-12">
        <AlertTriangle className="w-6 h-6" />
        <p className="text-xs">Forensic data not available.</p>
        <p className="text-[10px]">Re-analyze the PDF to generate signals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Metadata */}
      {(report.metadata.author || report.metadata.creator || report.metadata.producer) && (
        <Section icon={<FileText className="w-3.5 h-3.5 text-zinc-400" />} title="Metadata">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {report.metadata.author && <Field label="Author" value={report.metadata.author} />}
            {report.metadata.creator && <Field label="Creator" value={report.metadata.creator} />}
            {report.metadata.producer && <Field label="Producer" value={report.metadata.producer} />}
            {report.metadata.creationDate && <Field label="Created" value={fmtDate(report.metadata.creationDate)} />}
            {report.metadata.modificationDate && <Field label="Modified" value={fmtDate(report.metadata.modificationDate)} />}
            <Field label="Pages" value={String(report.metadata.pageCount)} />
          </div>
        </Section>
      )}

      {/* Redaction Boxes */}
      <Section
        icon={<Layers className="w-3.5 h-3.5 text-red-400" />}
        title={`Redaction Boxes (${report.redactionBoxes.length})`}
        badge={report.redactionBoxes.length > 0 ? 'DETECTED' : undefined}
        badgeColor="bg-red-500/20 text-red-400"
      >
        {report.redactionBoxes.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No black rectangles detected.</p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {report.redactionBoxes.map((box, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] sm:text-xs px-2.5 py-1.5 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Page {box.page}</span>
                <span className="font-mono text-zinc-500">{Math.round(box.width)}×{Math.round(box.height)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Text Under Redactions */}
      <Section
        icon={<Search className="w-3.5 h-3.5 text-emerald-400" />}
        title={`Hidden Text (${report.textUnderRedactions.length})`}
        badge={report.textUnderRedactions.length > 0 ? 'RECOVERED' : undefined}
        badgeColor="bg-emerald-500/20 text-emerald-400"
      >
        {report.textUnderRedactions.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No text found under redaction boxes.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {report.textUnderRedactions.map((item, i) => (
              <div key={i} className="px-2.5 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-zinc-400">Pg {item.textItem.page}</span>
                  <span className="text-[10px] font-medium text-emerald-400">{item.overlapPercent}%</span>
                </div>
                <p className="text-xs text-emerald-300 font-medium">&ldquo;{item.text}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Version History */}
      <Section
        icon={<History className="w-3.5 h-3.5 text-amber-400" />}
        title="Versions"
        badge={report.versionInfo.hasMultipleVersions ? 'MULTIPLE' : undefined}
        badgeColor="bg-amber-500/20 text-amber-400"
      >
        <p className="text-[11px] text-zinc-400">
          {report.versionInfo.hasMultipleVersions
            ? `${report.versionInfo.count} versions found — may contain pre-redaction content.`
            : 'Single version — no history.'}
        </p>
      </Section>

      {/* Orphaned Strings */}
      {report.orphanedStrings.length > 0 && (
        <Section
          icon={<Database className="w-3.5 h-3.5 text-blue-400" />}
          title={`Orphaned (${report.orphanedStrings.length})`}
          badge="FOUND"
          badgeColor="bg-blue-500/20 text-blue-400"
        >
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {report.orphanedStrings.slice(0, 20).map((str, i) => (
              <div key={i} className="px-2.5 py-1 bg-zinc-800/50 rounded text-[10px] font-mono text-zinc-400 truncate">{str}</div>
            ))}
            {report.orphanedStrings.length > 20 && (
              <p className="text-[10px] text-zinc-500">+{report.orphanedStrings.length - 20} more</p>
            )}
          </div>
        </Section>
      )}

      {/* Cross-Referenced Persons */}
      {report.crossReferences && report.crossReferences.totalMatches > 0 && (
        <Section
          icon={<Users className="w-3.5 h-3.5 text-orange-400" />}
          title={`Persons Database (${report.crossReferences.totalMatches})`}
          badge="CROSS-REF"
          badgeColor="bg-orange-500/20 text-orange-400"
        >
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {report.crossReferences.crossReferences.map((ref, i) => (
              <div key={i} className="px-2.5 py-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                <div className="text-[10px] text-zinc-400 mb-0.5">
                  Query: &ldquo;{ref.queryName}&rdquo;
                </div>
                {ref.matches.map((person, j) => (
                  <div key={j} className="text-xs text-orange-300 font-medium">
                    {person.name}
                    {person.aliases && person.aliases.length > 0 ? ` (aka ${person.aliases.join(', ')})` : ''}
                    {person.documents_count ? ` — ${person.documents_count} docs` : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Annotations */}
      {report.annotations.length > 0 && (
        <Section icon={<Layers className="w-3.5 h-3.5 text-purple-400" />} title={`Annotations (${report.annotations.length})`}>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {report.annotations.map((ann, i) => (
              <div key={i} className="text-[10px] sm:text-xs px-2.5 py-1.5 bg-zinc-800/50 rounded-lg text-zinc-400">
                Pg {ann.page} — {ann.subtype}{ann.contents ? `: ${ann.contents}` : ''}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, badge, badgeColor, children }: {
  icon: React.ReactNode; title: string; badge?: string; badgeColor?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <h4 className="text-xs font-semibold text-zinc-200">{title}</h4>
        {badge && <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">{label}</p>
      <p className="text-[11px] text-zinc-300 truncate">{value}</p>
    </div>
  );
}

function fmtDate(d: string): string {
  const m = d.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}${m[4] ? ` ${m[4]}:${m[5] || '00'}` : ''}`;
  return d;
}

import { CheckCircle2, Search, Database, Layers, History, FileText } from 'lucide-react';
import type { ForensicSummary, HistoryItem } from '../types';

interface SidebarProps {
  fileName: string | undefined;
  history: HistoryItem[];
  forensicSummary: ForensicSummary | null;
  onDownload: () => void;
  onHistorySelect: (item: HistoryItem) => void;
}

export default function Sidebar({ fileName, history, forensicSummary, onDownload, onHistorySelect }: SidebarProps) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-medium">Analysis Complete</h3>
            <p className="text-xs text-zinc-400 truncate max-w-[200px]">{fileName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium transition-colors border border-emerald-500/20"
          >
            Download
          </button>
        </div>
      </div>

      {/* Forensic Summary */}
      {forensicSummary && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Forensic Extraction
          </h4>
          <div className="space-y-3">
            <ForensicStat
              icon={<Layers className="w-3.5 h-3.5" />}
              label="Redaction boxes detected"
              value={forensicSummary.totalRedactionBoxes}
              color="text-red-400"
            />
            <ForensicStat
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Text items under boxes"
              value={forensicSummary.textRecoveredFromBoxes}
              color="text-emerald-400"
            />
            <ForensicStat
              icon={<Database className="w-3.5 h-3.5" />}
              label="Orphaned strings found"
              value={forensicSummary.orphanedStringsFound}
              color="text-blue-400"
            />
            <ForensicStat
              icon={<History className="w-3.5 h-3.5" />}
              label="Document versions"
              value={forensicSummary.versionsDetected}
              color={forensicSummary.versionsDetected > 1 ? 'text-amber-400' : 'text-zinc-500'}
            />
            {forensicSummary.annotationsFound > 0 && (
              <ForensicStat
                icon={<Layers className="w-3.5 h-3.5" />}
                label="Annotations found"
                value={forensicSummary.annotationsFound}
                color="text-purple-400"
              />
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-300 mb-4">History</h4>
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {history.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-4">No previous analyses</p>
          )}
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onHistorySelect(item)}
              className="w-full text-left p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-sm"
            >
              <div className="font-medium truncate">{item.fileName}</div>
              <div className="text-xs text-zinc-500">{new Date(item.timestamp).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Legend</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="w-3 h-3 mt-0.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50 shrink-0" />
            <span className="text-zinc-400">Recovered — text found under redaction box</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-3 h-3 mt-0.5 rounded-sm bg-blue-500/30 border border-blue-500/50 shrink-0" />
            <span className="text-zinc-400">Inferred — from version history or orphaned data</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-3 h-3 mt-0.5 rounded-sm bg-amber-500/30 border border-amber-500/50 shrink-0" />
            <span className="text-zinc-400">Guessed — AI inference from context</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForensicStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

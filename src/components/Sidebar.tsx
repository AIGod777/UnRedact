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
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Card */}
      <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm sm:text-base">Analysis Complete</h3>
            <p className="text-[10px] sm:text-xs text-zinc-400 truncate">{fileName}</p>
          </div>
        </div>
        <button
          onClick={onDownload}
          className="w-full px-4 py-2 sm:py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/25 text-emerald-400 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors border border-emerald-500/20"
        >
          Download Results
        </button>
      </div>

      {/* Forensic Summary */}
      {forensicSummary && (
        <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800">
          <h4 className="text-xs font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            Forensic Results
          </h4>
          <div className="space-y-2.5 sm:space-y-3">
            <ForensicStat icon={<Layers className="w-3 h-3" />} label="Redaction boxes" value={forensicSummary.totalRedactionBoxes} color="text-red-400" />
            <ForensicStat icon={<FileText className="w-3 h-3" />} label="Text under boxes" value={forensicSummary.textRecoveredFromBoxes} color="text-emerald-400" />
            <ForensicStat icon={<Database className="w-3 h-3" />} label="Orphaned strings" value={forensicSummary.orphanedStringsFound} color="text-blue-400" />
            <ForensicStat icon={<History className="w-3 h-3" />} label="Versions" value={forensicSummary.versionsDetected} color={forensicSummary.versionsDetected > 1 ? 'text-amber-400' : 'text-zinc-500'} />
            {forensicSummary.annotationsFound > 0 && (
              <ForensicStat icon={<Layers className="w-3 h-3" />} label="Annotations" value={forensicSummary.annotationsFound} color="text-purple-400" />
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800">
        <h4 className="text-xs font-medium text-zinc-300 mb-3">History</h4>
        <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto custom-scrollbar">
          {history.length === 0 && (
            <p className="text-[11px] text-zinc-500 text-center py-3">No previous analyses</p>
          )}
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onHistorySelect(item)}
              className="w-full text-left p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700/50 transition-colors text-xs sm:text-sm"
            >
              <div className="font-medium truncate text-xs">{item.fileName}</div>
              <div className="text-[10px] text-zinc-500">{new Date(item.timestamp).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Legend</h4>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50 shrink-0" />
            <span className="text-zinc-400">Recovered from text layer</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-500/50 shrink-0" />
            <span className="text-zinc-400">Inferred from versions/data</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50 shrink-0" />
            <span className="text-zinc-400">AI guess from context</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForensicStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <span className={`text-xs sm:text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

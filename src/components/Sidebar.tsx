import { CheckCircle2 } from 'lucide-react';
import type { HistoryItem } from '../types';

interface SidebarProps {
  fileName: string | undefined;
  history: HistoryItem[];
  onDownload: () => void;
  onHistorySelect: (item: HistoryItem) => void;
}

export default function Sidebar({ fileName, history, onDownload, onHistorySelect }: SidebarProps) {
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
            <span className="font-bold text-emerald-400 shrink-0">**bold**</span>
            <span className="text-zinc-400">Text recovered from the raw text layer (improper redaction).</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="italic text-amber-400 shrink-0">*italic*</span>
            <span className="text-zinc-400">Text guessed by AI based on surrounding context.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

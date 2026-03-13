import { FileSearch, ShieldAlert, XCircle } from 'lucide-react';

interface ProcessingViewProps {
  status: 'extracting' | 'analyzing';
  progress: number;
  onStop: () => void;
}

export default function ProcessingView({ status, progress, onStop }: ProcessingViewProps) {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
        <div
          className="absolute inset-2 rounded-full border-r-2 border-zinc-500 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
        />
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
          className={`h-full rounded-full transition-all duration-300 ${
            status === 'analyzing' ? 'bg-emerald-500 w-full animate-pulse' : 'bg-emerald-500'
          }`}
          style={{ width: status === 'extracting' ? `${progress}%` : '100%' }}
        />
      </div>
      <div className="text-xs text-zinc-400 font-medium mb-8 h-4">
        {status === 'extracting' ? `${progress}% Complete` : 'Processing with Gemini...'}
      </div>

      {/* Stop Button */}
      <button
        onClick={onStop}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-medium"
      >
        <XCircle className="w-4 h-4" />
        Stop Processing
      </button>
    </div>
  );
}

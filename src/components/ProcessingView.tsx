import { FileSearch, ShieldAlert, XCircle, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProcessingViewProps {
  status: 'extracting' | 'analyzing';
  progress: number;
  progressStage?: string;
  onStop: () => void;
}

const PIPELINE_STEPS = [
  { label: 'Extracting text with positions', threshold: 15 },
  { label: 'Scanning for annotations', threshold: 35 },
  { label: 'Detecting redaction boxes', threshold: 55 },
  { label: 'Mapping text under boxes', threshold: 70 },
  { label: 'Extracting metadata', threshold: 80 },
  { label: 'Scanning for hidden versions', threshold: 90 },
  { label: 'Finding orphaned strings', threshold: 95 },
];

export default function ProcessingView({ status, progress, progressStage, onStop }: ProcessingViewProps) {
  return (
    <div className="max-w-lg mx-auto py-16">
      {/* Spinner */}
      <div className="flex justify-center mb-10">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-r-2 border-emerald-500/30 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2s' }}
          />
          <div
            className="absolute inset-4 rounded-full border-b-2 border-zinc-600 animate-spin"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {status === 'extracting' ? (
              <FileSearch className="w-8 h-8 text-zinc-300" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-emerald-400" />
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">
          {status === 'extracting' ? 'Forensic Extraction' : 'AI Reconstruction'}
        </h3>
        <p className="text-sm text-zinc-500">
          {status === 'extracting'
            ? 'Running 6-layer forensic analysis pipeline'
            : 'Gemini AI is reconstructing the document using forensic evidence'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-zinc-400 font-medium">
            {status === 'extracting' ? `${progress}%` : 'Analyzing...'}
          </span>
          {progressStage && (
            <span className="text-xs text-zinc-500 capitalize">{progressStage}</span>
          )}
        </div>
        <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden border border-zinc-700/50">
          <motion.div
            className={`h-full rounded-full ${
              status === 'analyzing' ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: status === 'extracting' ? `${progress}%` : '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Pipeline Steps — only during extraction */}
      {status === 'extracting' && (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-5 mb-8">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Pipeline Progress</h4>
          <div className="space-y-2.5">
            {PIPELINE_STEPS.map((step) => {
              const isDone = progress >= step.threshold;
              const isActive = !isDone && progress >= step.threshold - 20;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 text-xs transition-all duration-300 ${
                    isDone ? 'text-zinc-300' : isActive ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 border-emerald-500/30'
                      : isActive
                        ? 'border-zinc-600 pulse-glow'
                        : 'border-zinc-800'
                  }`}>
                    {isDone ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    )}
                  </div>
                  <span className={isDone ? 'font-medium' : ''}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Analysis Detail */}
      {status === 'analyzing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-5 mb-8"
        >
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">AI Processing</h4>
          <div className="space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Forensic report compiled and attached
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              PDF binary + text layer sent to Gemini
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
              Reconstructing document with all forensic signals...
            </div>
          </div>
        </motion.div>
      )}

      {/* Stop Button */}
      <div className="text-center">
        <button
          onClick={onStop}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-medium"
        >
          <XCircle className="w-4 h-4" />
          Stop Processing
        </button>
      </div>
    </div>
  );
}

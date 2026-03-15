import { FileSearch, ShieldAlert, Users, XCircle, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProcessingViewProps {
  status: 'extracting' | 'cross-referencing' | 'analyzing';
  progress: number;
  progressStage?: string;
  onStop: () => void;
}

const PIPELINE_STEPS = [
  { label: 'Extracting text', threshold: 15 },
  { label: 'Scanning annotations', threshold: 35 },
  { label: 'Detecting redaction boxes', threshold: 55 },
  { label: 'Mapping hidden text', threshold: 70 },
  { label: 'Extracting metadata', threshold: 80 },
  { label: 'Scanning versions', threshold: 90 },
  { label: 'Finding orphaned data', threshold: 95 },
];

export default function ProcessingView({ status, progress, progressStage, onStop }: ProcessingViewProps) {
  return (
    <div className="max-w-md mx-auto py-8 sm:py-16 px-1">
      {/* Spinner */}
      <div className="flex justify-center mb-6 sm:mb-10">
        <div className="relative w-20 h-20 sm:w-28 sm:h-28">
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
              <FileSearch className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />
            ) : status === 'cross-referencing' ? (
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" />
            ) : (
              <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-1">
          {status === 'extracting' ? 'Forensic Extraction' : status === 'cross-referencing' ? 'Person Lookup' : 'AI Reconstruction'}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-500 px-4">
          {status === 'extracting'
            ? 'Running forensic analysis pipeline'
            : status === 'cross-referencing'
              ? 'Cross-referencing names against persons database'
              : 'Reconstructing with forensic evidence'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs text-zinc-400 font-medium">
            {status === 'extracting' ? `${progress}%` : status === 'cross-referencing' ? 'Querying...' : 'Analyzing...'}
          </span>
          {progressStage && (
            <span className="text-[10px] sm:text-xs text-zinc-500 capitalize truncate ml-2">{progressStage}</span>
          )}
        </div>
        <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden border border-zinc-700/50">
          <motion.div
            className={`h-full rounded-full ${status === 'analyzing' ? 'bg-emerald-500 animate-pulse' : status === 'cross-referencing' ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}
            initial={{ width: 0 }}
            animate={{ width: status === 'extracting' ? `${progress}%` : '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Pipeline Steps */}
      {status === 'extracting' && (
        <div className="bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-zinc-800/50 p-4 sm:p-5 mb-6">
          <h4 className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Pipeline</h4>
          <div className="space-y-2">
            {PIPELINE_STEPS.map((step) => {
              const isDone = progress >= step.threshold;
              const isActive = !isDone && progress >= step.threshold - 20;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-2.5 text-[11px] sm:text-xs transition-all duration-300 ${
                    isDone ? 'text-zinc-300' : isActive ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 border-emerald-500/30'
                      : isActive
                        ? 'border-zinc-600 pulse-glow'
                        : 'border-zinc-800'
                  }`}>
                    {isDone ? (
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400 animate-spin" />
                    ) : (
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-700" />
                    )}
                  </div>
                  <span className={isDone ? 'font-medium' : ''}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-referencing Detail */}
      {status === 'cross-referencing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-zinc-800/50 p-4 sm:p-5 mb-6"
        >
          <h4 className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Status</h4>
          <div className="space-y-2 text-[11px] sm:text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Forensic extraction complete</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-orange-400 animate-spin shrink-0" />
              <span>Querying persons database...</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Analysis Detail */}
      {status === 'analyzing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-zinc-800/50 p-4 sm:p-5 mb-6"
        >
          <h4 className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Status</h4>
          <div className="space-y-2 text-[11px] sm:text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Forensic report compiled</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>PDF sent to Gemini</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-zinc-400 animate-spin shrink-0" />
              <span>Reconstructing document...</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stop Button */}
      <div className="text-center">
        <button
          onClick={onStop}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 active:bg-red-500/15 transition-all text-sm font-medium"
        >
          <XCircle className="w-4 h-4" />
          Stop
        </button>
      </div>
    </div>
  );
}

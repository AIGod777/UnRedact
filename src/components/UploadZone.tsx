import { UploadCloud, AlertCircle, Layers, Search, Database, History, Cpu, FileText, Users } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback, useState } from 'react';
import { MAX_FILE_SIZE_MB } from '../types';

interface UploadZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string;
  hasError: boolean;
  onFileSelect: (file: File) => void;
}

const FEATURES = [
  { icon: Search, title: 'Text Recovery', desc: 'Finds text hidden under black boxes', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Layers, title: 'Box Detection', desc: 'Scans for redaction rectangles', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { icon: History, title: 'Version Recovery', desc: 'Recovers pre-redaction versions', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Database, title: 'Orphaned Data', desc: 'Scans binary for deleted text', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: FileText, title: 'Metadata', desc: 'Extracts author & doc info', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: Users, title: 'Person Lookup', desc: 'Cross-references known persons', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { icon: Cpu, title: 'AI Analysis', desc: 'Gemini reconstructs content', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
];

export default function UploadZone({ fileInputRef, error, hasError, onFileSelect }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) onFileSelect(droppedFile);
    },
    [onFileSelect]
  );

  return (
    <div className="max-w-2xl mx-auto px-1">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6 sm:mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-semibold mb-4 sm:mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          7-Layer Forensic Analysis
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Reveal What's Hidden
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto px-2">
          Upload a redacted PDF. Our forensic pipeline finds buried text, detects redaction boxes, and uses AI to reconstruct the original.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative group cursor-pointer mb-6 sm:mb-10"
      >
        <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl transition-opacity duration-300 ${isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
        />
        <div className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-center transition-all duration-300 bg-zinc-900/30 ${
          isDragOver
            ? 'border-emerald-500/70 bg-emerald-500/5 scale-[1.01]'
            : 'border-zinc-800 hover:border-emerald-500/40'
        }`}>
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-all duration-300 ${
            isDragOver
              ? 'bg-emerald-500/20 border-emerald-500/30 scale-110'
              : 'bg-zinc-900 border-zinc-800 group-hover:scale-110 group-hover:border-emerald-500/30'
          }`}>
            <UploadCloud className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${isDragOver ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-emerald-400'}`} />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-1">
            {isDragOver ? 'Drop your PDF here' : 'Tap to upload PDF'}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500">Max {MAX_FILE_SIZE_MB}MB</p>
        </div>
      </motion.div>

      {/* Error */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center gap-2"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h3 className="text-red-400 font-semibold text-sm">Failed</h3>
          <p className="text-xs text-red-200/80 max-w-sm leading-relaxed">{error}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-medium transition-colors"
          >
            Try Another File
          </button>
        </motion.div>
      )}

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <h4 className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center mb-4">
          Analysis Pipeline
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              className={`feature-card p-3 sm:p-4 rounded-lg sm:rounded-xl border ${feat.border} ${feat.bg}`}
            >
              <feat.icon className={`w-3.5 h-3.5 ${feat.color} mb-2`} />
              <h5 className="text-[11px] sm:text-xs font-semibold text-zinc-200 mb-0.5">{feat.title}</h5>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 leading-snug">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

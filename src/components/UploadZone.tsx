import { UploadCloud, AlertCircle, Layers, Search, Database, History, Cpu, FileText } from 'lucide-react';
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
  {
    icon: Search,
    title: 'Text-Under-Box Detection',
    desc: 'Maps text hidden directly beneath redaction rectangles',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Layers,
    title: 'Redaction Box Scanning',
    desc: 'Detects filled black rectangles via PDF operator analysis',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: History,
    title: 'Version History Recovery',
    desc: 'Detects incremental saves to recover pre-redaction content',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Database,
    title: 'Orphaned String Extraction',
    desc: 'Scans raw PDF binary for deleted but lingering text',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: FileText,
    title: 'Metadata & Annotations',
    desc: 'Extracts author info, annotations, and document properties',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    icon: Cpu,
    title: 'AI-Powered Reconstruction',
    desc: 'Gemini AI fuses all signals to reconstruct the document',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
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
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          6-Layer Forensic Analysis
        </div>
        <h2 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Reveal What's Hidden
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mx-auto">
          Upload a redacted PDF and our multi-layer forensic pipeline will extract buried text,
          detect redaction boxes, recover document versions, and use AI to reconstruct the original content.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative group cursor-pointer mb-10"
      >
        <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
        />
        <div className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 bg-zinc-900/30 backdrop-blur-sm ${
          isDragOver
            ? 'border-emerald-500/70 bg-emerald-500/5 scale-[1.01]'
            : 'border-zinc-800 hover:border-emerald-500/40'
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border transition-all duration-300 ${
            isDragOver
              ? 'bg-emerald-500/20 border-emerald-500/30 scale-110'
              : 'bg-zinc-900 border-zinc-800 group-hover:scale-110 group-hover:border-emerald-500/30'
          }`}>
            <UploadCloud className={`w-7 h-7 transition-colors ${isDragOver ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-emerald-400'}`} />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {isDragOver ? 'Drop your PDF here' : 'Click or drag to upload'}
          </h3>
          <p className="text-sm text-zinc-500">PDF files up to {MAX_FILE_SIZE_MB}MB • Analyzed locally then with AI</p>
        </div>
      </motion.div>

      {/* Error */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-red-400 font-semibold mb-1 text-sm">Processing Failed</h3>
            <p className="text-xs text-red-200/80 max-w-md mx-auto leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-medium transition-colors"
          >
            Try Another File
          </button>
        </motion.div>
      )}

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
      >
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center mb-5">
          Forensic Analysis Pipeline
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
              className={`feature-card p-4 rounded-xl border ${feat.border} ${feat.bg} backdrop-blur-sm`}
            >
              <feat.icon className={`w-4 h-4 ${feat.color} mb-2.5`} />
              <h5 className="text-xs font-semibold text-zinc-200 mb-1">{feat.title}</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

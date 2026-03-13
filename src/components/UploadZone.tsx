import { UploadCloud, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback } from 'react';
import { MAX_FILE_SIZE_MB } from '../types';

interface UploadZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string;
  hasError: boolean;
  onFileSelect: (file: File) => void;
}

export default function UploadZone({ fileInputRef, error, hasError, onFileSelect }: UploadZoneProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold tracking-tight mb-3">Reveal Hidden Text</h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
          Upload a redacted PDF. We'll extract the raw text layer to uncover improperly applied redactions, and use AI
          to infer missing context.
        </p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative group cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-emerald-500/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center hover:border-emerald-500/50 transition-colors duration-300 bg-zinc-900/20 group-[.drag-over]:border-emerald-500/70">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-800 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-lg font-medium mb-2">Click or drag to upload PDF</h3>
          <p className="text-sm text-zinc-500">Maximum file size: {MAX_FILE_SIZE_MB}MB</p>
        </div>
      </div>

      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-red-400 font-semibold mb-1">Processing Failed</h3>
            <p className="text-sm text-red-200/80 max-w-md mx-auto leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-medium transition-colors"
          >
            Try Another File
          </button>
        </motion.div>
      )}
    </div>
  );
}

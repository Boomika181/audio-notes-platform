import React, { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, ArrowRight, Cpu, Radio, Shield, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress: number;
}

export function UploadZone({ onUpload, isUploading, progress }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    const validExtensions = ['mp3', 'wav', 'm4a'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!extension || !validExtensions.includes(extension)) {
      setError('UNSUPPORTED FORMAT: PLEASE UPLOAD MP3, WAV, OR M4A.');
      return false;
    }
    if (file.size > maxSize) {
      setError('FILE TOO LARGE: MAXIMUM ALLOWED SIZE IS 50 MB.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      onUpload(file);
    }
  }, [onUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      onUpload(file);
    }
  };

  return (
    <div id="upload-section" className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative bg-tech-grid bg-[#0a0a0e] border rounded-sm p-10 md:p-16 transition-all duration-300 overflow-hidden",
          isDragging 
            ? "border-blue-500 bg-blue-950/20 shadow-2xl shadow-blue-500/10" 
            : "border-white/10 hover:border-white/20",
          isUploading && "pointer-events-none opacity-80 border-blue-500/50"
        )}
      >
        {/* Corner Technical Crosshairs */}
        <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-600 select-none">+</div>
        <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-600 select-none">+</div>
        <div className="absolute bottom-3 left-3 text-[10px] font-mono text-zinc-600 select-none">+</div>
        <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-600 select-none">+</div>

        {/* Ambient Glow Effects */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-60" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".mp3,.wav,.m4a"
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          {/* Workstation Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-zinc-900 border border-white/10 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400">
              <Radio className="h-3 w-3 animate-pulse text-cyan-400" />
              <span>{isUploading ? 'INGESTING STREAM...' : 'AUDIO INTAKE WORKSTATION'}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold uppercase tracking-tight text-white">
              {isDragging ? 'RELEASE TO INGEST STREAM' : 'DROP YOUR RECORDING HERE'}
            </h2>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest max-w-xl">
              MP3 · WAV · M4A — MAX 50 MB · MINIMUM 2 MINUTES
            </p>
          </div>

          {/* Upload Button CTA */}
          <div className="flex flex-col items-center space-y-4 pt-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group inline-flex items-center space-x-3 px-8 py-4 bg-blue-600 text-white text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:bg-blue-500 transition-all duration-200 shadow-xl shadow-blue-600/25 border border-blue-400/40 active:scale-95"
            >
              <Upload className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
              <span>BROWSE WORKSTATION</span>
              <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="flex items-center space-x-6 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-emerald-400" /> SERVER-SIDE ISOLATED</span>
              <span className="flex items-center gap-1.5"><HardDrive className="h-3 w-3 text-blue-400" /> PRIVATE SUPABASE BUCKET</span>
            </div>
          </div>

          {/* Selected File Details */}
          {selectedFile && !isUploading && (
            <div className="w-full max-w-lg bg-zinc-900/90 border border-blue-500/30 rounded-sm p-4 text-left font-mono space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold">SELECTED FILE:</span>
                <span className="text-blue-400 font-bold truncate max-w-xs">{selectedFile.name}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-white/5 pt-2">
                <span>SIZE: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span>TYPE: {selectedFile.name.split('.').pop()?.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          <AnimatePresence>
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl space-y-3 pt-4"
              >
                <div className="relative h-1.5 w-full bg-zinc-900 rounded-none overflow-hidden border border-white/10">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                    <span className="text-zinc-300 font-bold uppercase">STREAM INGESTION IN PROGRESS...</span>
                  </div>
                  <span className="text-blue-400 font-bold">{progress}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message Display */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 text-rose-400 border border-rose-800/60 bg-rose-950/40 py-3 px-6 rounded-sm text-xs font-mono"
              >
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span className="font-bold tracking-wider">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

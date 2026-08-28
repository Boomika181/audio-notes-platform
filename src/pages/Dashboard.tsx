import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadZone } from '../components/UploadZone';
import { NoteCard } from '../components/NoteCard';
import { AudioNote } from '../types';
import { AlertCircle, ArrowUpRight, Radio, Layers, Cpu, ShieldCheck } from 'lucide-react';
import { fetchNotes, uploadAudioFile } from '../lib/api';
import { motion } from 'motion/react';
import audioNotesHero from '../assets/audio-notes-hero.png';

export function Dashboard() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<AudioNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      const data = await fetchNotes();
      setNotes(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading notes:', err);
      setError(err.message || 'An error occurred while fetching your recordings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    const interval = setInterval(loadNotes, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => resolve(0);
    });
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 5, 95));
    }, 200);

    try {
      const duration = await getAudioDuration(file);
      if (duration < 120) {
        setError(`Recording is too short (${duration}s). Minimum 2 minutes required.`);
        setIsUploading(false);
        return;
      }

      const note = await uploadAudioFile(file, duration);
      setUploadProgress(100);
      setTimeout(() => {
        navigate(`/notes/${note.id}`);
      }, 800);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please check your connection.');
      setIsUploading(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const scrollToRecordings = () => {
    const recEl = document.getElementById('recordings-library');
    if (recEl) {
      recEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToUpload = () => {
    const uploadEl = document.getElementById('upload-section');
    if (uploadEl) {
      uploadEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Landing Section with Clean Background Artwork Asset */}
      <section 
        className="relative min-h-[600px] lg:min-h-[680px] flex flex-col justify-between pt-12 pb-10 px-6 sm:px-10 lg:px-12 border border-white/10 rounded-sm overflow-hidden bg-cover bg-center lg:bg-[right_center] bg-no-repeat shadow-2xl"
        style={{ backgroundImage: `url(${audioNotesHero})` }}
      >
        {/* Very Light & Subtle Horizontal Fade (Only on extreme left to ensure crisp text contrast) */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(8,8,10,0.45) 0%, rgba(8,8,10,0.15) 45%, rgba(8,8,10,0) 75%)'
          }}
        />

        {/* Corner Technical Crosshairs */}
        <span className="absolute top-3 left-3 text-[10px] font-mono text-zinc-500 select-none z-10">+</span>
        <span className="absolute top-3 right-3 text-[10px] font-mono text-zinc-500 select-none z-10">+</span>
        <span className="absolute bottom-3 left-3 text-[10px] font-mono text-zinc-500 select-none z-10">+</span>
        <span className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-500 select-none z-10">+</span>

        <div className="relative z-10 space-y-12">
          {/* Floating Text Container (No opaque box, no backdrop blur box) */}
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-black/40 border border-white/15 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-blue-400">
                AI AUDIO INTELLIGENCE
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold uppercase tracking-tight text-white leading-[1.04] drop-shadow-lg">
              TURN <br />
              CONVERSATIONS <br />
              <span className="text-zinc-100">INTO </span>
              <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white drop-shadow-md">
                INTELLIGENCE.
              </span>
            </h1>

            <p className="text-sm sm:text-base font-sans text-zinc-300 max-w-lg leading-relaxed font-normal drop-shadow-md">
              Upload your audio recordings and let AI transcribe, summarize, and extract key insights and action items automatically.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button 
                onClick={scrollToUpload}
                className="group px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase tracking-widest rounded-md transition-all duration-200 shadow-lg shadow-blue-600/35 hover:shadow-blue-600/60 hover:-translate-y-0.5 border border-blue-400/40 flex items-center space-x-2 active:scale-95 cursor-pointer"
              >
                <span>UPLOAD RECORDING</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <button 
                onClick={scrollToRecordings}
                className="px-7 py-3.5 bg-black/40 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-mono font-bold uppercase tracking-widest rounded-md transition-all duration-200 border border-white/15 backdrop-blur-sm flex items-center space-x-2 active:scale-95 cursor-pointer"
              >
                <span>VIEW RECORDINGS</span>
              </button>
            </div>
          </div>

          {/* Hero Data Strip (Floating with subtle translucent glass) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/10">
            <div className="p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-sm font-mono space-y-1">
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest">SUPPORTED FORMATS</span>
              <div className="text-xs font-bold text-white">MP3 · WAV · M4A</div>
            </div>
            <div className="p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-sm font-mono space-y-1">
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest">MAX FILE SIZE</span>
              <div className="text-xs font-bold text-white">50 MB</div>
            </div>
            <div className="p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-sm font-mono space-y-1">
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest">MIN DURATION</span>
              <div className="text-xs font-bold text-white">2 MINUTES (120S)</div>
            </div>
            <div className="p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-sm font-mono space-y-1">
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest">AI PIPELINE</span>
              <div className="text-xs font-bold text-blue-400">STT V3 + LLM 3.6</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Workstation */}
      <section>
        <UploadZone 
          onUpload={handleUpload} 
          isUploading={isUploading} 
          progress={uploadProgress} 
        />
      </section>

      {/* Recordings Library Section */}
      <section id="recordings-library" className="space-y-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-6 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-blue-400 uppercase tracking-[0.3em]">
              <Layers className="h-3.5 w-3.5" />
              <span>RECORDINGS ARCHIVE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-white">
              YOUR RECORDINGS
            </h2>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400 uppercase tracking-widest">
            <span className="px-2.5 py-1 bg-zinc-900 border border-white/10 text-white font-bold rounded-sm">
              {notes.length}
            </span>
            <span>RECORDINGS PERSISTED</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-sm flex items-center space-x-3 text-rose-400 font-mono text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {isLoading && notes.length === 0 ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 w-full bg-[#0d0d12] border border-white/5 animate-pulse rounded-sm" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center space-y-6 bg-[#0d0d12]/50 border border-white/5 rounded-sm p-8 font-mono">
            <div className="h-12 w-12 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500">
              <Layers className="h-6 w-6 text-zinc-600" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">NO RECORDINGS FOUND</h3>
              <p className="text-xs text-zinc-500">Upload your first audio recording above to generate intelligence reports.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note, idx) => (
              <NoteCard key={note.id} note={note} index={idx + 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

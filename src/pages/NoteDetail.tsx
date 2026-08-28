import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Copy, 
  Search, 
  RefreshCcw, 
  Trash2,
  AlertCircle,
  Loader2,
  Clock,
  FileAudio,
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Sparkles,
  CheckSquare
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { AudioNote } from '../types';
import { cn, formatDisplayTitle, cleanMojibake, formatDisplayDate } from '../lib/utils';
import { fetchNoteById, retryNoteProcessing, fetchAudioUrl, deleteNote } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<AudioNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const loadNote = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchNoteById(id);
      setNote(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading note:', err);
      setError(err.message || 'Failed to load recording details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNote();
    const interval = setInterval(() => {
      if (note && (note.status === 'processing' || (note.status as string) === 'pending')) {
        loadNote();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadNote, note?.status]);

  useEffect(() => {
    const getAudio = async () => {
      if (!id || !note) return;
      try {
        const url = await fetchAudioUrl(id);
        setAudioUrl(url);
      } catch (err) {
        console.error('Error fetching signed audio URL:', err);
      }
    };

    if (note && !audioUrl) {
      getAudio();
    }
  }, [id, note, audioUrl]);

  const handleRetry = async () => {
    if (!id) return;
    setIsRetrying(true);
    try {
      await retryNoteProcessing(id);
      await loadNote();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to permanently delete this recording?')) return;
    setIsDeleting(true);
    try {
      await deleteNote(id);
      navigate('/');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-6 font-mono">
        <div className="flex items-center space-x-1.5 h-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ height: [12, 36, 12] }}
              transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.1 }}
              className="w-1 bg-blue-500 rounded-none"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-6 font-mono bg-[#0d0d12] border border-white/10 p-8 rounded-sm">
        <div className="text-3xl font-display font-bold text-rose-400 uppercase tracking-tight">ERROR DETECTED</div>
        <p className="text-xs text-zinc-400">{error || 'Session record not found in system storage.'}</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-blue-500 transition-all border border-blue-400/40"
        >
          RETURN TO DASHBOARD
        </button>
      </div>
    );
  }

  const displayTitle = formatDisplayTitle(note.title, note.file_name, note.created_at);
  const cleanFileName = cleanMojibake(note.file_name);

  return (
    <div className="space-y-12 pb-20 font-sans">
      {/* Header Bar */}
      <header className="space-y-6 border-b border-white/10 pb-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <span className="uppercase tracking-widest">BACK TO DASHBOARD</span>
          </Link>

          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
            {formatDisplayDate(note.created_at)}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-xs font-mono text-blue-400">
              <span className="font-bold">RECORDING REPORT //</span>
              <span className="text-zinc-500">{note.id}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold uppercase text-white tracking-tight leading-tight">
              {displayTitle}
            </h1>
            <div className="flex items-center space-x-6 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-zinc-500" /> {formatTime(note.duration_seconds || 0)}</span>
              <span className="flex items-center gap-1.5"><FileAudio className="h-3.5 w-3.5 text-zinc-500" /> {cleanFileName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {note.status === 'failed' && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center px-5 py-2 bg-blue-600 text-white text-xs font-mono font-bold uppercase tracking-widest rounded-sm hover:bg-blue-500 transition-all border border-blue-400/40"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5 mr-2", isRetrying && "animate-spin")} />
                RETRY
              </button>
            )}

            <StatusBadge status={note.status} />

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2.5 text-zinc-500 hover:text-rose-400 transition-colors border border-white/10 rounded-sm hover:border-rose-500/40 hover:bg-rose-950/20"
              title="Delete Recording"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-rose-400" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Analysis Report View */}
      {note.status === 'completed' && audioUrl ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT: Player + Section 01 Transcript */}
          <div className="lg:col-span-7 space-y-10">
            {/* Custom Audio Player Card */}
            <section className="bg-tech-grid bg-[#0d0d12] border border-white/10 rounded-sm p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-blue-400 font-bold uppercase tracking-widest">AUDIO PLAYBACK STREAM</span>
                <span className="text-zinc-500">SIGNED SUPABASE URL</span>
              </div>

              <audio 
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* Progress Seek Line */}
              <div className="space-y-2 font-mono">
                <div className="relative h-1.5 w-full bg-zinc-900 border border-white/10 rounded-none overflow-hidden cursor-pointer">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={onSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold tracking-widest">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={togglePlay} 
                    className="h-12 w-12 rounded-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all border border-blue-400/40 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                  </button>

                  {/* Playback Speed Selectors */}
                  <div className="flex space-x-1 font-mono">
                    {[1, 1.5, 2].map(rate => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (audioRef.current) audioRef.current.playbackRate = rate;
                        }}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-sm border transition-all uppercase tracking-wider",
                          playbackRate === rate 
                            ? "bg-blue-950/80 text-blue-400 border-blue-800/80" 
                            : "bg-zinc-900/60 text-zinc-500 border-white/5 hover:text-zinc-300"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center space-x-3 font-mono">
                  <Volume2 className="h-4 w-4 text-zinc-500" />
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (audioRef.current) audioRef.current.volume = v;
                    }}
                    className="w-20 h-1 bg-zinc-900 appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Section 01: Transcript */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-blue-400">SECTION 01 //</span>
                  <h2 className="text-lg font-display font-bold uppercase tracking-tight text-white">
                    TRANSCRIPT
                  </h2>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="SEARCH SPEECH..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-zinc-900 border border-white/10 rounded-sm text-[10px] font-mono uppercase text-white outline-none focus:border-blue-500 transition-colors w-40"
                    />
                  </div>

                  <button 
                    onClick={() => note.transcript && copyToClipboard(note.transcript)}
                    className="inline-flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-blue-400 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{isCopied ? 'COPIED!' : 'COPY'}</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-[#0d0d12] border border-white/10 rounded-sm p-6 sm:p-8 space-y-6 max-h-[600px] overflow-y-auto font-sans">
                {note.transcript?.split('\n\n').map((para, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-4 transition-opacity duration-200",
                    searchTerm && !para.toLowerCase().includes(searchTerm.toLowerCase()) && "opacity-25"
                  )}>
                    <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest pt-1 flex-shrink-0">
                      [{formatTime(i * 30)}]
                    </span>
                    <p className="text-sm text-zinc-300 leading-relaxed font-normal selection:bg-blue-600/30 selection:text-blue-200">
                      {para}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: AI Analysis Report Sections */}
          <div className="lg:col-span-5 space-y-8">
            {/* Section 02: AI Summary */}
            <section className="bg-[#0d0d12] border border-white/10 rounded-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono font-bold text-blue-400">SECTION 02 //</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">EXECUTIVE SUMMARY</span>
              </div>
              <div className="text-sm text-zinc-200 leading-relaxed font-sans font-medium">
                <ReactMarkdown>{note.summary?.executive_summary || 'No summary available.'}</ReactMarkdown>
              </div>
            </section>

            {/* Section 03: Key Highlights */}
            <section className="bg-[#0d0d12] border border-white/10 rounded-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono font-bold text-blue-400">SECTION 03 //</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">KEY HIGHLIGHTS</span>
              </div>
              <div className="space-y-3 font-sans">
                {note.summary?.key_highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-zinc-900/60 border border-white/5 rounded-sm">
                    <span className="text-[10px] font-mono font-bold text-blue-400 pt-0.5 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="text-xs font-medium text-zinc-300 leading-normal">{highlight}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 04: Action Items */}
            <section className="bg-[#0d0d12] border border-white/10 rounded-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono font-bold text-blue-400">SECTION 04 //</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">ACTION ITEMS</span>
              </div>
              <div className="space-y-2.5 font-sans">
                {note.summary?.action_items.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-zinc-900/80 border border-white/5 rounded-sm">
                    <CheckSquare className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-zinc-200">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : note.status === 'processing' ? (
        /* Real Processing Experience Technical Pipeline Tracker */
        <div className="max-w-2xl mx-auto py-16 px-8 bg-[#0d0d12] border border-white/10 rounded-sm space-y-10 font-mono">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">REAL-TIME PIPELINE EXECUTING</span>
            <h3 className="text-2xl font-display font-bold uppercase text-white">PIPELINE PROGRESS</h3>
          </div>

          <div className="space-y-4">
            {/* Stage 01 Upload */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/10 rounded-sm">
              <span className="text-xs font-bold text-white">01 UPLOAD RECORDING</span>
              <span className="text-xs font-bold text-emerald-400">✓ COMPLETED</span>
            </div>

            {/* Stage 02 STT */}
            <div className={cn(
              "flex items-center justify-between p-4 border rounded-sm transition-colors",
              note.processing_step === 'transcription'
                ? "bg-blue-950/60 border-blue-500 text-blue-400"
                : note.processing_step === 'summarization' || note.processing_step === 'completed'
                ? "bg-zinc-900 border-white/10 text-white"
                : "bg-zinc-950 border-white/5 text-zinc-600"
            )}>
              <span className="text-xs font-bold">02 SPEECH-TO-TEXT (GNANI V3)</span>
              <span className="text-xs font-bold">
                {note.processing_step === 'transcription' ? '● PROCESSING CHUNKS...' : '✓ COMPLETED'}
              </span>
            </div>

            {/* Stage 03 LLM */}
            <div className={cn(
              "flex items-center justify-between p-4 border rounded-sm transition-colors",
              note.processing_step === 'summarization'
                ? "bg-blue-950/60 border-blue-500 text-blue-400"
                : note.processing_step === 'completed'
                ? "bg-zinc-900 border-white/10 text-white"
                : "bg-zinc-950 border-white/5 text-zinc-600"
            )}>
              <span className="text-xs font-bold">03 AI ANALYSIS (GEMINI 3.6 FLASH)</span>
              <span className="text-xs font-bold">
                {note.processing_step === 'summarization' ? '● SYNTHESIZING INTELLIGENCE...' : note.processing_step === 'completed' ? '✓ COMPLETED' : '○ PENDING'}
              </span>
            </div>

            {/* Stage 04 Complete */}
            <div className="flex items-center justify-between p-4 bg-zinc-950 border border-white/5 rounded-sm text-zinc-600">
              <span className="text-xs font-bold">04 FINALIZING REPORT PERSISTENCE</span>
              <span className="text-xs font-bold">○ PENDING</span>
            </div>
          </div>
        </div>
      ) : note.status === 'failed' ? (
        /* Failure Panel */
        <div className="max-w-2xl mx-auto py-16 px-8 bg-rose-950/30 border border-rose-800/60 rounded-sm space-y-6 text-center font-mono">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-rose-300 uppercase">PROCESSING INTERRUPTED</h3>
            <p className="text-xs text-rose-400 font-bold">{note.error_message || 'The recording could not be processed by the AI pipeline.'}</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-8 py-3 bg-rose-600 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-rose-500 transition-all border border-rose-400/40"
          >
            <RefreshCcw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
            RETRY PROCESSING →
          </button>
        </div>
      ) : null}
    </div>
  );
}

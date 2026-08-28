import React from 'react';
import { 
  Server, 
  Database, 
  Shield, 
  Cpu, 
  Activity,
  Layers,
  ArrowRight,
  Terminal,
  Radio,
  HardDrive
} from 'lucide-react';
import { motion } from 'motion/react';

export function Architecture() {
  const systems = [
    {
      id: '01',
      name: 'SPEECH-TO-TEXT (STT)',
      provider: 'Gnani.ai STT V3',
      type: 'vachana.ai API V3',
      description: 'Multipart audio ingestion with sequential ≤25-second WAV header reconstruction for long-file speech recognition.',
      status: 'ONLINE',
      color: 'text-blue-400',
    },
    {
      id: '02',
      name: 'INTELLIGENCE CORE (LLM)',
      provider: 'Google Gemini 3.6 Flash',
      type: '@google/genai SDK',
      description: 'Structured JSON schema summarization returning executive summaries, key highlights, and actionable task items.',
      status: 'ONLINE',
      color: 'text-cyan-400',
    },
    {
      id: '03',
      name: 'DATABASE PERSISTENCE',
      provider: 'PostgreSQL / Supabase',
      type: 'PostgREST Service Role',
      description: 'Durable record storage with strict RLS permissions for public.audio_notes and async step tracking.',
      status: 'ONLINE',
      color: 'text-emerald-400',
    },
    {
      id: '04',
      name: 'FILE STORAGE BUCKET',
      provider: 'Supabase Private Storage',
      type: 'audio-notes Private Bucket',
      description: 'Private object store protected from anonymous access. Audio streaming delivered via 3600s Signed URLs.',
      status: 'ONLINE',
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-16 pb-20 font-sans">
      {/* Header */}
      <section className="space-y-4 border-b border-white/10 pb-8">
        <div className="flex items-center space-x-3 text-xs font-mono text-blue-400 font-bold uppercase tracking-[0.3em]">
          <Layers className="h-4 w-4" />
          <span>INFRASTRUCTURE // SYSTEM ARCHITECTURE</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-display font-extrabold uppercase text-white tracking-tight">
          SYSTEMS DASHBOARD
        </h1>
        <p className="text-sm font-mono text-zinc-400 max-w-2xl">
          Real-time overview of the active Audio Notes Platform pipeline engines, authentication boundary, and database security.
        </p>
      </section>

      {/* Systems Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {systems.map((sys) => (
          <div key={sys.id} className="bg-tech-grid bg-[#0d0d12] border border-white/10 rounded-sm p-6 sm:p-8 space-y-6 group hover:border-white/20 transition-all">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-zinc-600 font-bold">{sys.id} // SYSTEM MODULE</span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{sys.status}</span>
              </span>
            </div>

            <div className="space-y-2">
              <h3 className={`text-xl font-display font-bold uppercase tracking-tight ${sys.color}`}>
                {sys.name}
              </h3>
              <div className="flex items-center space-x-4 font-mono text-xs text-zinc-400">
                <span className="font-bold text-white">{sys.provider}</span>
                <span>·</span>
                <span>{sys.type}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {sys.description}
            </p>
          </div>
        ))}
      </section>

      {/* Technical Pipeline Flow Diagram */}
      <section className="bg-[#0d0d12] border border-white/10 rounded-sm p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3 text-xs font-mono font-bold text-white uppercase tracking-widest">
            <Activity className="h-4 w-4 text-blue-400" />
            <span>END-TO-END DATA PROCESSING FLOW</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">SERVER-SIDE ISOLATION</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 bg-zinc-900 border border-white/10 rounded-sm space-y-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">01 INTAKE</span>
            <div className="font-bold text-white uppercase">REACT CLIENT</div>
            <p className="text-[11px] text-zinc-400 font-sans">Validates file type & minimum 120s duration before POST /api/notes/upload.</p>
          </div>

          <div className="p-4 bg-zinc-900 border border-white/10 rounded-sm space-y-2">
            <span className="text-[10px] text-blue-400 font-bold uppercase">02 STORAGE & STT</span>
            <div className="font-bold text-white uppercase">EXPRESS + GNANI.AI</div>
            <p className="text-[11px] text-zinc-400 font-sans">Uploads to private bucket, chunks audio into ≤25s segments for STT v3.</p>
          </div>

          <div className="p-4 bg-zinc-900 border border-white/10 rounded-sm space-y-2">
            <span className="text-[10px] text-cyan-400 font-bold uppercase">03 REASONING</span>
            <div className="font-bold text-white uppercase">GEMINI 3.6 FLASH</div>
            <p className="text-[11px] text-zinc-400 font-sans">Generates structured JSON summary, strategic highlights, and action items.</p>
          </div>

          <div className="p-4 bg-zinc-900 border border-white/10 rounded-sm space-y-2">
            <span className="text-[10px] text-emerald-400 font-bold uppercase">04 PERSISTENCE</span>
            <div className="font-bold text-white uppercase">SUPABASE POSTGRESQL</div>
            <p className="text-[11px] text-zinc-400 font-sans">Updates database record status to completed and serves signed streaming URLs.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

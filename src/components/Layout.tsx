import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { ArrowUpRight, Radio, Cpu, Layers } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'DASHBOARD' },
    { path: '/architecture', label: 'SYSTEMS' },
  ];

  const scrollToUpload = () => {
    const uploadEl = document.getElementById('upload-section');
    if (uploadEl) {
      uploadEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#upload-section';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-zinc-100 selection:bg-blue-600/30 selection:text-blue-300 font-sans">
      {/* Top Border Indicator */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between h-20 items-center">
            {/* Left Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative flex items-center justify-center h-8 w-8 rounded-sm bg-zinc-900 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                <Radio className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-white group-hover:text-blue-400 transition-colors">
                  AUDIO NOTES
                </span>
                <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">
                  AI AUDIO INTELLIGENCE
                </span>
              </div>
            </Link>
            
            {/* Center Navigation Links */}
            <nav className="hidden md:flex items-center space-x-10">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative text-[11px] font-mono font-bold uppercase tracking-[0.2em] transition-all py-2",
                    location.pathname === item.path
                      ? "text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {item.label}
                  {location.pathname === item.path && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-sm shadow-blue-500/50"
                      transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Action CTA */}
            <div className="flex items-center space-x-4">
              <button
                onClick={scrollToUpload}
                className="hidden sm:inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white text-[11px] font-mono font-bold uppercase tracking-widest rounded-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 border border-blue-400/30"
              >
                <span>UPLOAD RECORDING</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-grow max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-10">
        {children}
      </main>

      {/* Technical Editorial Footer */}
      <footer className="border-t border-white/10 bg-[#060608] py-12">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase tracking-widest">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              <span>AUDIO NOTES // AI AUDIO INTELLIGENCE</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              HIGH-FIDELITY SPEECH TRANSCRIPTION & CONTEXTUAL LLM ANALYSIS PLATFORM
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-8 text-xs font-mono">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">STT ENGINE</span>
              <span className="text-zinc-300 font-bold">Gnani.ai V3</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">LLM ANALYSIS</span>
              <span className="text-zinc-300 font-bold">Gemini 3.6 Flash</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">DATABASE / STORAGE</span>
              <span className="text-zinc-300 font-bold">Supabase PostgreSQL</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center space-x-2 bg-emerald-950/60 px-3 py-1.5 rounded-sm border border-emerald-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { FC } from 'react';
import { AudioNote } from '../types';
import { StatusBadge } from './StatusBadge';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatDisplayTitle, cleanMojibake, formatDisplayDate } from '../lib/utils';

interface NoteCardProps {
  note: AudioNote;
  index?: number;
}

export const NoteCard: FC<NoteCardProps> = ({ note, index = 1 }) => {
  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const indexStr = String(index).padStart(2, '0');
  const displayTitle = formatDisplayTitle(note.title, note.file_name, note.created_at);
  const cleanFileName = cleanMojibake(note.file_name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: (index % 10) * 0.03 }}
      className="group relative"
    >
      <Link
        to={`/notes/${note.id}`}
        className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 bg-[#0d0d12]/90 border border-white/10 hover:border-blue-500/50 rounded-sm transition-all duration-200 group-hover:bg-[#12121a] gap-4"
      >
        {/* Left Info */}
        <div className="flex items-center space-x-6 min-w-0 flex-grow">
          <span className="text-xs font-mono font-bold text-zinc-600 group-hover:text-blue-400 transition-colors flex-shrink-0">
            {indexStr}
          </span>

          <div className="min-w-0 flex-grow">
            <h3 className="text-base font-display font-bold text-white uppercase tracking-tight truncate group-hover:text-blue-400 transition-colors">
              {displayTitle}
            </h3>
            <div className="flex items-center space-x-4 mt-1 text-[10px] font-mono text-zinc-500 uppercase tracking-widest truncate">
              <span className="truncate">{cleanFileName}</span>
              <span>·</span>
              <span className="flex-shrink-0">{note.mime_type?.split('/').pop()?.toUpperCase() || 'AUDIO'}</span>
            </div>
          </div>
        </div>

        {/* Right Metadata & Status */}
        <div className="flex items-center justify-between md:justify-end space-x-6 md:space-x-10 flex-shrink-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
          <div className="flex items-center space-x-6 text-[11px] font-mono">
            <div className="flex flex-col items-start md:items-end">
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest">DURATION</span>
              <span className="text-zinc-300 font-bold">{formatDuration(note.duration_seconds)}</span>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex flex-col items-start md:items-end">
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest">CAPTURED</span>
              <span className="text-zinc-300 font-bold">{formatDisplayDate(note.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <StatusBadge status={note.status} />
            <div className="h-8 w-8 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-blue-500/50 group-hover:bg-blue-600 transition-all">
              <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

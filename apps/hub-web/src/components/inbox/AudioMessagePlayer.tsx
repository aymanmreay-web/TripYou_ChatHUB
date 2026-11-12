'use client';

/**
 * مشغّل الرسائل الصوتية مع موجة تفاعلية قابلة للنقر والسحب الزمني.
 * مستخلص من NativeChatInbox ضمن خطة التوحيد — السلوك كما هو حرفياً.
 */
import React, { useMemo, useRef, useState } from 'react';
import { getWaveformBars } from '../../lib/inbox/messages';

interface AudioPlayerProps {
  src: string;
  msgId: string;
  isOut: boolean;
}

export function AudioMessagePlayer({ src, msgId, isOut }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const bars = useMemo(() => getWaveformBars(msgId), [msgId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || duration || 0;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);
    setProgress(dur > 0 ? (cur / dur) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleSeekPct = (pct: number) => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || duration || 0;
    if (!dur) return;
    const target = Math.max(0, Math.min(dur, pct * dur));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
    setProgress(pct * 100);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeekPct(pct);
  };

  const handleBarClick = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const pct = i / bars.length;
    handleSeekPct(pct);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-2xl min-w-[230px] max-w-[320px] border border-white/5 transition-all ${
        isOut ? 'bg-purple-700/40 shadow-inner' : 'bg-slate-800/80 shadow-inner'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* زر التشغيل / الإيقاف */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
          isOut
            ? 'bg-purple-500 hover:bg-purple-400 text-white'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-[var(--text-main)]" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5 text-[var(--text-main)]" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* الموجة الصوتية + شريط التقدم التفاعلي */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="flex items-end gap-[2px] h-9 cursor-pointer select-none py-1 group/wave"
          onClick={handleProgressClick}
          title="اضغط أو اسحب للانتقال إلى أي نقطة في التسجيل"
        >
          {bars.map((h, i) => {
            const barPct = (i / bars.length) * 100;
            const isActive = barPct <= progress;
            return (
              <div
                key={i}
                onClick={(e) => handleBarClick(i, e)}
                className={`flex-1 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? isOut
                      ? 'bg-purple-200 shadow-sm'
                      : 'bg-emerald-400 shadow-sm'
                    : isOut
                    ? 'bg-purple-400/40 hover:bg-purple-300'
                    : 'bg-slate-500/40 hover:bg-slate-400'
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        {/* الوقت */}
        <div className="flex justify-between text-[10px] text-slate-300 font-mono tabular-nums px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

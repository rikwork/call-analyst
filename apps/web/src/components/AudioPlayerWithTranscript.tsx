import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Tag,
  Clock,
  User,
  UserCheck,
  Search,
  FileText,
  Download,
  StickyNote,
  Sparkles,
  Bookmark,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { TranscriptUtterance, SessionNote } from '../types';

interface AudioPlayerWithTranscriptProps {
  utterances: TranscriptUtterance[];
  notes: SessionNote[];
  durationSeconds: number;
  audioUrl?: string;
  onAddNote?: (note: { timestamp_seconds: number; content: string; category: string }) => void;
}

type TimelineItem =
  | { type: 'utterance'; data: TranscriptUtterance; time: number }
  | { type: 'note'; data: SessionNote; time: number };

export const AudioPlayerWithTranscript: React.FC<AudioPlayerWithTranscriptProps> = ({
  utterances,
  notes,
  durationSeconds,
  audioUrl,
  onAddNote,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [realDuration, setRealDuration] = useState<number>(durationSeconds || 120);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<'all' | 'transcript' | 'notes'>('all');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRealDuration(durationSeconds || 120);
  }, [durationSeconds]);

  // Playback sync loop
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch((e) => {
          console.warn('Audio autoplay prevented or error:', e);
        });
      } else {
        audioRef.current.pause();
      }
      return;
    }

    // Synthetic playback simulation when no physical audio is streamed
    let lastTimestamp = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta * playbackSpeed;
          if (next >= realDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, realDuration, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (
      audioRef.current &&
      audioRef.current.duration &&
      !isNaN(audioRef.current.duration) &&
      isFinite(audioRef.current.duration)
    ) {
      setRealDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, secs);
    const m = Math.floor(s / 60);
    const rem = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(time, realDuration));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const togglePlayPause = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            console.warn('Audio play failed:', e);
            setIsPlaying(true);
          });
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Build unified chronological timeline (dialogue + notes)
  const unifiedTimeline = useMemo(() => {
    const items: TimelineItem[] = [];

    if (viewFilter === 'all' || viewFilter === 'transcript') {
      utterances.forEach((u) => {
        items.push({
          type: 'utterance',
          data: u,
          time: u.start_time,
        });
      });
    }

    if (viewFilter === 'all' || viewFilter === 'notes') {
      notes.forEach((n) => {
        items.push({
          type: 'note',
          data: n,
          time: n.timestamp_seconds,
        });
      });
    }

    // Sort by timestamp ascending
    items.sort((a, b) => a.time - b.time);

    // Apply search filter
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      if (item.type === 'utterance') {
        return (
          item.data.text.toLowerCase().includes(query) ||
          item.data.speaker.toLowerCase().includes(query) ||
          (item.data.tags && item.data.tags.some((t) => t.toLowerCase().includes(query)))
        );
      } else {
        return (
          item.data.content.toLowerCase().includes(query) ||
          item.data.category.toLowerCase().includes(query)
        );
      }
    });
  }, [utterances, notes, viewFilter, searchQuery]);

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'intervention':
        return {
          icon: '⚡',
          label: 'Техника / Интервенция',
          badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
        };
      case 'emotion':
        return {
          icon: '💭',
          label: 'Эмоция / Маркер',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'homework':
        return {
          icon: '📋',
          label: 'Домашнее задание',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'observation':
      default:
        return {
          icon: '👁',
          label: 'Наблюдение терапевта',
          badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[680px]">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          className="hidden"
          preload="auto"
        />
      )}

      {/* Top Audio Player Bar */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-500 flex items-center justify-center text-white shadow-md transition"
              title={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={() => handleSeek(0)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="С начала"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="font-mono text-sm tracking-wider text-slate-300">
              <span className="text-teal-300 font-semibold">{formatTime(currentTime)}</span>
              <span className="text-slate-500"> / </span>
              <span>{formatTime(realDuration)}</span>
            </div>
          </div>

          {/* Right controls: Playback speed + Download audio */}
          <div className="flex items-center space-x-2">
            {audioUrl && (
              <a
                href={audioUrl}
                download="call_analyst_session.webm"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1 border border-slate-700 transition"
                title="Скачать исходную аудиозапись"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Скачать</span>
              </a>
            )}

            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    setPlaybackSpeed(spd);
                    if (audioRef.current) audioRef.current.playbackRate = spd;
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition ${
                    playbackSpeed === spd
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Waveform / Progress Bar with Note Pins */}
        <div className="space-y-1">
          <div
            className="w-full bg-slate-800 h-7 rounded-lg overflow-visible cursor-pointer relative flex items-center px-1 group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              handleSeek(pos * realDuration);
            }}
          >
            {/* Waveform bars simulation */}
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 overflow-hidden rounded-lg">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-teal-400 rounded-full"
                  style={{ height: `${20 + (Math.sin(i * 0.5) * 30 + 30)}%` }}
                />
              ))}
            </div>

            {/* Active progress fill */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-teal-600/40 border-r-2 border-teal-400 transition-all duration-100 rounded-l-lg"
              style={{ width: `${(currentTime / (realDuration || 1)) * 100}%` }}
            />

            {/* Note Pins on the timeline */}
            {notes.map((note) => {
              const leftPct = Math.min(99, Math.max(1, (note.timestamp_seconds / (realDuration || 1)) * 100));
              const isNear = Math.abs(currentTime - note.timestamp_seconds) < 2.0;

              return (
                <div
                  key={note.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(note.timestamp_seconds);
                  }}
                  title={`[${formatTime(note.timestamp_seconds)}] ${note.content}`}
                  className="absolute -top-1.5 -bottom-1.5 z-20 flex flex-col items-center justify-between cursor-pointer group/pin"
                  style={{ left: `${leftPct}%` }}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border-2 border-slate-900 transition-all duration-200 shadow-md ${
                      isNear ? 'bg-amber-400 ring-2 ring-amber-300 scale-125' : 'bg-amber-500 group-hover/pin:scale-125'
                    }`}
                  />
                  <span className="w-0.5 h-full bg-amber-400/70" />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>{notes.length} заметок на шкале</span>
            </span>
            <span>Кликните по реплике или заметке для перехода</span>
          </div>
        </div>
      </div>

      {/* Sub-header: Unified View Filter & Search */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1 rounded-md flex items-center space-x-1.5 transition ${
              viewFilter === 'all'
                ? 'bg-white text-teal-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Все события ({utterances.length + notes.length})</span>
          </button>

          <button
            onClick={() => setViewFilter('transcript')}
            className={`px-3 py-1 rounded-md flex items-center space-x-1.5 transition ${
              viewFilter === 'transcript'
                ? 'bg-white text-teal-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Диалог ({utterances.length})</span>
          </button>

          <button
            onClick={() => setViewFilter('notes')}
            className={`px-3 py-1 rounded-md flex items-center space-x-1.5 transition ${
              viewFilter === 'notes'
                ? 'bg-white text-teal-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
            <span>Заметки ({notes.length})</span>
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по диалогу и заметкам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 text-xs rounded-lg placeholder-slate-400 focus:outline-none focus:border-teal-600"
          />
        </div>
      </div>

      {/* Content Area: Chronological Unified Timeline */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {unifiedTimeline.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            События не найдены. Попробуйте изменить поисковый запрос.
          </div>
        ) : (
          unifiedTimeline.map((item) => {
            // RENDER UTTERANCE
            if (item.type === 'utterance') {
              const u = item.data;
              const isCurrent = currentTime >= u.start_time && currentTime <= u.end_time;
              const isPsychologist =
                u.speaker.toLowerCase().includes('психолог') ||
                u.speaker.toLowerCase().includes('терапевт') ||
                u.speaker.toLowerCase().includes('speaker_0');

              return (
                <div
                  key={u.id || `utt-${u.start_time}-${u.end_time}`}
                  onClick={() => handleSeek(u.start_time)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-teal-50/90 border-teal-400 ring-2 ring-teal-500/20 shadow-sm'
                      : isPsychologist
                      ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                      : 'bg-sky-50/40 border-sky-100 hover:bg-sky-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isPsychologist
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {isPsychologist ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{u.speaker}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Clinical tag badges */}
                      {u.tags &&
                        u.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(u.start_time)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed pl-8">{u.text}</p>
                </div>
              );
            }

            // RENDER SPECIALIST NOTE INLINE
            if (item.type === 'note') {
              const note = item.data;
              const isCurrent = Math.abs(currentTime - note.timestamp_seconds) < 2.5;
              const meta = getCategoryMeta(note.category);

              return (
                <div
                  key={note.id || `note-${note.timestamp_seconds}-${note.content.substring(0, 8)}`}
                  onClick={() => handleSeek(note.timestamp_seconds)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isCurrent
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30 shadow-md scale-[1.01]'
                      : 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                        <StickyNote className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <span>Заметка терапевта</span>
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                      >
                        {meta.icon} {meta.label}
                      </span>
                    </div>

                    <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(note.timestamp_seconds)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-900 font-medium leading-relaxed pl-8">
                    {note.content}
                  </p>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
};

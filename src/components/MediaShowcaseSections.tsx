import {
  ArrowUpRight,
  Headphones,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { Article, HomepageSection } from '../types/newspaper';

interface SectionProps {
  section: HomepageSection;
  editBar: React.ReactNode;
}

/**
 * Video News: 65% Main Auto-Playing Video Broadcast Stage + Dual 15% Supporting Video Sections
 */
export function VideoNewsSection({ section, editBar }: SectionProps) {
  const { publishedArticles, openArticle, siteSettings } = useNewspaper();
  const primaryColor = siteSettings.primaryColor || '#E1262D';

  const videoPool = useMemo(() => {
    const withVideo = publishedArticles.filter((a) => Boolean(a.videoUrl));
    const broadcastFallback = publishedArticles.filter((a) => !a.videoUrl);
    return [...withVideo, ...broadcastFallback].slice(0, Math.max(3, section.itemCount || 6));
  }, [publishedArticles, section.itemCount]);

  const [mainIdx, setMainIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mainVideo = videoPool[mainIdx % Math.max(1, videoPool.length)];
  const supportOne = videoPool[(mainIdx + 1) % Math.max(1, videoPool.length)];
  const supportTwo = videoPool[(mainIdx + 2) % Math.max(1, videoPool.length)];

  // Smooth auto-play timeline progression (tracks real <video> or simulated broadcast reel advance)
  useEffect(() => {
    if (!isPlaying || !mainVideo) return;
    if (mainVideo.videoUrl && videoRef.current) {
      if (isPlaying) void videoRef.current.play().catch(() => {});
    }
    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 100) {
          setMainIdx((i) => (i + 1) % Math.max(1, videoPool.length));
          return 0;
        }
        return prev + 1.25;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, mainVideo, videoPool.length]);

  useEffect(() => {
    setProgressPct(0);
  }, [mainIdx]);

  // Optional anchor voiceover when unmuted on Broadcast Motion reel
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!isMuted && isPlaying && mainVideo && !mainVideo.videoUrl) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(`${mainVideo.title}. ${mainVideo.excerpt}`);
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    } else {
      window.speechSynthesis.cancel();
    }
    return () => {
      if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isMuted, isPlaying, mainVideo]);

  const togglePlayPause = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (videoRef.current) {
      if (next) void videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  };

  if (videoPool.length === 0) return null;

  const renderSupportingSlot = (art: Article | undefined, slotIdx: number, label: string) => {
    if (!art) return <div className="hidden lg:block" />;
    return (
      <button
        key={art.id + slotIdx}
        type="button"
        onClick={() => {
          const targetIdx = videoPool.findIndex((x) => x.id === art.id);
          if (targetIdx >= 0) setMainIdx(targetIdx);
          setIsPlaying(true);
        }}
        className="group relative rounded-lg overflow-hidden bg-neutral-900 border border-white/10 hover:border-[#E1262D]/80 transition-all duration-300 text-left flex flex-col justify-end min-h-[220px] lg:min-h-[420px] cursor-pointer shadow-lg"
      >
        <img
          src={art.imageUrl}
          alt={art.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />

        <div className="relative z-10 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/15 backdrop-blur-md text-amber-300">
              {label}
            </span>
            <span
              style={{ backgroundColor: primaryColor }}
              className="w-7 h-7 rounded-full text-white flex items-center justify-center shadow group-hover:scale-110 transition-transform"
            >
              <Play className="w-3 h-3 fill-white ml-0.5" />
            </span>
          </div>

          <div className="text-[10px] font-mono text-sky-300 uppercase truncate">
            {art.category}
          </div>
          <h3 className="font-display text-sm font-bold text-white leading-snug line-clamp-3 group-hover:text-amber-200 transition-colors">
            {art.title}
          </h3>
        </div>
      </button>
    );
  };

  return (
    <div>
      {editBar}
      <section
        id="section-video-news"
        aria-label={section.title}
        className="relative bg-gradient-to-b from-[#070B13] via-[#0B111E] to-[#070B13] text-white py-12 border-y border-white/10 overflow-hidden"
      >
        {/* Subtle ambient gradient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#E1262D]/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-[#0D47FF]/10 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span
                style={{ backgroundColor: primaryColor }}
                className="w-9 h-9 rounded-md flex items-center justify-center shadow"
              >
                <Video className="w-4 h-4 text-white" />
              </span>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  {section.title}
                </h2>
                {section.subtitle && (
                  <p className="text-xs text-neutral-400 mt-0.5">{section.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() =>
                  setMainIdx((i) => (i - 1 + videoPool.length) % Math.max(1, videoPool.length))
                }
                aria-label="Previous video dispatch"
                className="p-2 rounded bg-white/5 hover:bg-white/15 border border-white/10 cursor-pointer"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 tabular-nums text-neutral-300">
                0{(mainIdx % videoPool.length) + 1} / 0{videoPool.length}
              </span>
              <button
                type="button"
                onClick={() => setMainIdx((i) => (i + 1) % Math.max(1, videoPool.length))}
                aria-label="Next video dispatch"
                className="p-2 rounded bg-white/5 hover:bg-white/15 border border-white/10 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 65% Main Auto-Playing Video Area + Two 15% Supporting Video Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,65fr)_minmax(0,15fr)_minmax(0,15fr)] gap-4 items-stretch">
            {/* 65% Main Auto-Playing Video Viewport */}
            <div className="relative rounded-lg overflow-hidden bg-black border border-white/15 min-h-[340px] sm:min-h-[420px] flex flex-col justify-between shadow-2xl group">
              {mainVideo.videoUrl ? (
                <video
                  ref={videoRef}
                  src={mainVideo.videoUrl}
                  poster={mainVideo.imageUrl}
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-85"
                />
              ) : (
                <motion.img
                  key={mainVideo.id}
                  src={mainVideo.imageUrl}
                  alt={mainVideo.title}
                  referrerPolicy="no-referrer"
                  initial={{ scale: 1.0, opacity: 0.65 }}
                  animate={isPlaying ? { scale: 1.09, opacity: 0.85 } : { scale: 1.03, opacity: 0.78 }}
                  transition={{ duration: 15, ease: 'linear' }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/30 pointer-events-none" />

              {/* Top Overlay Controls */}
              <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono">
                  <span className="text-[#E1262D] font-bold uppercase">Auto-Play Desk</span>
                  <span className="text-white/40">·</span>
                  <span className="text-neutral-200">{mainVideo.category}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="w-9 h-9 rounded-full bg-black/65 hover:bg-[#E1262D] border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'Unmute broadcast' : 'Mute broadcast'}
                    className="w-9 h-9 rounded-full bg-black/65 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
                  </button>
                </div>
              </div>

              {/* Bottom Broadcast Headline & Progress Scrub */}
              <div className="relative z-10 p-5 sm:p-6 space-y-3">
                <button
                  type="button"
                  onClick={() => openArticle(mainVideo)}
                  className="text-left group/title cursor-pointer block"
                >
                  <h3 className="font-display text-xl sm:text-3xl font-extrabold leading-tight text-white group-hover/title:text-amber-200 transition-colors">
                    {mainVideo.title}
                  </h3>
                </button>
                <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2 max-w-2xl">
                  {mainVideo.excerpt}
                </p>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-neutral-400">
                    {mainVideo.sourceName || mainVideo.authorName} · {mainVideo.locationName || 'Dhaka Desk'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openArticle(mainVideo)}
                    className="inline-flex items-center gap-1 font-bold text-white hover:text-[#E1262D] transition-colors cursor-pointer"
                  >
                    <span>Open Full Coverage</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, progressPct)}%`, backgroundColor: primaryColor }}
                    className="h-full transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* 15% Supporting Video Section 1 */}
            {renderSupportingSlot(supportOne, 1, 'Up Next')}

            {/* 15% Supporting Video Section 2 */}
            {renderSupportingSlot(supportTwo, 2, 'Watch Desk')}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Audio News: Listen to News, Audio Playback, Playlists & Controls
 */
export function AudioNewsSection({ section, editBar }: SectionProps) {
  const { publishedArticles, openArticle, pushToast, siteSettings } = useNewspaper();
  const primaryColor = siteSettings.primaryColor || '#E1262D';

  const playlist = useMemo(() => {
    const withAudio = publishedArticles.filter((a) => Boolean(a.audioUrl));
    const others = publishedArticles.filter((a) => !a.audioUrl);
    return [...withAudio, ...others].slice(0, Math.max(4, section.itemCount || 6));
  }, [publishedArticles, section.itemCount]);

  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<0.85 | 1 | 1.25>(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = playlist[trackIdx % Math.max(1, playlist.length)];
  const estimatedDurationSec = Math.max(45, (currentTrack?.readMinutes || 3) * 35);

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Track elapsed progress timer when playing
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setElapsedSec((s) => (s + 1 >= estimatedDurationSec ? 0 : s + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, estimatedDurationSec]);

  const startTrackPlayback = (targetIdx: number, rate = playbackRate) => {
    const item = playlist[targetIdx % Math.max(1, playlist.length)];
    if (!item) return;

    stopSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setTrackIdx(targetIdx);
    setElapsedSec(0);
    setIsPlaying(true);

    if (item.audioUrl && audioRef.current) {
      audioRef.current.src = item.audioUrl;
      audioRef.current.playbackRate = rate;
      void audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const spokenText = `${item.category} Briefing. ${item.title}. ${item.excerpt}`;
      const utter = new SpeechSynthesisUtterance(spokenText);
      utter.rate = rate;
      utter.onend = () => {
        const nextIdx = (targetIdx + 1) % Math.max(1, playlist.length);
        startTrackPlayback(nextIdx, rate);
      };
      utter.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
    } else {
      pushToast('Audio Notice', 'Voice synthesis is unavailable in this browser.');
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopSpeech();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      startTrackPlayback(trackIdx);
    }
  };

  const cycleRate = () => {
    const nextRate: 0.85 | 1 | 1.25 = playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 0.85 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
    if (isPlaying && !currentTrack?.audioUrl) {
      startTrackPlayback(trackIdx, nextRate);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (playlist.length === 0 || !currentTrack) return null;

  return (
    <div>
      {editBar}
      <section id="section-audio-news" aria-label={section.title} className="max-w-7xl mx-auto px-4 sm:px-6">
        <audio
          ref={audioRef}
          onEnded={() => startTrackPlayback((trackIdx + 1) % playlist.length)}
          className="hidden"
        />

        <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-lg grid grid-cols-1 lg:grid-cols-12">
          {/* Left Studio Console (7 Cols) */}
          <div className="lg:col-span-7 relative p-6 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#131C31] to-[#0B0F17] text-white flex flex-col justify-between gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-300">
                <Headphones className="w-4 h-4 text-[#E1262D]" />
                <span>Listen to News · Audio Dispatch</span>
              </div>

              {/* Animated Equalizer Spectrum */}
              <div className="flex items-end gap-1 h-5" aria-hidden="true">
                {[0.55, 0.9, 0.45, 1, 0.65, 0.85, 0.5].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${Math.round(h * 18)}px`,
                      animationDelay: `${i * 110}ms`,
                      backgroundColor: isPlaying ? primaryColor : 'rgba(255,255,255,0.25)',
                    }}
                    className={`w-1 rounded-full ${isPlaying ? 'binduz-eq-bar' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <img
                src={currentTrack.imageUrl}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover border border-white/15 shrink-0 shadow-md"
              />
              <div className="min-w-0 space-y-1.5">
                <div className="text-[11px] font-mono uppercase text-sky-300 font-bold">
                  {currentTrack.category} · {currentTrack.sourceName || currentTrack.authorName}
                </div>
                <button
                  type="button"
                  onClick={() => openArticle(currentTrack)}
                  className="text-left hover:text-amber-200 transition-colors cursor-pointer"
                >
                  <h2 className="font-display text-xl sm:text-2xl font-bold leading-snug line-clamp-2">
                    {currentTrack.title}
                  </h2>
                </button>
                <p className="text-xs text-neutral-300 line-clamp-2">{currentTrack.excerpt}</p>
              </div>
            </div>

            {/* Playback Progress & Studio Controls */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                <span className="tabular-nums">{formatTime(elapsedSec)}</span>
                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, (elapsedSec / estimatedDurationSec) * 100)}%`,
                      backgroundColor: primaryColor,
                    }}
                    className="h-full transition-all duration-300"
                  />
                </div>
                <span className="tabular-nums">{formatTime(estimatedDurationSec)}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      startTrackPlayback((trackIdx - 1 + playlist.length) % playlist.length)
                    }
                    aria-label="Previous audio story"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause audio news' : 'Listen to news story'}
                    style={{ backgroundColor: primaryColor }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs shadow-lg hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>{isPlaying ? 'Pause Briefing' : 'Listen Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startTrackPlayback((trackIdx + 1) % playlist.length)}
                    aria-label="Next audio story"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cycleRate}
                    className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 font-mono text-xs font-bold cursor-pointer"
                    title="Change narration speed"
                  >
                    {playbackRate}x Speed
                  </button>
                  <button
                    type="button"
                    onClick={() => openArticle(currentTrack)}
                    className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 text-xs font-semibold cursor-pointer"
                  >
                    Read Text
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Playlist Queue (5 Cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-neutral-50/80 dark:bg-neutral-900">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#0D47FF]" />
                <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
                  {section.title} Playlist
                </h3>
              </div>
              <span className="font-mono text-[11px] text-neutral-500">
                {playlist.length} Bulletins
              </span>
            </div>

            <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800 max-h-[300px] overflow-y-auto pr-1">
              {playlist.map((track, idx) => {
                const active = idx === trackIdx % playlist.length;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => startTrackPlayback(idx)}
                    className={`w-full py-2.5 px-2.5 rounded text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#E1262D]/10 dark:bg-[#E1262D]/15'
                        : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <span
                      style={active ? { backgroundColor: primaryColor } : undefined}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-mono font-bold ${
                        active
                          ? 'text-white'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {active && isPlaying ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3 ml-0.5" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase text-neutral-500 dark:text-neutral-400">
                        <span className="text-[#0D47FF] dark:text-sky-400 font-bold">
                          {track.category}
                        </span>{' '}
                        · {track.readMinutes || 3} min
                      </div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1 mt-0.5">
                        {track.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

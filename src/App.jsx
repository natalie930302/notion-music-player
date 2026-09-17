import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Heart, Repeat, List, X } from "lucide-react";
import "@fontsource/vt323";

const STARS = Array.from({ length: 65 }, (_, i) => {
  const h = ((i + 1) * 2654435761) >>> 0;
  const h2 = (h ^ (h >>> 13)) >>> 0;
  const isSparkle = i % 3 === 0;
  return {
    id: i,
    x: 2 + (h % 95),
    y: 2 + (h2 % 95),
    size: isSparkle ? 7 + ((h >>> 4) % 7) : ((h2 >>> 8) % 2) * 0.5 + 0.6,
    op: isSparkle ? ((h >>> 16) % 4) * 0.1 + 0.45 : ((h2 >>> 8) % 5) * 0.06 + 0.18,
    dur: isSparkle ? 2.4 + ((h >>> 20) % 5) * 0.5 : 3.0 + ((h >>> 20) % 6) * 0.4,
    delay: ((h >>> 24) % 14) * 0.22,
    isSparkle,
  };
});

const VINYL_BG = `repeating-radial-gradient(circle,#1a1a1a 0px,#1a1a1a 1.1px,#0d0d0d 1.1px,#0d0d0d 2.5px,#181818 2.5px,#181818 3.7px,#111 3.7px,#111 4.9px)`;
const CARD_BG =
  "linear-gradient(180deg,#06091e 0%,#0c0c38 30%,#130c42 58%,#1a0d3a 80%,#1e0c28 100%)";
const CARD_SHADOW = "0 32px 80px rgba(0,0,0,0.98),0 0 0 1px rgba(255,255,255,0.05)";
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")";

/* ── Star (inline transform only — safe inside preserve-3d hierarchy) ── */
function Star({ s }) {
  const style = {
    left: `${s.x}%`,
    top: `${s.y}%`,
    "--op": s.op,
    "--dur": `${s.dur}s`,
    "--delay": `${s.delay}s`,
    opacity: s.op,
    transform: "translate(-50%,-50%)",
    zIndex: 4,
  };
  if (s.isSparkle)
    return (
      <div className="star-twinkle absolute pointer-events-none" style={style}>
        <svg viewBox="0 0 10 10" width={s.size} height={s.size}>
          <path
            d="M5,0 L5.7,4.3 L10,5 L5.7,5.7 L5,10 L4.3,5.7 L0,5 L4.3,4.3 Z"
            fill="#fff"
            opacity={s.op}
          />
        </svg>
      </div>
    );
  return (
    <div
      className="star-twinkle absolute rounded-full pointer-events-none"
      style={{ ...style, width: `${s.size}px`, height: `${s.size}px`, background: "#fff" }}
    />
  );
}

export default function AestheticMusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [glitch, setGlitch] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [coverLoadedUrl, setCoverLoadedUrl] = useState(null);
  const audioRef = useRef(null);
  const rippleRef = useRef(0);
  const vinylRotation = useMotionValue(0);
  const shimmerRotation = useMotionValue(0);
  const spinSpeedRef = useRef(0);
  const isPlayingRef = useRef(false);

  const fetchMusic = useCallback(async () => {
    try {
      const res = await fetch(`/api/get-songs?t=${Date.now()}`);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setSongs(data);
      else throw new Error("No data");
    } catch (err) {
      console.warn("Fallback:", err.message);
      setSongs([
        {
          title: "MIDNIGHT CITY\nVINTAGE DREAMS",
          artist: "SYNTH WAVE COLLECTIVE",
          coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
          mp3Url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          lyrics: [
            { time: 0,  text: "neon lights fade into the dark" },
            { time: 6,  text: "wandering through midnight rain" },
            { time: 12, text: "echoes of a vintage dream" },
            { time: 18, text: "nothing here is what it seems" },
            { time: 24, text: "dancing on electric streets" },
            { time: 30, text: "heartbeat synced to distant beats" },
            { time: 36, text: "the city breathes in shades of blue" },
            { time: 42, text: "every moment feels brand new" },
            { time: 48, text: "midnight city calling your name" },
            { time: 54, text: "nothing will ever be the same" },
            { time: 60, text: "neon lights fade into the dark" },
          ],
        },
        {
          title: "STARDUST REFLECTION\nSPACE ODDITY",
          artist: "COSMIC SOUNDS",
          coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80",
          mp3Url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          lyrics: [
            { time: 0,  text: "floating through a cosmic sea" },
            { time: 6,  text: "stardust is all we'll ever be" },
            { time: 12, text: "reflections in a distant star" },
            { time: 18, text: "wondering where we really are" },
            { time: 24, text: "gravity begins to fade" },
            { time: 30, text: "light years from the life we made" },
            { time: 36, text: "silence wraps around the soul" },
            { time: 42, text: "space is where we feel most whole" },
            { time: 48, text: "floating through a cosmic sea" },
          ],
        },
        {
          title: "NEON DESERT\nNIGHT DRIVE",
          artist: "RETRO FUTURIST",
          coverUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
          mp3Url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
          lyrics: [
            { time: 0,  text: "headlights on an empty road" },
            { time: 6,  text: "carrying a heavy load" },
            { time: 12, text: "neon signs burn through the haze" },
            { time: 18, text: "lost inside a retro daze" },
            { time: 24, text: "desert winds and synthesized" },
            { time: 30, text: "futures we have memorized" },
            { time: 36, text: "night drive never seems to end" },
            { time: 42, text: "every turn is every bend" },
            { time: 48, text: "headlights on an empty road" },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMusic();
  }, [fetchMusic]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  /* RAF vinyl spin */
  useEffect(() => {
    const TARGET = 360 / 8,
      ACCEL = TARGET / 1.4,
      DECEL = TARGET / 1.0;
    let last = null,
      rafId;
    const tick = (now) => {
      if (last === null) {
        last = now;
        rafId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (isPlayingRef.current)
        spinSpeedRef.current = Math.min(spinSpeedRef.current + ACCEL * dt, TARGET);
      else spinSpeedRef.current = Math.max(spinSpeedRef.current - DECEL * dt, 0);
      if (spinSpeedRef.current > 0.01) {
        vinylRotation.set(vinylRotation.get() + spinSpeedRef.current * dt);
        shimmerRotation.set(shimmerRotation.get() + spinSpeedRef.current * 2 * dt);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 420);
  };

  useEffect(() => {
    if (!audioRef.current || !songs.length) return;
    audioRef.current.load();
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
  }, [currentIndex, songs]);

  const currentSong = songs[currentIndex];
  const coverLoaded = coverLoadedUrl === currentSong?.coverUrl;

  useEffect(() => { setCurrentLyricIndex(-1); }, [currentIndex]);

  useEffect(() => {
    const lyrics = currentSong?.lyrics;
    if (!lyrics?.length) { setCurrentLyricIndex(-1); return; }
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) idx = i;
      else break;
    }
    setCurrentLyricIndex(idx);
  }, [currentTime, currentSong]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handlePlayClick = () => {
    const id = ++rippleRef.current;
    setRipples((p) => [...p, id]);
    setTimeout(() => setRipples((p) => p.filter((r) => r !== id)), 750);
    togglePlay();
  };

  const handleNext = useCallback(() => {
    if (!songs.length) return;
    triggerGlitch();
    if (isShuffle) {
      let next;
      do {
        next = Math.floor(Math.random() * songs.length);
      } while (next === currentIndex && songs.length > 1);
      setCurrentIndex(next);
    } else setCurrentIndex((p) => (p + 1) % songs.length);
  }, [songs.length, isShuffle, currentIndex]);

  const handlePrev = () => {
    if (!songs.length) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      triggerGlitch();
      setCurrentIndex((p) => (p - 1 + songs.length) % songs.length);
    }
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else handleNext();
  };

  const handleSeek = (e) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const fmt = (t) =>
    !t || isNaN(t)
      ? "0:00"
      : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ── Loading screen ── */
  if (isLoading) {
    return (
      <div className="h-dvh bg-[#050505] flex flex-col items-center justify-center gap-5">
        <div
          className="animate-vinyl w-[68px] h-[68px] rounded-full relative"
          style={{ background: VINYL_BG, boxShadow: "0 0 30px rgba(0,0,0,0.8)" }}>
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: "44%",
              height: "44%",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "radial-gradient(circle at 50% 50%,#e05c30 0%,#b83918 70%)",
            }}>
            <div className="w-[22%] h-[22%] rounded-full bg-black/60" />
          </div>
        </div>
        <p className="font-vt323 text-[1.1rem] tracking-[0.35em] text-[rgba(245,230,211,0.4)]">
          LOADING...
        </p>
      </div>
    );
  }

  return (
    /* Outer shell — px-4 py-6 gives the card maximum breathing room while still showing
       the deep space background at the edges.  h-dvh fills the true visual viewport. */
    <div className="h-dvh bg-[#050505] flex items-center justify-center overflow-hidden px-4 py-6">
      {/* Ambient colour bleed from album art — fixed, outside 3-D context */}
      <AnimatePresence mode="wait">
        <motion.img
          key={currentSong?.coverUrl}
          src={currentSong?.coverUrl}
          className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ filter: "blur(140px)", transform: "scale(1.7)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.2 }}
          alt=""
        />
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={currentSong?.mp3Url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleEnded}
      />

      {/* ── Perspective wrapper — h-full of the padded container ── */}
      <div className="relative z-10 w-full max-w-[390px] h-full" style={{ perspective: "1400px" }}>
        <motion.div
          className="w-full h-full relative"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 52, damping: 20 }}
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            willChange: "transform",
          }}>
          {/* ══════════════════════════ FRONT FACE ══════════════════════════
              Two-div iOS-safe pattern:
              • outer div  → backface-visibility ONLY, no overflow
              • inner div  → visual styling + overflow-hidden                */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(0.1px)",
              pointerEvents: isFlipped ? "none" : "auto",
            }}>
            <div
              className="absolute inset-0 rounded-[2.5rem] overflow-hidden"
              style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}>
              {glitch && <div className="glitch-overlay" />}
              <div className="card-grain" />

              {/* In-card colour bleed — backface props prevent iOS Safari leak */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentSong?.coverUrl}
                  src={currentSong?.coverUrl}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  style={{
                    filter: "blur(80px)",
                    transform: "scale(1.6)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.18 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8 }}
                  alt=""
                />
              </AnimatePresence>

              {/* Warm horizon glow */}
              <div
                className="absolute left-0 right-0 bottom-0 pointer-events-none h-[40%] z-[2]"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 100%,rgba(180,55,18,0.3) 0%,rgba(120,30,8,0.12) 45%,transparent 70%)",
                }}
              />

              {/* Radial vignette */}
              <div
                className="absolute inset-0 pointer-events-none z-[3]"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 36%,transparent 22%,rgba(6,9,30,0.65) 78%,rgba(6,9,30,0.92) 100%)",
                }}
              />

              {/* Stars */}
              {STARS.map((s) => (
                <Star key={s.id} s={s} />
              ))}

              {/* Bottom dark gradient */}
              <div
                className="absolute left-0 right-0 bottom-0 h-[55%] pointer-events-none z-[8]"
                style={{ background: "linear-gradient(to bottom,transparent 0%,rgba(6,9,30,0.9) 32%,#060918 58%)" }}
              />

              {/* ── Main layout: 4 sections ── */}
              <div className="absolute inset-0 flex flex-col justify-between px-7 py-7 z-20">

                {/* 1. Status bar */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-vt323 text-[11px] tracking-[0.3em] text-[rgba(245,230,211,0.26)]">NOW PLAYING</div>
                    <div className="font-vt323 text-[14px] tracking-[0.15em] text-[rgba(245,230,211,0.48)]">
                      {String(currentIndex + 1).padStart(2, "0")} / {String(songs.length).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Heart size={13} className="neon-heart" fill="#ff2d78" stroke="none" />
                    <motion.button
                      onClick={() => setIsFlipped(true)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.84 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="flex items-center justify-center rounded-full w-[34px] h-[34px] bg-[rgba(245,230,211,0.06)] border border-[rgba(245,230,211,0.11)] text-[rgba(245,230,211,0.48)]"
                      aria-label="Show playlist">
                      <List size={14} />
                    </motion.button>
                  </div>
                </div>

                {/* 2. Vinyl + Cover */}
                <div className="flex items-center justify-center">
                  <div className="relative w-[290px] h-[262px]">
                  {/* Vinyl — slides right on play */}
                  <motion.div
                    className="absolute inset-0 m-auto rounded-2xl"
                    style={{ width: "232px", height: "232px", zIndex: 1 }}
                    animate={{ x: isPlaying ? 80 : 0 }}
                    transition={{ type: "spring", stiffness: 32, damping: 11 }}>
                    <motion.div
                      className="w-full h-full rounded-full relative"
                      style={{
                        rotate: vinylRotation,
                        background: VINYL_BG,
                        boxShadow:
                          "0 20px 70px rgba(0,0,0,0.98),0 0 0 1.5px rgba(255,255,255,0.04)",
                      }}>
                      {/* Groove shimmer */}
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          rotate: shimmerRotation,
                          background:
                            "conic-gradient(from 0deg,transparent 0%,rgba(255,255,255,0.07) 6%,transparent 14%,rgba(255,255,255,0.04) 32%,transparent 42%,rgba(255,255,255,0.07) 58%,transparent 68%,rgba(255,255,255,0.05) 82%,transparent 92%,transparent 100%)",
                        }}
                      />
                      {/* Surface sheen */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(ellipse at 32% 28%,rgba(255,255,255,0.07) 0%,transparent 50%),radial-gradient(ellipse at 70% 74%,rgba(255,255,255,0.03) 0%,transparent 38%)",
                        }}
                      />
                      {/* Edge rim */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          boxShadow:
                            "inset 0 0 0 2px rgba(255,255,255,0.04),inset 0 0 10px rgba(0,0,0,0.55)",
                        }}
                      />
                      {/* Grain on vinyl */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none opacity-[0.18] mix-blend-soft-light"
                        style={{ backgroundImage: GRAIN_URI, backgroundSize: "128px 128px" }}
                      />
                      {/* Centre label — inline transform (iOS preserve-3d safe) */}
                      <div
                        className="absolute rounded-full flex flex-col items-center justify-center"
                        style={{
                          width: "44%",
                          height: "44%",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                          background:
                            "radial-gradient(circle at 44% 36%,#ea7248 0%,#c13d1c 46%,#8e1e08 80%,#6c1206 100%)",
                          boxShadow:
                            "0 0 0 2px rgba(255,255,255,0.055),0 0 0 3.5px rgba(0,0,0,0.45),inset 0 2px 8px rgba(0,0,0,0.45),0 4px 14px rgba(0,0,0,0.85)",
                        }}>
                        <span className="font-vt323 text-[6px] text-[rgba(255,240,210,0.6)] tracking-[0.22em] leading-none mb-[3px]">
                          SIDE A
                        </span>
                        <div
                          className="rounded-full"
                          style={{
                            width: "19%",
                            height: "19%",
                            background: "radial-gradient(circle at 38% 35%,#1e1e1e,#070707)",
                            boxShadow:
                              "0 0 0 1.5px rgba(255,255,255,0.07),inset 0 1px 3px rgba(255,255,255,0.06)",
                          }}
                        />
                        <span className="font-vt323 text-[5px] text-[rgba(255,240,210,0.3)] tracking-[0.14em] leading-none mt-[3px]">
                          33⅓ RPM
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Cover — larger than vinyl; slides left on play.
                      Two-div pattern: outer handles x/scale animation only (no overflow),
                      inner handles visual clipping — prevents rounded-corner dropout
                      when GPU composites the transform layer. */}
                  <motion.div
                    className="absolute inset-0 m-auto rounded-2xl"
                    style={{
                      width: "235px",
                      height: "235px",
                      zIndex: 2,
                      boxShadow: "0 18px 60px rgba(0,0,0,0.95),5px 0 26px rgba(0,0,0,0.6)",
                    }}
                    animate={{ x: isPlaying ? -72 : 0, scale: isPlaying ? 0.94 : 1 }}
                    transition={{ type: "spring", stiffness: 32, damping: 11 }}>
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <AnimatePresence>
                        {!coverLoaded && (
                          <motion.div
                            className="absolute inset-0 skeleton-shimmer"
                            key="skeleton"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.4 } }}
                          />
                        )}
                      </AnimatePresence>
                      <AnimatePresence mode="sync">
                        <motion.img
                          key={currentSong?.coverUrl}
                          src={currentSong?.coverUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          onLoad={() => setCoverLoadedUrl(currentSong?.coverUrl)}
                          initial={{ opacity: 0, scale: 1.06 }}
                          animate={{ opacity: coverLoaded ? 1 : 0, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          alt="Album Cover"
                        />
                      </AnimatePresence>
                      {/* Cover shine */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(135deg,rgba(255,255,255,0.09) 0%,transparent 42%,rgba(0,0,0,0.28) 100%)",
                        }}
                      />
                      {/* Grain on cover */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.2] mix-blend-soft-light"
                        style={{ backgroundImage: GRAIN_URI, backgroundSize: "160px 160px" }}
                      />
                    </div>
                  </motion.div>
                </div>
              </div>

                {/* ── Section 3: Lyrics scroller ── */}
                <div
                  className="w-full relative overflow-hidden"
                  style={{
                    height: "60px",
                    maskImage: "linear-gradient(to bottom,transparent 0%,black 28%,black 72%,transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom,transparent 0%,black 28%,black 72%,transparent 100%)",
                  }}>
                  {currentSong?.lyrics?.length > 0 ? (
                    <motion.div
                      animate={{ y: 30 - Math.max(currentLyricIndex, 0) * 20 }}
                      transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}>
                      {currentSong.lyrics.map((line, i) => (
                        <div
                          key={i}
                          className="font-vt323 text-center text-[0.88rem] tracking-[0.12em]"
                          style={{
                            height: "20px",
                            lineHeight: "20px",
                            color:
                              i === currentLyricIndex
                                ? "rgba(245,230,211,0.92)"
                                : Math.abs(i - currentLyricIndex) === 1
                                ? "rgba(245,230,211,0.35)"
                                : "rgba(245,230,211,0.12)",
                            transition: "color 0.5s",
                          }}>
                          {line.text}
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div
                      className="font-vt323 text-center text-[0.82rem] tracking-[0.25em] text-[rgba(245,230,211,0.18)]"
                      style={{ lineHeight: "60px" }}>
                      ♪ &nbsp; ♪ &nbsp; ♪
                    </div>
                  )}
                </div>

                {/* ── Section 4: Controls ── */}
                <div>
                {/* Song title + artist */}
                <div className="mb-4 text-center">
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={currentSong?.title}
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
                      transition={{ duration: 0.28 }}
                      className="font-sans font-extrabold text-[1.44rem] leading-[1.18] tracking-[-0.02em] text-[rgba(245,230,211,0.95)] m-0 text-center">
                      {currentSong?.title?.replace(/\n/g, " · ")}
                    </motion.h2>
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentSong?.artist}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="font-vt323 text-[1.05rem] tracking-[0.2em] text-[#e8734a] mt-2 text-center">
                      {currentSong?.artist?.toUpperCase()}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="relative w-full rounded-full h-[4px] bg-[rgba(245,230,211,0.1)]">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg,#c87040,#e8964e)",
                        transition: "width 0.1s linear",
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                      style={{ height: "28px", top: "50%", transform: "translateY(-50%)" }}
                      aria-label="Seek"
                    />
                    <div
                      className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-[#e8734a]"
                      style={{
                        left: `calc(${pct}% - 7px)`,
                        transform: "translateY(-50%)",
                        boxShadow: isPlaying
                          ? "0 0 10px rgba(232,115,74,0.9),0 0 22px rgba(232,115,74,0.4)"
                          : "0 0 6px rgba(232,115,74,0.55)",
                        transition: "box-shadow 0.4s",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 font-vt323 text-[14px] tracking-[0.12em] text-[rgba(245,230,211,0.28)]">
                    <span>{fmt(currentTime)}</span>
                    <span>{fmt(duration)}</span>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between">
                  <motion.button
                    onClick={() => setIsShuffle((v) => !v)}
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.78, rotate: 20 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    style={{ color: isShuffle ? "#e8734a" : "rgba(245,230,211,0.22)" }}
                    aria-label="Shuffle">
                    <Shuffle size={16} />
                  </motion.button>

                  <motion.button
                    onClick={handlePrev}
                    whileHover={{ scale: 1.14 }}
                    whileTap={{ scale: 0.82, x: -4 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    className="text-[rgba(245,230,211,0.7)]"
                    aria-label="Previous">
                    <SkipBack size={23} fill="currentColor" />
                  </motion.button>

                  {/* Play / Pause */}
                  <div className="relative flex-shrink-0">
                    <AnimatePresence>
                      {ripples.map((id) => (
                        <motion.div
                          key={id}
                          className="absolute inset-0 rounded-full pointer-events-none bg-[rgba(245,230,211,0.22)]"
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 3.4, opacity: 0 }}
                          exit={{}}
                          transition={{ duration: 0.68, ease: "easeOut" }}
                        />
                      ))}
                    </AnimatePresence>
                    <AnimatePresence>
                      {isPlaying && (
                        <motion.div
                          key="ring"
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            inset: "-7px",
                            border: "1.5px solid transparent",
                            borderTopColor: "rgba(232,115,74,0.8)",
                            borderRightColor: "rgba(232,115,74,0.28)",
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ rotate: 360, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            rotate: { duration: 2.2, repeat: Infinity, ease: "linear" },
                            opacity: { duration: 0.3 },
                          }}
                        />
                      )}
                    </AnimatePresence>
                    <motion.button
                      onClick={handlePlayClick}
                      className="relative z-10 flex items-center justify-center rounded-full w-[58px] h-[58px] bg-[rgba(245,230,211,0.94)]"
                      style={{
                        boxShadow: isPlaying
                          ? "0 0 0 2.5px rgba(232,115,74,0.65),0 8px 32px rgba(232,115,74,0.22),0 4px 16px rgba(0,0,0,0.5)"
                          : "0 6px 24px rgba(0,0,0,0.55),0 2px 6px rgba(0,0,0,0.35)",
                      }}
                      whileHover={{ scale: 1.07 }}
                      whileTap={{ scale: 0.86 }}
                      aria-label={isPlaying ? "Pause" : "Play"}>
                      <AnimatePresence mode="wait">
                        {isPlaying ? (
                          <motion.div
                            key="pause"
                            initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 15 }}
                            transition={{ duration: 0.18 }}>
                            <Pause size={21} fill="#0d0d0d" stroke="none" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="play"
                            initial={{ scale: 0.5, opacity: 0, rotate: 15 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: -15 }}
                            transition={{ duration: 0.18 }}>
                            <Play size={21} fill="#0d0d0d" stroke="none" className="ml-[2px]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>

                  <motion.button
                    onClick={handleNext}
                    whileHover={{ scale: 1.14 }}
                    whileTap={{ scale: 0.82, x: 4 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    className="text-[rgba(245,230,211,0.7)]"
                    aria-label="Next">
                    <SkipForward size={23} fill="currentColor" />
                  </motion.button>

                  <motion.button
                    onClick={() => setIsRepeat((v) => !v)}
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.78, rotate: -20 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    style={{ color: isRepeat ? "#e8734a" : "rgba(245,230,211,0.22)" }}
                    aria-label="Repeat">
                    <Repeat size={16} />
                  </motion.button>
                </div>

                {/* Home indicator */}
                <div className="flex justify-center mt-4">
                  <div className="rounded-full w-[38px] h-[3px] bg-[rgba(245,230,211,0.12)]" />
                </div>
                </div>{/* end Section 4 */}
              </div>{/* end flex layout */}
            </div>
          </div>

          {/* ════════════════════════ BACK FACE — Playlist ════════════════════════ */}
          <div
            className="absolute inset-0"
            style={{
              transform: "rotateY(180deg) translateZ(0.1px)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}>
            <div
              className="absolute inset-0 rounded-[2.5rem] overflow-hidden flex flex-col"
              style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}>
              <div className="card-grain" />

              {/* Back-face stars — inline transform only (iOS-safe) */}
              {STARS.slice(0, 40).map((s) => (
                <div
                  key={s.id}
                  className={`star-twinkle absolute ${s.isSparkle ? "" : "rounded-full"} pointer-events-none`}
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    "--op": s.op * 0.5,
                    "--dur": `${s.dur}s`,
                    "--delay": `${s.delay}s`,
                    opacity: s.op * 0.5,
                    transform: "translate(-50%,-50%)",
                    zIndex: 1,
                    ...(s.isSparkle
                      ? {}
                      : { width: `${s.size}px`, height: `${s.size}px`, background: "#fff" }),
                  }}>
                  {s.isSparkle && (
                    <svg viewBox="0 0 10 10" width={s.size * 0.72} height={s.size * 0.72}>
                      <path
                        d="M5,0 L5.7,4.3 L10,5 L5.7,5.7 L5,10 L4.3,5.7 L0,5 L4.3,4.3 Z"
                        fill="#fff"
                        opacity={s.op * 0.5}
                      />
                    </svg>
                  )}
                </div>
              ))}

              {/* Vignette */}
              <div
                className="absolute inset-0 pointer-events-none z-[2]"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 20%,transparent 28%,rgba(6,9,30,0.6) 100%)",
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between px-7 pt-7 pb-5 relative z-10">
                <div>
                  <div className="font-vt323 text-[11px] tracking-[0.3em] text-[rgba(245,230,211,0.26)]">
                    SELECT TRACK
                  </div>
                  <div className="font-sans text-[1.15rem] font-extrabold text-[rgba(245,230,211,0.92)] tracking-[-0.01em]">
                    PLAYLIST
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsFlipped(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex items-center justify-center rounded-full w-[36px] h-[36px] bg-[rgba(245,230,211,0.07)] border border-[rgba(245,230,211,0.12)] text-[rgba(245,230,211,0.6)]"
                  aria-label="Close playlist">
                  <X size={16} />
                </motion.button>
              </div>

              {/* Divider */}
              <div
                className="mx-7 mb-3 h-px relative z-10"
                style={{
                  background:
                    "linear-gradient(to right,transparent,rgba(232,115,74,0.32),transparent)",
                }}
              />

              {/* Song list */}
              <div
                className="flex-1 overflow-y-auto px-5 pb-8 relative z-10"
                style={{ scrollbarWidth: "none" }}>
                {songs.map((song, i) => (
                  <motion.button
                    key={i}
                    onClick={() => {
                      triggerGlitch();
                      setCurrentIndex(i);
                      setIsFlipped(false);
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2.5 text-left"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, type: "spring", stiffness: 280, damping: 22 }}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background:
                        i === currentIndex ? "rgba(232,115,74,0.1)" : "rgba(245,230,211,0.04)",
                      border: `1px solid ${i === currentIndex ? "rgba(232,115,74,0.28)" : "rgba(245,230,211,0.07)"}`,
                    }}>
                    <div className="flex-shrink-0 rounded-xl overflow-hidden relative w-[50px] h-[50px]">
                      <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                      {i === currentIndex && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.52)]">
                          {isPlaying ? (
                            <motion.div
                              animate={{ scale: [1, 1.25, 1] }}
                              transition={{ repeat: Infinity, duration: 0.75 }}>
                              <Pause size={15} fill="#f5e6d3" stroke="none" />
                            </motion.div>
                          ) : (
                            <Play size={15} fill="#f5e6d3" stroke="none" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="truncate font-sans font-bold text-[0.82rem] leading-[1.3]"
                        style={{
                          color:
                            i === currentIndex
                              ? "rgba(245,230,211,0.96)"
                              : "rgba(245,230,211,0.62)",
                        }}>
                        {song.title?.replace(/\n/g, " · ")}
                      </div>
                      <div
                        className="font-vt323 text-[0.78rem] tracking-[0.1em] mt-[2px]"
                        style={{ color: i === currentIndex ? "#e8734a" : "rgba(245,230,211,0.3)" }}>
                        {song.artist?.toUpperCase()}
                      </div>
                    </div>

                    <div
                      className="font-vt323 text-[0.95rem] tracking-[0.05em]"
                      style={{
                        color:
                          i === currentIndex ? "rgba(232,115,74,0.82)" : "rgba(245,230,211,0.17)",
                      }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Bottom indicator */}
              <div className="flex justify-center pb-6 relative z-10">
                <div className="rounded-full w-[38px] h-[3px] bg-[rgba(245,230,211,0.1)]" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

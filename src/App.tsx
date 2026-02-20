import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { motion } from "framer-motion";

import "./App.css";
import { story, type StoryPage, type Theme } from "./story";

export default function App() {
  const pages = useMemo(() => story, []);
  const [activeIndex, setActiveIndex] = useState(0);

  // ===== BGM =====
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [bgmReady, setBgmReady] = useState(false);
  const [bgmOn, setBgmOn] = useState(true); // true=开声，false=静音

  const ensureBgm = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;

    if (!bgmReady) {
      a.loop = true;
      a.volume = 0.35;
      a.muted = !bgmOn;
      setBgmReady(true);
    }

    if (bgmOn) {
      try {
        await a.play();
      } catch {
        // 移动端可能会拦截；下一次用户点击再尝试即可
      }
    }
  }, [bgmOn, bgmReady]);

  const toggleBgm = useCallback(async () => {
    const a = audioRef.current;
    setBgmOn((prev) => {
      const next = !prev;
      if (a) a.muted = !next;
      return next;
    });

    // 这里用 setTimeout 拿到更新后的状态也行；简单起见直接尝试播放
    const a2 = audioRef.current;
    if (a2) {
      try {
        await a2.play();
      } catch {}
    }
  }, []);

  const theme: Theme = pages[Math.max(0, Math.min(activeIndex, pages.length - 1))].theme;

  return (
    <div className={`app theme-${theme}`}>
      {/* 全局星空 */}
      <Starfield />

      {/* 音频元素（public/audio/bgm.mp3 -> /audio/bgm.mp3） */}
      <audio ref={audioRef} src="/audio/bgm.mp3" preload="auto" />

      {/* 右上角静音按钮 */}
      <button className="bgmBtn" onClick={toggleBgm} aria-label="背景音乐开关">
        {bgmOn ? "🔈" : "🔇"}
      </button>

      <div className="phoneFrame">
        <Swiper
          direction="vertical"
          slidesPerView={1}
          className="swiper"
          onSlideChange={(s) => setActiveIndex(s.activeIndex)}
        >
          {pages.map((p) => (
            <SwiperSlide key={p.id}>
              <PageView page={p} onFirstTap={ensureBgm} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

function PageView({ page, onFirstTap }: { page: StoryPage; onFirstTap: () => void }) {
  const [burst, setBurst] = useState<{ x: number; y: number; t: number } | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRevealCount(0);
  }, [page.id]);

  const onClick = (e: React.MouseEvent) => {
    onFirstTap();

    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (revealCount < page.lines.length) setRevealCount((c) => c + 1);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBurst({ x, y, t: Date.now() });
  };

  const allRevealed = revealCount >= page.lines.length;

  return (
    <div ref={pageRef} className={`page page-${page.theme}`} onClick={onClick}>
      <div className="paper" aria-hidden="true" />

      {page.theme === "warm" && <WarmStars />}
      {page.theme === "pink" && <Petals />}
      {page.theme === "snow" && <Snow />}

      {/* 点击四芒星爆闪（不改变整页亮度） */}
      <StarBurst key={burst?.t ?? "idle"} burst={burst} />

      <motion.div
        className="content"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        {page.heading && (
          <motion.h1
            className={`heading heading-${page.kind}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {page.heading}
          </motion.h1>
        )}

        <div className="lines">
          {page.lines.slice(0, revealCount).map((line, idx) => (
            <motion.p
              key={`${page.id}-${idx}`}
              className="line"
              initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {allRevealed ? (
          <div className="hint">↑ 上滑翻页 · 点击星光闪烁</div>
        ) : (
          <div className="tapHint">点击继续</div>
        )}
      </motion.div>

      <div className="bloom" />
    </div>
  );
}

/** 全局星空：缓慢闪烁 */
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const stars = Array.from({ length: 90 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.2,
      a: 0.10 + Math.random() * 0.35,
      tw: 0.004 + Math.random() * 0.012,
      p: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = "100%";
      c.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of stars) {
        s.p += s.tw;
        const a = s.a + Math.sin(s.p) * 0.16;
        ctx.beginPath();
        ctx.arc(s.x * window.innerWidth, s.y * window.innerHeight, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, a)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}

/** 点击星光爆闪：四芒星 + 拖尾粒子（不改变整页亮度） */
function StarBurst({ burst }: { burst: { x: number; y: number; t: number } | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const parent = c.parentElement as HTMLElement | null;
      if (!parent) return;

      w = parent.clientWidth;
      h = parent.clientHeight;

      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      c.style.width = "100%";
      c.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    if (!burst) return () => window.removeEventListener("resize", resize);

    const center = { x: burst.x, y: burst.y };
    const particles = Array.from({ length: 34 }).map(() => {
      const ang = Math.random() * Math.PI * 2;
      const sp = 0.9 + Math.random() * 3.4;
      return {
        x: center.x,
        y: center.y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 30 + Math.floor(Math.random() * 20),
        r: 0.7 + Math.random() * 1.6,
      };
    });

    let raf = 0;

    const drawStar = (x: number, y: number, s: number, a: number) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineCap = "round";

      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.8);
      ctx.lineTo(x, y + s * 1.8);
      ctx.stroke();

      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.4, y);
      ctx.lineTo(x + s * 1.4, y);
      ctx.stroke();

      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2);
      g.addColorStop(0, `rgba(255,255,255,${0.18 * a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, s * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, s * 0.55), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const draw = () => {
      // ✅ 不改变整页亮度：每帧清空，不做黑色淡出层
      ctx.clearRect(0, 0, w, h);

      drawStar(center.x, center.y, 6.0, 0.75);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= 1;

        const a = Math.max(0, Math.min(1, p.life / 50));

        ctx.strokeStyle = `rgba(255,255,255,${0.45 * a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
        ctx.stroke();

        ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      if (particles.length > 0) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [burst?.t]);

  return <canvas ref={canvasRef} className="burst" aria-hidden="true" />;
}

/** warm：四芒小星形飘落（Canvas） */
function WarmStars() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const parent = c.parentElement as HTMLElement | null;
      if (!parent) return;

      w = parent.clientWidth;
      h = parent.clientHeight;

      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      c.style.width = "100%";
      c.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    // ✅ 注意：stars 在 resize 之后生成，w/h 才不是 0
    const stars = Array.from({ length: 26 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      s: 2.2 + Math.random() * 2.6,
      vy: 0.25 + Math.random() * 0.55,
      drift: -0.15 + Math.random() * 0.3,
      tw: 0.02 + Math.random() * 0.05,
      p: Math.random() * Math.PI * 2,
      a: 0.35 + Math.random() * 0.45,
    }));

    const drawFourPointStar = (x: number, y: number, s: number, a: number) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineCap = "round";

      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4.2);
      g.addColorStop(0, "rgba(255,220,150,0.20)");
      g.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, s * 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,245,220,1)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.2);
      ctx.lineTo(x, y + s * 2.2);
      ctx.stroke();

      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.8, y);
      ctx.lineTo(x + s * 1.8, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,250,240,0.92)";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.9, s * 0.55), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // ✅ 关键：先声明 tick，再调用 tick
    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.p += s.tw;
        const alpha = s.a + Math.sin(s.p) * 0.18;

        s.y += s.vy;
        s.x += s.drift;

        if (s.y > h + 30) {
          s.y = -20;
          s.x = Math.random() * w;
        }
        if (s.x < -30) s.x = w + 30;
        if (s.x > w + 30) s.x = -30;

        drawFourPointStar(s.x, s.y, s.s, Math.max(0, Math.min(1, alpha)));
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("resize", resize);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="warmStars" aria-hidden="true" />;
}

/** 雪夜飘雪 */
function Snow() {
  return (
    <>
      <div className="snow snow-1" aria-hidden="true" />
      <div className="snow snow-2" aria-hidden="true" />
      <div className="snow snow-3" aria-hidden="true" />
    </>
  );
}

/** 粉色花瓣 */
function Petals() {
  return (
    <>
      <div className="petals petals-1" aria-hidden="true" />
      <div className="petals petals-2" aria-hidden="true" />
    </>
  );
}

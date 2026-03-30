"use client";

import { type MouseEvent, type ReactNode, useCallback, useRef, useState } from "react";

const HOVER_BLUR_SIZE = 350;
const HOVER_BLUR_HALF = HOVER_BLUR_SIZE / 2;

export function HoverBlurSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onEnter = useCallback(() => setActive(true), []);
  const onLeave = useCallback(() => setActive(false), []);

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: e.clientX - r.left - HOVER_BLUR_HALF,
      y: e.clientY - r.top - HOVER_BLUR_HALF,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 [background-size:20px_20px] [background-image:radial-gradient(#d4d4d4_1px,transparent_1px)] dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
      />
      {/* Vignette over dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[#fdf6f9] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-[#060003]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute z-[2] rounded-full bg-[#ead1f090] dark:bg-[#250714] blur-[80px] transition-opacity duration-300 ease-out"
        style={{
          width: HOVER_BLUR_SIZE,
          height: HOVER_BLUR_SIZE,
          left: pos.x,
          top: pos.y,
          opacity: active ? 1 : 0,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}


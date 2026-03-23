"use client";

import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface MovingBorderButtonProps {
  borderRadius?: string;
  children: React.ReactNode;
  as?: React.ElementType;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
  onClick?: () => void;
  href?: string;
  [key: string]: any;
}

export function MovingBorderButton({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration = 2500,
  className,
  ...otherProps
}: MovingBorderButtonProps) {
  return (
    <Component
      className={cn(
        "bg-transparent relative p-[1px] overflow-hidden group",
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 opacity-[0.9] bg-[radial-gradient(#1bffc7_40%,transparent_60%)]",
              borderClassName
            )}
          />
        </MovingBorder>
      </div>
      {/* Static border glow */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{ 
          borderRadius: `calc(${borderRadius} * 0.96)`,
          background: 'linear-gradient(90deg, #1bffc7, #14b8a6, #1bffc7)',
          backgroundSize: '200% 100%',
        }}
      />
      <div
        className={cn(
          "relative bg-black/95 backdrop-blur-xl text-white flex items-center justify-center w-full h-full antialiased group-hover:bg-black/80 transition-all duration-300 border border-[#1bffc7]/20 group-hover:border-[#1bffc7]/40",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export const MovingBorder = ({
  children,
  duration = 2500,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: any;
}) => {
  const pathRef = useRef<SVGRectElement>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    try {
      const length = pathRef.current?.getTotalLength();
      if (length) {
        const pxPerMillisecond = length / duration;
        progress.set((time * pxPerMillisecond) % length);
      }
    } catch (e) {
      // Handle case where path is empty or not yet ready
    }
  });

  const x = useTransform(progress, (val) => {
    if (!pathRef.current) return 0;
    try {
      return pathRef.current.getPointAtLength(val).x;
    } catch (e) {
      return 0;
    }
  });

  const y = useTransform(progress, (val) => {
    if (!pathRef.current) return 0;
    try {
      return pathRef.current.getPointAtLength(val).y;
    } catch (e) {
      return 0;
    }
  });

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};

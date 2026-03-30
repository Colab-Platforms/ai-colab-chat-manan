"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { type ReactNode, useRef } from "react";

import { fadeUp } from "./motionVariants";

type ScrollRevealProps = {
  children: ReactNode;
  variants?: typeof fadeUp;
  delay?: number;
  className?: string;
};

// Reusable scroll-reveal wrapper
export function ScrollReveal({
  children,
  variants = fadeUp,
  delay = 0,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      custom={delay}
      variants={variants as Variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}


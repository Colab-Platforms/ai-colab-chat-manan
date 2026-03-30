"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

import { EASE } from "./motionVariants";

export function ScrollTiltHero() {
  // Window-level scroll: always 0 at page top, so tilt is always 12deg on load
  const { scrollY } = useScroll();

  // rotateX: starts at 12deg (tilted back) → 0deg when scrolled 500px down
  const rotateX = useTransform(scrollY, [0, 500], [12, 0]);

  return (
    // perspective must be on the DIRECT parent of the rotating element
    <div
      className="flex items-center justify-center pt-20 mx-auto"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        className="bg-white p-3 max-md:p-1 rounded-xl shadow-lg w-full object-cover transform-gpu dark:brightness-90 border border-pink-800"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ rotateX }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
      >
        <Image
          src="/landing/hero-pc.png"
          alt="Hero Image"
          width={1200}
          height={1000}
          className="w-full h-full rounded-xl max-md:rounded-lg"
        />
      </motion.div>
    </div>
  );
}


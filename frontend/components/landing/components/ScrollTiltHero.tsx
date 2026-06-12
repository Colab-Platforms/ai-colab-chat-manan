"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

import { useTheme } from "@/context/theme-context";
import { EASE } from "./motionVariants";

export function ScrollTiltHero() {
  const { theme } = useTheme();

  const { scrollY } = useScroll();
  const rotateX = useTransform(scrollY, [0, 500], [12, 0]);

  const heroSrc =
    theme === "dark"
      ? "/Landing/hero-pc-dark.png"
      : "/Landing/hero-pc-light.png";

  return (
    <div
      className="flex items-center justify-center pt-20 mx-auto"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 p-3 max-md:p-1 rounded-xl shadow-lg w-full object-cover transform-gpu dark:brightness-90 border border-landing-primary"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ rotateX }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
      >
        <Image
          src={heroSrc}
          alt="Hero Image"
          width={1200}
          height={1000}
          className="w-full h-full rounded-xl max-md:rounded-lg"
        />
      </motion.div>
    </div>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

import { Button } from "../../ui/button";
import { EASE } from "./motionVariants";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 50) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  });

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-[padding] duration-300 ease-in-out ${
        isScrolled ? "pt-4 pb-2" : "py-8"
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div 
        className={`mx-auto flex h-14 flex-col justify-center transition-all duration-300 ease-in-out ${
          isScrolled 
            ? "container max-w-6xl px-6 rounded-full border border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-black/50 backdrop-blur-md shadow-sm max-md:max-w-[95%]"
            : "container px-5 bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between h-full">
          <Link href="/">
            <Image
              src="/black.webp"
              alt="Logo"
              width={100}
              height={100}
              className={`h-auto dark:hidden transition-all duration-300 ${
                isScrolled ? "w-18" : "w-[100px]"
              }`}
            />
            <Image
              src="/white.webp"
              alt="Logo"
              width={100}
              height={100}
              className={`h-auto hidden dark:block transition-all duration-300 ${
                isScrolled ? "w-18" : "w-[100px]"
              }`}
            />
          </Link>
          <div className="hidden md:flex">
            <ul className="flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
              <li>
                <Link href="#features" className="hover:text-[#861043] dark:hover:text-pink-400 transition">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#models" className="hover:text-[#861043] dark:hover:text-pink-400 transition">
                  Models
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-[#861043] dark:hover:text-pink-400 transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#testimonials" className="hover:text-[#861043] dark:hover:text-pink-400 transition">
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-[#861043] dark:hover:text-pink-400 transition">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => document.body.classList.toggle("dark")}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Theme"
            >
              <Moon className="w-5 h-5 text-gray-800 dark:hidden" />
              <Sun className="w-5 h-5 text-gray-200 hidden dark:block" />
            </button>
            <Link href="/login">
              <Button className="rounded-full bg-[#861043] hover:bg-[#530929] text-white px-6 transition-all duration-300">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}


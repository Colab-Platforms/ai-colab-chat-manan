"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TabItem {
  tabName: string;
  line: string;
  imageUrl: string;
}

const tabItems: TabItem[] = [
  {
    tabName: "Ask",
    line: "Start with a question and move faster from the first prompt.",
    imageUrl: "/new-landing/ask.png",
  },
  {
    tabName: "Compare",
    line: "Compare outputs from multiple models side by side to choose the best result.",
    imageUrl: "/new-landing/compare.png",
  },
  {
    tabName: "Customize",
    line: "Tailor AI agents, prompts, and settings to build your custom workflows.",
    imageUrl: "/new-landing/customize.png",
  },
  {
    tabName: "Decode",
    line: "Explain complex code structures, debug errors, and decode logic instantly.",
    imageUrl: "/new-landing/decode.png",
  },
];

export default function TabsShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prevIndex) =>
      prevIndex === 0 ? tabItems.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setActiveIndex((prevIndex) =>
      prevIndex === tabItems.length - 1 ? 0 : prevIndex + 1
    );
  };

  const currentTab = tabItems[activeIndex];

  return (
    <section className="py-16 md:py-24 bg-[#09090b] text-white relative overflow-hidden flex flex-col items-center">
      <div className="container max-w-7xl mx-auto px-5 sm:px-10 flex flex-col gap-5 z-10 w-full">
        
        {/* ── Top Header Section ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 w-full mb-5">
          {/* Top Left: Title & Badge */}
          <div className="flex flex-col gap-4 max-w-xl">
            {/* "Working" Badge */}
            <div className='px-6 py-2 rounded-full bg-[#292929] flex items-center justify-center gap-3 w-fit border-2 border-[#3f3f3f] mb-2'>
              <div className='w-3 h-3 bg-[#3c3b3b] rounded-full'></div>
              <p className='text-foreground'>Working</p>
            </div>
            {/* Main Headline */}
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Everything You Need In <br />
              One Platform
            </h2>
          </div>

          {/* Top Right: Description Text */}
          <div className="text-lg text-neutral-400 leading-relaxed max-w-lg">
            <p>
              ColabAI is an AI agent that turns <br className="hidden sm:inline" />
              conversation into execution, <br className="hidden sm:inline" />
              delivering clear answers in seconds.
            </p>
          </div>
        </div>

        {/* ── Tab Switcher Header Bar ── */}
        <div 
          className="hidden md:flex w-full rounded-full p-1.5 items-center justify-between border border-[#1e1e1e] overflow-x-auto scrollbar-none"
          style={{ backgroundColor: "#000000" }}
        >
          {tabItems.map((tab, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={tab.tabName}
                onClick={() => setActiveIndex(idx)}
                className="relative flex-1 py-3 px-4 rounded-full text-center text-sm font-medium tracking-wide transition-colors duration-300 outline-none select-none min-w-[90px]"
              >
                {/* Visual Pill Highlight */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-[#161616] rounded-full border border-[#2d2d2d]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? "text-white font-semibold" : "text-gray-500 hover:text-gray-300"}`}>
                  {tab.tabName}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Central Showcase Container ── */}
        <div className="w-full relative aspect-[4/3] sm:aspect-video md:aspect-[16/8] rounded-3xl overflow-hidden border border-[#2d2d2d] shadow-2xl flex items-center justify-center">
          {/* Static Outer Background Image */}
          <Image
            src="/new-landing/working-bg.jpg"
            alt="Working Background"
            fill
            priority
            sizes="100vw"
            className="object-cover select-none pointer-events-none rounded-[30px] p-3"
          />

          {/* Dynamic Mockup UI Image */}
          <div className="relative w-[90%] h-[85%] md:w-[85%] md:h-[80%] rounded-2xl overflow-hidden border border-[#2d2d2d]">
            <AnimatePresence mode="wait">
              
                <Image
                  src={currentTab.imageUrl}
                  alt={`${currentTab.tabName} Showcase`}
                  fill
                  sizes="(max-width: 1200px) 85vw, 1000px"
                  className="object-cover"
                  priority
                />

            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom Navigation Bar ── */}
        <div 
          className="w-full flex items-center justify-between gap-4 md:bg-[#000000] md:border md:border-[#1e1e1e] md:rounded-full md:py-2 md:px-3 bg-transparent border-transparent py-0 px-1"
        >
          {/* Left Arrow Button */}
          <button
            onClick={handlePrev}
            className="w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0"
            style={{ 
              backgroundColor: "#191919", 
              borderColor: "#303030" 
            }}
            aria-label="Previous tab"
          >
            <ArrowLeft className="w-6 h-6 md:w-5 md:h-5 text-gray-300 hover:text-white" />
          </button>

          {/* Center Dynamic Line Description */}
          <div className="flex-1 text-center px-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="select-none"
              >
                {/* Desktop Version */}
                <p className="hidden md:block text-gray-300 text-xs sm:text-sm md:text-base font-medium leading-relaxed tracking-wide">
                  {currentTab.line}
                </p>
                {/* Mobile Version */}
                <p className="block md:hidden text-white text-lg sm:text-xl font-normal tracking-wide">
                  {currentTab.tabName}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={handleNext}
            className="w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0"
            style={{ 
              backgroundColor: "#191919", 
              borderColor: "#303030" 
            }}
            aria-label="Next tab"
          >
            <ArrowRight className="w-6 h-6 md:w-5 md:h-5 text-gray-300 hover:text-white" />
          </button>
        </div>

      </div>
    </section>
  );
}

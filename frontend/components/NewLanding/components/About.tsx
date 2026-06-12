"use client";

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ScrollWord = ({ word, range, progress }: { word: string; range: [number, number]; progress: any }) => {
  const color = useTransform(progress, range, ["#4d4d4d", "#f4f4f4"]);
  return (
    <motion.span style={{ color }} className="inline-block mr-1.5 font-medium  text-balance">
      {word}
    </motion.span>
  );
};

const About = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.65"]
  });

  const paragraphs = [
    "Colab Platforms is an advanced AI chatbot platform enabling simultaneous chat with multiple LLM models.",
    "Access every leading AI ChatGPT, Claude, Gemini, Grok & Perplexity without switching tabs",
    "Get higher-quality answers through AI collaboration & comparison"
  ];

  const paragraphWords = paragraphs.map(p => p.split(" "));
  const totalWords = paragraphWords.reduce((acc, words) => acc + words.length, 0);
  
  let globalWordIndex = 0;

  return (
    <section id="about" className="flex flex-col text-foreground transition-all duration-300 pt-32 md:pt-48 pb-16 md:pb-24">
      <div className="container mx-auto flex flex-1 flex-col px-5 sm:px-10 z-10 max-w-xl">
        <div className='px-6 py-2 rounded-full bg-[#292929] flex items-center justify-center gap-3 w-fit border-2 border-[#3f3f3f] mb-10'>
            <div className='w-3 h-3 bg-[#3c3b3b] rounded-full'></div>
            <p className='text-foreground'>About us</p>
        </div>

        <div ref={containerRef} className="flex flex-col gap-8">
            {paragraphWords.map((words, pIdx) => (
              <p key={pIdx} className="text-xl md:text-2xl text-balance font-medium flex flex-wrap leading-relaxed text-[#4d4d4d]">
                {words.map((word, wIdx) => {
                  const start = globalWordIndex / totalWords;
                  const end = (globalWordIndex + 1) / totalWords;
                  globalWordIndex++;
                  return (
                    <ScrollWord key={wIdx} word={word} range={[start, end]} progress={scrollYProgress} />
                  );
                })}
              </p>
            ))}
        </div>
      </div>
    </section>
  );
}; 

export default About;
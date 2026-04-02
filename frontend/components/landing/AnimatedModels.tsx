'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'

const leftModels = [
  { 
    name: 'GPT-4o', 
    badge: 'Everyday Assistant', 
    description: 'Best for everyday tasks clear explanations, brainstorming, and reliable help across topics.', 
    color: '#10a37f',
    iconUrl: 'https://cdn.shopify.com/s/files/1/0636/5226/6115/files/chatgpt.png?v=1761997031'
  },
  { 
    name: 'Claude Sonnet 4', 
    badge: 'Refined Writing', 
    description: 'Best for refined writing emails, essays, scripts, and maintaining a consistent tone.', 
    color: '#d97706',
    iconUrl: 'https://cdn.shopify.com/s/files/1/0636/5226/6115/files/claude_logo.png?v=1763788922'
  },
  { 
    name: 'Gemini 2.5 Pro', 
    badge: 'Deep Context', 
    description: 'Built for depth handles long documents and keeps context accurate across detailed discussions.', 
    color: '#4285f4',
    iconUrl: 'https://cdn.shopify.com/s/files/1/0636/5226/6115/files/gemini1.png?v=1761997141'
  },
]

const rightModels = [
  { 
    name: 'Perplexity Sonar Pro', 
    badge: 'Research Expert', 
    description: 'Optimized for research delivers source-backed answers and real-time information discovery.', 
    color: '#8b5cf6',
    iconUrl: 'https://cdn.shopify.com/s/files/1/0636/5226/6115/files/svgviewer-png-output.png?v=1761995370'
  },
  { 
    name: 'Kimi Chat', 
    badge: 'Extended Memory', 
    description: 'Handles extended chats and long documents with ease.', 
    color: '#6366f1',
    iconUrl: 'https://cdn.shopify.com/s/files/1/0636/5226/6115/files/kimilogo.jpg?v=1763799193'
  },
  { 
    name: 'Grok 4', 
    badge: 'Creative Ideation', 
    description: 'Designed for ideation bold concepts, punchy copy, and trend-driven content.', 
    color: '#ef4444',
    iconUrl: 'https://cdn.shopify.com/s/files/1/0636/5226/6115/files/grok_logo.png?v=1763799192'
  },
]


export function AnimatedModels() {
  return (
    <section 
      id="models" 
      className="relative py-20 md:py-28 overflow-hidden"
    >

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            <span className="text-white">Pick the best characteristics</span><br />
            <span className="text-white">of each </span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">AI model</span>
          </h2>
        </div>

        {/* Models Layout */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4">
          {/* Left Models */}
          <div className="flex flex-col gap-4 w-full lg:w-auto lg:flex-1">
            {leftModels.map((model) => (
              <div key={model.name} className="group relative p-5 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-gray-600 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: `${model.color}20` }}>
                    <img src={model.iconUrl} alt={model.name} className="w-6 h-6 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">{model.name}</h3>
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full mb-2" style={{ backgroundColor: `${model.color}20`, color: model.color }}>{model.badge}</span>
                    <p className="text-gray-400 text-sm leading-relaxed">{model.description}</p>
                  </div>
                </div>
                <div className="hidden lg:block absolute right-0 top-1/2 w-8 h-px bg-gradient-to-r from-gray-600 to-emerald-500/50" />
              </div>
            ))}
          </div>

          {/* Center Logo */}
          <div className="relative flex-shrink-0 my-8 lg:my-0">
            <div className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse" />
              <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border border-emerald-500/40 flex items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                </div>
              </div>
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <div key={deg} className="absolute w-2 h-2 rounded-full bg-emerald-500" style={{ top: '50%', left: '50%', transform: `rotate(${deg}deg) translateX(60px) translateY(-50%)` }} />
              ))}
            </div>
          </div>


          {/* Right Models */}
          <div className="flex flex-col gap-4 w-full lg:w-auto lg:flex-1">
            {rightModels.map((model) => (
              <div key={model.name} className="group relative p-5 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-gray-600 transition-all duration-300">
                <div className="hidden lg:block absolute left-0 top-1/2 w-8 h-px bg-gradient-to-l from-gray-600 to-emerald-500/50" />
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: `${model.color}20` }}>
                    <img src={model.iconUrl} alt={model.name} className="w-6 h-6 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">{model.name}</h3>
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full mb-2" style={{ backgroundColor: `${model.color}20`, color: model.color }}>{model.badge}</span>
                    <p className="text-gray-400 text-sm leading-relaxed">{model.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 md:mt-16">
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium transition-all duration-300 border border-emerald-500/30 hover:border-emerald-500/50">
            Explore All Models
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      {/* Image Carousel Section - Moved outside to CTA wrapper */}
    </section>
  )
}

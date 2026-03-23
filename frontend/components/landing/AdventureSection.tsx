'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Sparkles, Send, Cpu } from 'lucide-react'

export function AdventureSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative bg-white pt-8 pb-20 md:pt-12 md:pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`adventure-title text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-gray-900 mb-4">
            Choose Your Way to <span className="text-emerald-500 font-normal">Interact with AI</span>
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
            Whether you need multiple perspectives or one clear answer, the choice is yours.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Classic Mode Card */}
          <div className={`adventure-card group relative bg-[#1a1a1a] rounded-3xl p-8 overflow-hidden hover:shadow-2xl transition-all duration-700 border border-gray-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '200ms' }}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-500/20 transition-colors duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Classic Mode</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
                Single AI Chat
              </h3>
              <p className="text-gray-400 mb-6">
                Chat with one AI model at a time with intelligent auto-selection.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'Best model auto-selected for your query',
                  'Web search integration',
                  'File upload & OCR support'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 font-medium hover:bg-emerald-500/30 hover:border-emerald-400 transition-all duration-300"
              >
                Try Classic Mode
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Classic Chat Interface Preview */}
            <div className="absolute bottom-4 right-4 w-56 h-40 bg-black rounded-xl border border-gray-700 overflow-hidden opacity-70 group-hover:opacity-90 transition-opacity shadow-xl">
              {/* Chat header */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-gray-400">Classic Chat</span>
                </div>
                <div className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-gray-500" />
                  <span className="text-[9px] text-gray-500">GPT-4</span>
                </div>
              </div>
              {/* Chat messages */}
              <div className="p-2 space-y-2">
                <div className="flex justify-end">
                  <div className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-1 rounded-lg max-w-[80%]">
                    Explain quantum computing
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-300 text-[9px] px-2 py-1 rounded-lg max-w-[90%]">
                    Quantum computing uses qubits...
                  </div>
                </div>
              </div>
              {/* Input field */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5">
                  <span className="text-[9px] text-gray-500 flex-1">Ask anything...</span>
                  <div className="w-5 h-5 bg-[#1bffc7] rounded-full flex items-center justify-center">
                    <Send className="w-2.5 h-2.5 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multi Mode Card */}
          <div className={`adventure-card group relative bg-[#1a1a1a] rounded-3xl p-8 overflow-hidden hover:shadow-2xl transition-all duration-700 border border-gray-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '400ms' }}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-500/20 transition-colors duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Multi Mode</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
                Compare AI Models
              </h3>
              <p className="text-gray-400 mb-6">
                Get responses from multiple AI models simultaneously.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'Compare responses side-by-side',
                  'Select multiple models at once',
                  'Find the best answer faster'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-700 rounded-full text-white font-medium hover:bg-gray-700 hover:border-gray-600 transition-all duration-300"
              >
                Try Multi Mode
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Multi Chat Interface Preview */}
            <div className="absolute bottom-4 right-4 w-56 h-40 bg-black rounded-xl border border-gray-700 overflow-hidden opacity-70 group-hover:opacity-90 transition-opacity shadow-xl">
              {/* Chat header */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[10px] text-gray-400">Multi Chat</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-500">3 models</span>
                </div>
              </div>
              {/* Multi response cards */}
              <div className="p-2">
                <div className="flex justify-end mb-2">
                  <div className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-1 rounded-lg">
                    Compare AI models
                  </div>
                </div>
                <div className="flex gap-1">
                  {/* GPT-4 response */}
                  <div className="flex-1 bg-gray-800 rounded-lg p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-br from-green-400 to-green-600" />
                      <span className="text-[8px] text-gray-400">GPT-4</span>
                    </div>
                    <p className="text-[7px] text-gray-400 line-clamp-2">AI models differ in...</p>
                  </div>
                  {/* Claude response */}
                  <div className="flex-1 bg-gray-800 rounded-lg p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-orange-600" />
                      <span className="text-[8px] text-gray-400">Claude</span>
                    </div>
                    <p className="text-[7px] text-gray-400 line-clamp-2">Each model has...</p>
                  </div>
                  {/* Gemini response */}
                  <div className="flex-1 bg-gray-800 rounded-lg p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-400 to-blue-600" />
                      <span className="text-[8px] text-gray-400">Gemini</span>
                    </div>
                    <p className="text-[7px] text-gray-400 line-clamp-2">Comparing models...</p>
                  </div>
                </div>
              </div>
              {/* Input field */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5">
                  <span className="text-[9px] text-gray-500 flex-1">Ask multiple AIs...</span>
                  <div className="w-5 h-5 bg-[#1bffc7] rounded-full flex items-center justify-center">
                    <Send className="w-2.5 h-2.5 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

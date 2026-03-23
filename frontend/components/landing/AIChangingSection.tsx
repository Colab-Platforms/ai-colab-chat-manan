'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, Wand2, Sparkles } from 'lucide-react'

export function AIChangingSection() {
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
    <section ref={sectionRef} className="relative bg-white py-20 md:py-32 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`ai-title text-center mb-16 md:mb-24 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-gray-900">
            <span className="text-emerald-500 italic font-normal">Build smarter</span>
            <br />
            <span>with AI</span>
          </h2>
        </div>

        {/* Content - Left text, Right cards */}
        <div className="ai-content grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left side - Text items */}
          <div className="space-y-10 lg:space-y-14 pt-4">
            <div className={`ai-text-item transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '200ms' }}>
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-2">
                <span className="text-emerald-500 italic">From idea to output</span> faster
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                Write, code, brainstorm, and generate content in minutes.
              </p>
            </div>
            <div className={`ai-text-item transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '400ms' }}>
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-2 italic">
                <span className="text-emerald-500">Sharper prompts</span> & Better results.
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                Prompt enhancement makes every query clearer and more effective.
              </p>
            </div>
            <div className={`ai-text-item transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '600ms' }}>
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-2 italic">
                <span className="text-emerald-500">Compare premium models</span> at once.
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                See responses side-by-side and pick the strongest answer instantly.
              </p>
            </div>
          </div>

          {/* Right side - Overlapping cards */}
          <div className="ai-cards relative h-[500px] sm:h-[550px]">
            {/* Card 1 - Context Memory */}
            <div className={`ai-card-1 absolute top-0 right-0 w-full sm:w-[90%] bg-[#1a1a1a] rounded-2xl shadow-xl overflow-hidden border border-gray-800 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`} style={{ transitionDelay: '300ms' }}>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">Context Memory</h4>
                    <p className="text-gray-400 text-sm">Smart conversation recall</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  AI remembers your conversation context across sessions. Build on previous discussions without repeating yourself.
                </p>
                <div className="space-y-2">
                  {['Previous conversation loaded', 'User preferences saved', 'Project context: Active'].map((item, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg px-4 py-2.5 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 - Prompt Enhance */}
            <div className={`ai-card-2 absolute bottom-0 right-0 sm:right-[-20px] w-full sm:w-[85%] bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden border border-gray-800 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '500ms' }}>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Wand2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">Prompt Enhance</h4>
                    <p className="text-gray-400 text-sm">Smarter queries, better results</p>
                  </div>
                </div>
                
                {/* Original prompt */}
                <div className="bg-gray-800 rounded-lg px-4 py-3 mb-3">
                  <p className="text-gray-500 text-xs mb-1">Original</p>
                  <p className="text-gray-400 text-sm">make a website</p>
                </div>
                
                {/* Arrow indicator */}
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 text-xs font-medium">Enhanced</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                
                {/* Enhanced prompt */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3">
                  <p className="text-purple-400 text-xs mb-1">Result</p>
                  <p className="text-gray-300 text-sm">Create a modern, responsive website with Next.js featuring a clean UI, dark mode support, and optimized performance...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

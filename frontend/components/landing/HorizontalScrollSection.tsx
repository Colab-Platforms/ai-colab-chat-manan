'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, Wand2, MessageSquare, Zap, Shield, Globe, Cpu, Sparkles, Bot, ChevronLeft, ChevronRight } from 'lucide-react'

const cards = [
  {
    number: '00',
    title: 'Contextual Memory',
    description: 'AI remembers your conversation context across sessions. Build on previous discussions without repeating yourself - your AI assistant learns and adapts.',
    icon: Brain,
    preview: {
      type: 'memory',
      content: 'Remembers your preferences'
    }
  },
  {
    number: '01',
    title: 'Prompt Enhancer',
    description: 'Transform simple prompts into powerful, detailed instructions. Our AI enhances your queries for better, more accurate responses automatically.',
    icon: Wand2,
    preview: {
      type: 'enhancer',
      content: 'Enhance your prompts'
    }
  },
  {
    number: '02',
    title: 'Multi-Model Chat',
    description: 'Chat with multiple AI models simultaneously and compare responses in real-time. Get diverse perspectives and find the best answers instantly.',
    icon: MessageSquare,
    preview: {
      type: 'chat',
      content: 'Compare AI responses side-by-side'
    }
  },
  {
    number: '03',
    title: 'Lightning Fast',
    description: 'Optimized streaming responses with instant feedback and minimal latency. Experience real-time AI conversations without any delays.',
    icon: Zap,
    preview: {
      type: 'terminal',
      content: 'Streaming response in progress...'
    }
  },
  {
    number: '04',
    title: 'Secure & Private',
    description: 'Enterprise-grade security with encrypted conversations and data protection. Your data is never used for training AI models.',
    icon: Shield,
    preview: {
      type: 'security',
      content: 'Encrypted & Private'
    }
  },
  {
    number: '05',
    title: 'Real-time Search',
    description: 'Access live web data through integrated search for up-to-date information. Combine AI intelligence with real-world knowledge.',
    icon: Globe,
    preview: {
      type: 'search',
      content: 'Search the web for latest trends'
    }
  },
  {
    number: '06',
    title: 'Smart Routing',
    description: 'Intelligent model selection based on your query type for optimal results. Our AI automatically picks the best model for your task.',
    icon: Cpu,
    preview: {
      type: 'routing',
      content: 'Auto-select best model'
    }
  },
  {
    number: '07',
    title: 'Image Generation',
    description: 'Create stunning images with DALL-E and Stable Diffusion integration. Transform your ideas into visual masterpieces instantly.',
    icon: Sparkles,
    preview: {
      type: 'image',
      content: 'Generate amazing visuals'
    }
  }
]

export function HorizontalScrollSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

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

  // Check scroll position
  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', checkScroll)
      checkScroll()
      return () => container.removeEventListener('scroll', checkScroll)
    }
  }, [])

  // Scroll functions
  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  return (
    <section 
      ref={sectionRef} 
      className="relative py-20" 
      id="features"
    >
      <div className="flex flex-col">
        <div className="flex-shrink-0 pb-8 px-6 lg:px-12 flex items-end justify-between">
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-[#1bffc7]/20 border border-[#1bffc7]/40 text-[#1bffc7] text-sm font-medium mb-4">Features</span>
            <h2 className={`hs-title text-3xl sm:text-4xl md:text-5xl font-bold text-white max-w-lg transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              Everything you need<br />
              <span className="text-[#1bffc7]">in one platform</span>
            </h2>
          </div>
          
          {/* Scroll Navigation Arrows */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                canScrollLeft 
                  ? 'border-[#1bffc7] text-[#1bffc7] hover:bg-[#1bffc7] hover:text-black cursor-pointer' 
                  : 'border-gray-700 text-gray-700 cursor-not-allowed'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={scrollRight}
              disabled={!canScrollRight}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                canScrollRight 
                  ? 'border-[#1bffc7] text-[#1bffc7] hover:bg-[#1bffc7] hover:text-black cursor-pointer' 
                  : 'border-gray-700 text-gray-700 cursor-not-allowed'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Horizontal scroll container - native CSS scroll */}
        <div className="relative">
          {/* Left gradient fade */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          )}
          
          {/* Right gradient fade */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          )}
          
          <div 
            ref={containerRef}
            className="overflow-x-auto scrollbar-hide scroll-smooth"
          >
            <div 
              className="flex gap-6 lg:gap-8 pl-6 lg:pl-12 pr-6 pb-4"
              style={{ width: 'max-content' }}
            >
              {cards.map((card, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-[50vw] lg:w-[380px] xl:w-[420px] transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="mb-4">
                  <span className="text-[#1bffc7] text-sm font-mono mb-2 block">[{card.number}]</span>
                  <h3 className="text-white text-xl sm:text-2xl font-semibold leading-tight">
                    {card.title}
                  </h3>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden mb-4 h-[280px] sm:h-[320px]">
                  {card.preview.type === 'memory' && (
                    <div className="h-full flex flex-col p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1bffc7]/20 flex items-center justify-center">
                          <Brain className="w-6 h-6 text-[#1bffc7]" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Context Memory</p>
                          <p className="text-gray-500 text-sm">Active</p>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        {['Previous conversation loaded', 'User preferences saved', 'Project context: AI Chat App'].map((item, i) => (
                          <div key={i} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#1bffc7]" />
                            <span className="text-gray-300 text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'enhancer' && (
                    <div className="h-full flex flex-col p-5">
                      <div className="bg-gray-800 rounded-lg px-4 py-3 mb-3">
                        <p className="text-gray-500 text-xs mb-1">Original</p>
                        <p className="text-gray-400 text-sm">make a website</p>
                      </div>
                      <div className="flex items-center justify-center py-2">
                        <Wand2 className="w-5 h-5 text-[#1bffc7] animate-pulse" />
                      </div>
                      <div className="bg-[#1bffc7]/10 border border-[#1bffc7]/30 rounded-lg px-4 py-3 flex-1">
                        <p className="text-[#1bffc7] text-xs mb-1">Enhanced</p>
                        <p className="text-gray-300 text-sm">Create a modern, responsive website with Next.js featuring a clean UI, dark mode support, and optimized performance...</p>
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'chat' && (
                    <div className="h-full flex flex-col p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#1bffc7] flex items-center justify-center">
                          <span className="text-black text-sm font-bold">U</span>
                        </div>
                        <span className="text-gray-400 text-sm">User</span>
                      </div>
                      <div className="bg-gray-800 rounded-lg px-4 py-3 mb-4">
                        <p className="text-gray-300 text-sm">{card.preview.content}</p>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        {['GPT-4', 'Claude'].map((model) => (
                          <div key={model} className="bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="w-4 h-4 text-[#1bffc7]" />
                              <span className="text-xs text-gray-400">{model}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="h-2 bg-gray-700 rounded w-full" />
                              <div className="h-2 bg-gray-700 rounded w-4/5" />
                              <div className="h-2 bg-gray-700 rounded w-3/5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'terminal' && (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                      </div>
                      <div className="flex-1 p-4 flex flex-col justify-center">
                        <div className="bg-gray-800 rounded-lg px-4 py-3 mb-4">
                          <p className="text-gray-300 text-sm">{card.preview.content}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {['⚡', '→', '✓', '◉', '▶'].map((icon, i) => (
                            <div key={i} className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-[#1bffc7] text-lg">
                              {icon}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-[#1bffc7] rounded-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'security' && (
                    <div className="h-full flex flex-col items-center justify-center p-6">
                      <div className="w-24 h-24 rounded-2xl bg-[#1bffc7]/20 flex items-center justify-center mb-6">
                        <Shield className="w-12 h-12 text-[#1bffc7]" />
                      </div>
                      <p className="text-[#1bffc7] font-semibold text-lg mb-4">{card.preview.content}</p>
                      <div className="flex gap-3 flex-wrap justify-center">
                        {['SOC 2', 'GDPR', 'E2E', 'AES-256'].map((badge) => (
                          <span key={badge} className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-400 border border-gray-700">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'search' && (
                    <div className="h-full flex flex-col p-5">
                      <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
                        <Globe className="w-5 h-5 text-[#1bffc7]" />
                        <p className="text-gray-300 text-sm">{card.preview.content}</p>
                      </div>
                      <div className="space-y-3 flex-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gray-700 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="h-2.5 bg-gray-700 rounded w-3/4 mb-1.5" />
                              <div className="h-2 bg-gray-700 rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'routing' && (
                    <div className="h-full flex flex-col items-center justify-center p-6">
                      <div className="flex items-center gap-6 mb-6">
                        {['GPT-4', 'Claude', 'Gemini'].map((model, i) => (
                          <div key={model} className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-2 ${i === 1 ? 'bg-[#1bffc7] scale-110 shadow-lg shadow-[#1bffc7]/30' : 'bg-gray-800'}`}>
                              <Cpu className={`w-8 h-8 ${i === 1 ? 'text-black' : 'text-gray-500'}`} />
                            </div>
                            <span className={`text-xs ${i === 1 ? 'text-[#1bffc7]' : 'text-gray-500'}`}>{model}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-400 text-sm text-center mb-4">{card.preview.content}</p>
                      <div className="px-5 py-2.5 bg-[#1bffc7]/20 rounded-full border border-[#1bffc7]/40">
                        <span className="text-[#1bffc7] text-sm font-medium">✓ Claude selected for this task</span>
                      </div>
                    </div>
                  )}

                  {card.preview.type === 'image' && (
                    <div className="h-full flex flex-col p-5">
                      <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-[#1bffc7]" />
                        <p className="text-gray-300 text-sm">{card.preview.content}</p>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center border border-gray-700">
                            <div className="w-12 h-12 rounded-lg bg-[#1bffc7]/20 flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-[#1bffc7]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-white text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hide scrollbar but keep functionality */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}

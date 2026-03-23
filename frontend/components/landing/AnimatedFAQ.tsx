'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'How is ColabAI different from using separate AI apps?',
    answer: 'You can access multiple models together, compare responses instantly, and keep all chats organized.'
  },
  {
    question: 'Which models can I use on ColabAI?',
    answer: 'You can use leading models like ChatGPT, Claude, Gemini, Grok, and other supported providers.'
  },
  {
    question: 'Do you offer a free plan or free credits?',
    answer: 'Yes, new users get free prompt, and paid plans unlock higher limits and premium access.'
  },
  {
    question: 'Can I switch models mid-conversation?',
    answer: 'Yes, you can regenerate or continue the same chat with another model while keeping context.'
  },
  {
    question: 'Will I see token warnings before running out?',
    answer: 'Yes, you will see number of prompt left.'
  },
  {
    question: 'How do I pay, and what plans are available?',
    answer: 'Free, Pro, and Enterprise plans are available with payments via Razorpay, Cashfree, or PayPal.'
  },
  {
    question: "What's the difference between Classic Mode and Multi-Model Mode?",
    answer: 'Classic Mode uses one model per chat, while Multi-Model runs several models together.'
  },
  {
    question: 'Is my chat data private, and can I delete it anytime?',
    answer: 'Yes, your data is protected with security controls and you can delete conversations under retention rules.'
  },
  
]

function FAQItem({ faq, isOpen, onToggle }: { 
  faq: typeof faqs[0], 
  isOpen: boolean, 
  onToggle: () => void 
}) {
  return (
    <div className="faq-item border-b border-white/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-base md:text-lg font-medium text-white group-hover:text-[#1bffc7] transition-colors pr-4">
          {faq.question}
        </span>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#1bffc7]/20 rotate-180' : ''}`}>
          {isOpen ? (
            <Minus className="w-4 h-4 text-[#1bffc7]" />
          ) : (
            <Plus className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'}`}
      >
        <p className="text-gray-400 leading-relaxed">
          {faq.answer}
        </p>
      </div>
    </div>
  )
}

export function AnimatedFAQ() {
  const sectionRef = useRef<HTMLElement>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(0)
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
    <section 
      ref={sectionRef} 
      id="faq" 
      className="relative py-24 md:py-32 overflow-hidden"
    >

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className={`text-center mb-12 md:mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-2 rounded-full bg-[#1bffc7]/10 border border-[#1bffc7]/20 text-[#1bffc7] text-sm font-medium mb-6">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Frequently Asked
            </span>
            <br />
            <span className="text-[#1bffc7]">
              Questions
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about ColabAI and how it works.
          </p>
        </div>

        {/* FAQ List */}
        <div className={`faq-container bg-[#1a1a1a] border border-gray-800 rounded-2xl md:rounded-3xl p-6 md:p-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

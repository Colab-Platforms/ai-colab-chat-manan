'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { MovingBorderButton } from '@/components/ui/MovingBorderButton'

export function AnimatedCTA() {
  const { user } = useAuth()
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section 
      ref={sectionRef} 
      className="relative pt-20 md:pt-28 pb-32 overflow-hidden"
    >

      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
        <div 
          className={`relative p-12 md:p-16 rounded-[2.5rem] bg-[#1a1a1a] border border-gray-800 overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-tr-[80px]" />

          <div className="relative text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-8">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Start for free today</span>
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-white">
                Ready to transform
              </span>
              <br />
              <span className="text-emerald-400">
                your AI experience?
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Join thousands of users who are already leveraging the power of multiple AI models. 
              Get started with 300 free Prompt.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MovingBorderButton
                as={Link}
                href="/register"
                borderRadius="9999px"
                containerClassName="h-14 w-52"
                className="px-8 py-4 text-base font-semibold"
                duration={2500}
              >
                <span className="flex items-center gap-2 truncate">
                  Get Started Free
                </span>
              </MovingBorderButton>

              <MovingBorderButton
                as={Link}
                href="#"
                borderRadius="9999px"
                containerClassName="h-14 w-44"
                className="px-8 py-4 text-base font-semibold"
                borderClassName="bg-[radial-gradient(#14b8a6_40%,transparent_60%)]"
                duration={3000}
              >
                View Pricing
              </MovingBorderButton>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>300 free prompt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

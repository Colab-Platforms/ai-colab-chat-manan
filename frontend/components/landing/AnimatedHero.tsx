'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Fingerprint, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import dynamic from 'next/dynamic'
import { MovingBorder } from '@/components/ui/MovingBorderButton'

const LightRays = dynamic(() => import('@/components/ui/LightRays'), { ssr: false })

const changingWords = ['All working together', 'Ready when you need them.', 'Used the way you want.']

export function AnimatedHero() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return
    const { left, top } = heroRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
  }

  // Typing effect for changing words
  useEffect(() => {
    const currentWord = changingWords[currentWordIndex]
    const typingSpeed = 100
    const deletingSpeed = 60
    const pauseDuration = 2000

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1))
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), pauseDuration)
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setCurrentWordIndex((prev) => (prev + 1) % changingWords.length)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, currentWordIndex])

  return (
    <section 
      ref={heroRef} 
      className="relative min-h-screen overflow-hidden group"
      onMouseMove={handleMouseMove}
    >
      {/* Background Image - using CSS gradient fallback for faster load */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-gradient-to-b from-gray-900 to-black transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: 'url(https://cdn.shopify.com/s/files/1/0636/5226/6115/files/Background.png?v=1766233743)' }}
      />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.2] pointer-events-none z-[1] mix-blend-overlay" 
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      
      {/* Spotlight Effect that follows the mouse */}
      <motion.div
        className="pointer-events-none absolute inset-0 bottom-32 z-[2] transition duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              800px circle at ${mouseX}px ${mouseY}px,
              rgba(27, 255, 199, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      {/* Overlay for better text readability - Now behind rays to keep them vibrant */}
      <div className="absolute inset-0 bottom-32 bg-black/40 z-[2]" />

      {/* Advanced WebGL Light Rays - Interactive & Radiating */}
      <div className="z-[3] absolute inset-0 bottom-32 opacity-50 md:opacity-100">
        <LightRays 
          raysColor="#1bffc7" 
          intensity="medium" 
          raysOrigin="bottom-center" 
        />
      </div>
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-48">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-tight mb-6 sm:mb-8 px-4 max-w-4xl mx-auto flex flex-col items-center text-balance">
            <span>The World’s Leading AI Models.</span>
            <div className="h-[1.2em] flex items-center justify-center text-[#1bffc7] font-medium mt-2">
              <span>{displayText}</span>
              <span className="inline-block w-[2px] sm:w-[3px] h-[0.8em] bg-[#1bffc7] ml-1 animate-pulse text-balance" />
            </div>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl max-w-4xl mx-auto mb-8 sm:mb-10 leading-relaxed px-6 sm:px-0 text-balance">
            Write, code, brainstorm, and generate content in one workspace. Access multiple AI models, compare responses side-by-side, and move faster.
          </p>

          {/* CTA Button with moving border effect */}
          <div>
            <div className="relative inline-block p-[2px] rounded-full overflow-hidden">
              {/* Moving border effect */}
              <div className="absolute inset-0 rounded-full">
                <MovingBorder duration={2000} rx="50%" ry="50%">
                  <div className="h-16 w-16 opacity-[0.9] bg-[radial-gradient(#1bffc7_40%,transparent_60%)]" />
                </MovingBorder>
              </div>
              {/* Original button */}
              <Link
                href="/register"
                className="relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-black bg-gradient-to-r from-[#1bffc7] to-[#14b8a6] rounded-full hover:opacity-90 transition-all duration-300 hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* White section with top border radius only */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-white rounded-t-[50px] md:rounded-t-[50px] z-[10]" />
    </section>
  )
}

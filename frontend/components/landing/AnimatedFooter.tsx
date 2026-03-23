'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const footerLinks = [
  { name: 'Features', href: '#features' },
  { name: 'Models', href: '#models' },
  { name: 'Modes', href: '#modes' },
  { name: 'Pricing', href: '#' },
  { name: 'T&C', href: '#' },
  { name: 'Privacy Policy', href: '#' },
]

export function AnimatedFooter() {
  const footerRef = useRef<HTMLElement>(null)
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

    if (footerRef.current) {
      observer.observe(footerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <footer 
      ref={footerRef} 
      className="relative pt-12 pb-8 border-t border-white/10 overflow-hidden"
    >
      <div className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-8 footer-content transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-8">
          {/* Brand */}
          <Link href="/" className="flex items-center">
            <div className="mb-1">
              <Image src="/white.webp" alt="AI Colab" width={90} height={90} className="h-auto" priority />
            </div>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">© {new Date().getFullYear()} ColabPlatforms. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

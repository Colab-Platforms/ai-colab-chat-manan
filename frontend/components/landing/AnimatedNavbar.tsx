'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, User, LogOut, Sparkles, ThumbsUp } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { FeedbackModal } from '@/components/ui/FeedbackModal'
import { MovingBorderButton } from '@/components/ui/MovingBorderButton'
import Image from 'next/image'

export function AnimatedNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setIsOpen(false)
  }

  const navigation = [
    { name: 'Features', href: '#features' },
    { name: 'Models', href: '#models' },
    { name: 'Modes', href: '#modes' },
    { name: 'Pricing', href: '#' },
  ]

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-xl border-b border-white/10 ${
        scrolled ? 'bg-black/60 shadow-lg shadow-black/20' : 'bg-black/40'
      }`}
      style={{ backdropFilter: 'blur(20px) saturate(180%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo - Extreme Left */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <div className="md:hidden">
              <div className="mb-1">
                <Image src="/white.webp" alt="AI Colab" width={80} height={28} className="h-auto" priority />
              </div>

            </div>
            <div className="hidden md:block">
              <div className="mb-1">
                <Image src="/white.webp" alt="AI Colab" width={80} height={28} className="h-auto" priority />
              </div>
            </div>
          </Link>

          {/* Desktop Navigation - Center */}
          <div className="hidden md:flex items-center justify-center flex-1 gap-1">
            {
              navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="nav-link relative px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors group"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#1bffc7] to-[#14b8a6] group-hover:w-full transition-all duration-300" />
                </Link>
              ))
            }
          </div>

          {/* Auth Section - Extreme Right */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            
              <div className="flex items-center gap-3">
                <Link href="/login" className="nav-link px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign In</Link>
                <MovingBorderButton
                  as={Link}
                  href="/register"
                  borderRadius="9999px"
                  containerClassName="h-10 w-32"
                  className="px-5 py-2.5 text-sm font-semibold"
                  duration={2000}
                >
                  Get Started
                </MovingBorderButton>
              </div>

          </div>

          {/* Mobile menu button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-white">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="px-4 py-4 bg-black/95 backdrop-blur-xl border-t border-white/10 space-y-2">
          {['Features', 'Models', 'Modes', 'Pricing'].map((item) => (
            <button key={item} onClick={() => item === 'Pricing' ? window.location.href = '/pricing' : scrollToSection(item.toLowerCase())} className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
              {item}
            </button>
          ))}
          {/* Mobile Feedback Button - Highlighted */}
          <button 
            onClick={() => { setIsOpen(false); setIsFeedbackOpen(true) }} 
            className="flex items-center gap-2 w-full text-left px-4 py-3 text-purple-300 hover:text-white hover:bg-purple-500/10 rounded-xl transition-colors"
          >
            <ThumbsUp className="w-4 h-4 text-purple-400" />
            Feedback
          </button>
          <div className="pt-4 border-t border-white/10">
            {user ? (
              <>
                <Link href="/" prefetch={true} className="block w-full px-4 py-3 text-center bg-gradient-to-r from-[#1bffc7] to-[#14b8a6] text-black rounded-xl font-medium" onClick={() => setIsOpen(false)}>Go to Chat</Link>
                <button onClick={() => { logout(); window.location.href = '/'; }} className="block w-full mt-2 px-4 py-3 text-center text-red-400 hover:bg-white/10 rounded-xl">Sign Out</button>
              </>
            ) : (
              <Link href="/login" prefetch={true} className="block w-full px-4 py-3 text-center bg-gradient-to-r from-[#1bffc7] to-[#14b8a6] text-black rounded-xl font-medium" onClick={() => setIsOpen(false)}>Get Started</Link>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </nav>
  )
}

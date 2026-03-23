'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TypingAnimationProps {
  texts: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
}

export function TypingAnimation({
  texts,
  typingSpeed = 1500,
  deletingSpeed = 2000,
  pauseDuration = 2000,
}: TypingAnimationProps) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentText = texts[index % texts.length]
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.substring(0, displayText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), pauseDuration)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(currentText.substring(0, displayText.length - 1))
        } else {
          setIsDeleting(false)
          setIndex((prev) => prev + 1)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, index, texts, typingSpeed, deletingSpeed, pauseDuration])

  return (
    <span className="inline-block min-w-[1ch]">
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        className="inline-block w-0.5 h-[1.1em] ml-1 bg-current align-middle"
      />
    </span>
  )
}

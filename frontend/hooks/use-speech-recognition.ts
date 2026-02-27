"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type SpeechStatus = "idle" | "listening" | "stopping";

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

interface UseSpeechRecognitionReturn {
  status: SpeechStatus;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  errorMessage: string | null;
}

// Extend the Window interface for webkitSpeechRecognition
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const { onResult, onEnd, onError } = options;
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onResultRef.current = onResult;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onResult, onEnd, onError]);

  const isSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    // Configure for English + Hinglish
    recognition.lang = "hi-IN"; // Hindi covers Hinglish (Hindi + English mixed)
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Send the full transcript (final + interim) to the callback
      const fullTranscript = (finalTranscript + interimTranscript).trim();
      if (fullTranscript && onResultRef.current) {
        onResultRef.current(fullTranscript);
      }
    };

    recognition.onend = () => {
      setStatus("idle");
      recognitionRef.current = null;
      onEndRef.current?.();
    };

    recognition.onerror = (event: any) => {
      // "aborted" is expected when we call stop/abort
      if (event.error !== "aborted") {
        let msg = "Speech recognition failed.";
        if (event.error === "not-allowed") {
          msg =
            "Microphone access denied. Please allow microphone permission in your browser settings and try again.";
        } else if (event.error === "no-speech") {
          msg = "No speech detected. Please try again.";
        } else if (event.error === "network") {
          msg = "Network error. Please check your connection.";
        }
        setErrorMessage(msg);
        onErrorRef.current?.(msg);
        console.warn("Speech recognition error:", event.error);
      }
      setStatus("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setErrorMessage(null);
    recognition.start();
    setStatus("listening");
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setStatus("stopping");
      try {
        // stop() waits for the final result before ending
        recognitionRef.current.stop();
      } catch {
        setStatus("idle");
        recognitionRef.current = null;
      }
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    status,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
  };
}

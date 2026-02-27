"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type SpeechStatus = "idle" | "listening";

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (message: string) => void;
}

interface UseSpeechRecognitionReturn {
  status: SpeechStatus;
  isSupported: boolean;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const { onResult, onError } = options;
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  // Flag: true when user wants to be listening (prevents auto-stop)
  const wantListeningRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

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

    // en-IN handles both English and Hinglish (romanized Hindi)
    recognition.lang = "en-IN";
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

      const fullTranscript = (finalTranscript + interimTranscript).trim();
      if (fullTranscript && onResultRef.current) {
        onResultRef.current(fullTranscript);
      }
    };

    recognition.onend = () => {
      // If user still wants to listen, auto-restart (prevents silence auto-stop)
      if (wantListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setStatus("idle");
          wantListeningRef.current = false;
          recognitionRef.current = null;
        }
        return;
      }
      setStatus("idle");
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;

      // On "no-speech", just restart silently if user still wants listening
      if (event.error === "no-speech") {
        // onend will handle the restart via wantListeningRef
        return;
      }

      let msg = "Speech recognition failed.";
      if (event.error === "not-allowed") {
        msg =
          "Microphone access denied. Please allow microphone permission in your browser settings and try again.";
      } else if (event.error === "network") {
        msg = "Network error. Please check your connection.";
      }
      setErrorMessage(msg);
      onErrorRef.current?.(msg);
      console.warn("Speech recognition error:", event.error);
      wantListeningRef.current = false;
      setStatus("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    wantListeningRef.current = true;
    setErrorMessage(null);
    recognition.start();
    setStatus("listening");
  }, [isSupported]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setStatus("idle");
    recognitionRef.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
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

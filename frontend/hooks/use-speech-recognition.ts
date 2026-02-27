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

  // Whether the user wants to keep listening (prevents auto-stop on silence)
  const wantListeningRef = useRef(false);

  // Accumulated finalized speech across all restarts in the current session
  const sessionFinalRef = useRef("");

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  const isSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const createAndStart = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    // en-IN: Indian English — handles both English and Hinglish in Roman script
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Commit to session-level accumulator
          sessionFinalRef.current += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // What to surface: everything finalized this session + current interim
      const live = (sessionFinalRef.current + interimTranscript).trim();
      if (onResultRef.current) {
        onResultRef.current(live);
      }
    };

    recognition.onend = () => {
      if (wantListeningRef.current) {
        // Silently restart — don't reset sessionFinalRef
        try {
          recognition.start();
          return;
        } catch {
          // If restart fails, clean up
          wantListeningRef.current = false;
          setStatus("idle");
          recognitionRef.current = null;
        }
      } else {
        setStatus("idle");
        recognitionRef.current = null;
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        // no-speech is handled by onend restart
        return;
      }

      let msg = "Speech recognition failed.";
      if (event.error === "not-allowed") {
        msg =
          "Microphone access denied. Please allow microphone in browser settings.";
      } else if (event.error === "network") {
        msg = "Network error during speech recognition.";
      }
      setErrorMessage(msg);
      onErrorRef.current?.(msg);
      console.warn("Speech recognition error:", event.error);
      wantListeningRef.current = false;
      setStatus("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    // Reset session accumulator for a fresh start
    sessionFinalRef.current = "";
    wantListeningRef.current = true;
    setErrorMessage(null);
    setStatus("listening");
    createAndStart();
  }, [isSupported, createAndStart]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    setStatus("idle");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    sessionFinalRef.current = "";
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "listening";

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const finalTranscriptRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const isAndroid = /Android/i.test(navigator.userAgent);

    const recognition = new SpeechRecognition();
    // Android Chrome has a known bug where continuous=true causes it to append
    // the accumulated transcript from the beginning of the session into every new result.
    // Setting continuous=false and manually accumulating the transcript across auto-restarts fixes it.
    recognition.continuous = !isAndroid;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        let text = result[0].transcript;

        if (result.isFinal) {
          if (
            finalTranscriptRef.current &&
            !finalTranscriptRef.current.endsWith(" ") &&
            text &&
            !text.startsWith(" ")
          ) {
            finalTranscriptRef.current += " ";
          }
          finalTranscriptRef.current += text;
        } else {
          currentInterim += text;
        }
      }

      setTranscript(finalTranscriptRef.current);
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if we are still meant to be listening
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart speech recognition", e);
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      finalTranscriptRef.current = "";
      setTranscript("");
      setInterimTranscript("");
      isListeningRef.current = true;
      setIsListening(true);
      recognitionRef.current.start();
    } catch (e) {
      console.error("Speech recognition start error", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isListeningRef.current = false;
    setIsListening(false);
    recognitionRef.current.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    transcript,
    interimTranscript,
    listening: isListening,
    browserSupportsSpeechRecognition: isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition as useRSR,
} from "react-speech-recognition";

export type SpeechStatus = "idle" | "listening";

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
) {
  const { onResult } = options;
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const {
    transcript,
    interimTranscript,
    listening,
    browserSupportsSpeechRecognition,
    resetTranscript,
  } = useRSR();

  // Combine final + interim for realtime display
  const prevTranscriptRef = useRef("");

  useEffect(() => {
    if (!listening) {
      prevTranscriptRef.current = "";
      return;
    }
    const combined = (
      transcript + (interimTranscript ? " " + interimTranscript : "")
    ).trim();
    if (combined && combined !== prevTranscriptRef.current) {
      prevTranscriptRef.current = combined;
      onResultRef.current?.(combined);
    }
  }, [transcript, interimTranscript, listening]);

  const startListening = useCallback(() => {
    resetTranscript();
    SpeechRecognition.startListening({
      continuous: true,
      language: "en-IN",
    });
  }, [resetTranscript]);

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    resetTranscript();
  }, [resetTranscript]);

  return {
    status: listening
      ? ("listening" as SpeechStatus)
      : ("idle" as SpeechStatus),
    isSupported: browserSupportsSpeechRecognition,
    startListening,
    stopListening,
  };
}

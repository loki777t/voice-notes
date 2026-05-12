import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Web: MediaRecorder -> Blob
// Native (fallback): expo-av Recording -> uri

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const nativeRecordingRef = useRef(null);

  const cleanup = useCallback(async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // ignore
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (nativeRecordingRef.current) {
      try {
        await nativeRecordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore
      }
      nativeRecordingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (isRecording) return;

    if (Platform.OS === 'web') {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Браузер не поддерживает запись аудио.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeTypeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];

      const supportedMimeType = mimeTypeCandidates.find((t) => {
        try {
          return window.MediaRecorder && MediaRecorder.isTypeSupported(t);
        } catch {
          return false;
        }
      });

      const mr = new MediaRecorder(
        stream,
        supportedMimeType ? { mimeType: supportedMimeType } : undefined
      );

      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          chunksRef.current.push(evt.data);
        }
      };

      mr.onstop = () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
      };

      await new Promise((resolve) => {
        mr.onstart = () => resolve();
        mr.start();
      });

      setIsRecording(true);
      return;
    }

    // Native fallback
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    });

    const rec = new Audio.Recording();
    nativeRecordingRef.current = rec;

    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setIsRecording(true);
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    setError(null);
    if (!isRecording) return null;

    if (Platform.OS === 'web') {
      const mr = mediaRecorderRef.current;
      if (!mr) return null;

      const blob = await new Promise((resolve) => {
        mr.onstop = () => {
          try {
            const outBlob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
            resolve(outBlob);
          } catch {
            resolve(null);
          }
        };

        try {
          mr.stop();
        } catch {
          resolve(null);
        }
      });

      setIsRecording(false);
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      return blob;
    }

    const rec = nativeRecordingRef.current;
    if (!rec) return null;

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      setIsRecording(false);
      nativeRecordingRef.current = null;

      return { uri };
    } catch (e) {
      setError(e?.message || 'Ошибка остановки записи');
      setIsRecording(false);
      nativeRecordingRef.current = null;
      return null;
    }
  }, [isRecording]);

  const reset = useCallback(async () => {
    await cleanup();
    setIsRecording(false);
    setError(null);
  }, [cleanup]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}


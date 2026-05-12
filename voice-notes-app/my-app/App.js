import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';

import NoteCard from './ui/NoteCard';
import { useVoiceRecorder } from './voice/voiceRecorder';
import { blobToArrayBuffer } from './voice/blobToArrayBuffer';
import { clearNotes, deleteNote, listNotes, putNote } from './db/notesDB';

function makeGridBackgroundStyle() {
  // RN Web uses inline styles; keep it simple for cross-platform.
  // For web we rely on an inline repeating-linear-gradient.
  if (Platform.OS === 'web') {
    return {
      backgroundColor: '#0b0b0f',
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
      backgroundSize: '22px 22px',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: '#0b0b0f' };
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [player, setPlayer] = useState(null);

  const { isRecording, error, startRecording, stopRecording, reset } = useVoiceRecorder();

  const loadNotes = useCallback(async () => {
    const all = await listNotes();
    setNotes(all);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.unloadAsync();
        } catch {
          // ignore
        }
      }
    };
  }, [player]);

  const play = useCallback(
    async (note) => {
      try {
        if (player) {
          await player.stopAsync();
          await player.unloadAsync();
          setPlayer(null);
        }

        let playbackSource = null;

        if (Platform.OS === 'web') {
          // note.audioBuffer is ArrayBuffer
          const bytes = note.audioBuffer;
          const mime = note.mimeType || 'audio/webm';
          const blob = new Blob([bytes], { type: mime });
          const url = URL.createObjectURL(blob);
          playbackSource = { uri: url };
        } else {
          // We stored a uri (see recorder fallback)
          playbackSource = { uri: note.uri };
        }

        const { sound } = await Audio.Sound.createAsync(playbackSource, {
          shouldPlay: true,
        });
        setPlayer(sound);

        // Release object URL after status updates (best-effort)
        if (Platform.OS === 'web') {
          sound.setOnPlaybackStatusUpdate(() => {
            // no-op; cleanup will happen on next play/unmount
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('play error', e);
      }
    },
    [player]
  );

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      const blobOrNative = await stopRecording();
      if (!blobOrNative) return;

      try {
        const createdAt = Date.now();
        const id = String(createdAt);

        if (Platform.OS === 'web') {
          const blob = blobOrNative;
          const audioBuffer = await blobToArrayBuffer(blob);
          await putNote({
            id,
            title: `Заметка ${new Date(createdAt).toLocaleTimeString()}`,
            createdAt,
            mimeType: blob.type || 'audio/webm',
            audioBuffer,
          });
        } else {
          await putNote({
            id,
            title: `Заметка ${new Date(createdAt).toLocaleTimeString()}`,
            createdAt,
            uri: blobOrNative?.uri,
          });
        }

        await loadNotes();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('save error', e);
      }
    } else {
      await reset();
      await startRecording();
    }
  }, [isRecording, loadNotes, reset, startRecording, stopRecording]);

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteNote(id);
        if (player) {
          try {
            await player.stopAsync();
            await player.unloadAsync();
          } catch {
            // ignore
          }
          setPlayer(null);
        }
        await loadNotes();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('delete error', e);
      }
    },
    [loadNotes, player]
  );

  const handleResetAll = useCallback(async () => {
    if (player) {
      try {
        await player.stopAsync();
        await player.unloadAsync();
      } catch {
        // ignore
      }
      setPlayer(null);
    }
    await clearNotes();
    await loadNotes();
  }, [loadNotes, player]);

  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={[styles.page, makeGridBackgroundStyle()]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Голосовые заметки</Text>

      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.recordBtn, isRecording ? styles.recording : null]}
          onPress={handleRecordToggle}
        >
          <Text style={styles.recordBtnText}>{isRecording ? 'Стоп' : 'Запись'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetAll}>
          <Text style={styles.resetBtnText}>Сброс</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {notes.length === 0 ? (
          <Text style={styles.empty}>Пока нет заметок. Нажми «Запись».</Text>
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
              title={n.title}
              createdAt={n.createdAt}
              hasAudio={!!n.audioBuffer || !!n.uri}
              onPlay={() => play(n)}
              onDelete={() => handleDelete(n.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    page: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 24,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      color: '#f2f2f6',
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 0.2,
      marginBottom: 6,
    },
    subtitle: {
      color: 'rgba(242,242,246,0.6)',
      fontSize: 12,
      fontWeight: '700',
    },
    controls: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    recordBtn: {
      backgroundColor: 'rgba(120,120,255,0.18)',
      borderColor: 'rgba(120,120,255,0.55)',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      minWidth: 140,
      alignItems: 'center',
    },
    recording: {
      backgroundColor: 'rgba(255,80,80,0.16)',
      borderColor: 'rgba(255,80,80,0.65)',
    },
    recordBtnText: {
      color: '#f2f2f6',
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    resetBtn: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      alignItems: 'center',
    },
    resetBtnText: {
      color: 'rgba(242,242,246,0.8)',
      fontWeight: '900',
      fontSize: 12,
    },
    error: {
      color: 'rgba(255,120,120,0.95)',
      fontWeight: '900',
      marginBottom: 10,
    },
    list: {
      flex: 1,
      paddingTop: 6,
    },
    empty: {
      color: 'rgba(242,242,246,0.6)',
      fontWeight: '800',
      paddingTop: 20,
      textAlign: 'center',
    },
  });
}



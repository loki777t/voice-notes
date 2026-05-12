import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NoteCard({
  title,
  createdAt,
  hasAudio,
  onPlay,
  onDelete,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Без названия'}
        </Text>
        <Text style={styles.meta}>
          {new Date(createdAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, !hasAudio && styles.btnDisabled]}
          onPress={onPlay}
          disabled={!hasAudio}
        >
          <Text style={styles.btnText}>Прослушать</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDanger} onPress={onDelete}>
          <Text style={styles.btnText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(20,20,20,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  left: { flex: 1, minWidth: 0 },
  title: {
    color: '#e9e9e9',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  meta: {
    color: 'rgba(233,233,233,0.55)',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    backgroundColor: 'rgba(100,100,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(140,140,255,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnDanger: {
    backgroundColor: 'rgba(255,80,80,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: {
    color: '#e9e9e9',
    fontWeight: '800',
    fontSize: 12,
  },
});


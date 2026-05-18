/**
 * ClipSelector — Range selector for choosing a video section to download.
 * Features:
 *  - Timeline with dimmed unselected regions and highlighted selection
 *  - Draggable start/end handles with proper visual feedback
 *  - Manual time input fields (supports "." as ":" separator, e.g. 2.34 -> 2:34)
 *  - Quick presets (30s, 1m, 2m, 5m, Full)
 *  - Minimum clip duration: 30 seconds
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  TextInput,
  Keyboard,
} from 'react-native';
import { Text, useTheme, Button, Chip } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SPACING, RADIUS } from '../constants/colors';

interface ClipSelectorProps {
  duration: number; // total video duration in seconds
  onConfirm: (startSec: number, endSec: number) => void;
  onCancel: () => void;
}

const MIN_CLIP_DURATION = 30;
const HANDLE_WIDTH = 24;
const TIMELINE_PADDING = 16;

/** Format seconds to M:SS or H:MM:SS */
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Parse a user-typed time string to seconds. Supports "." and ":" as separator.
 *  Examples: "2.34" -> 154, "2:34" -> 154, "1.05.30" -> 3930, "90" -> 90
 */
const parseTimeInput = (input: string, maxDuration: number): number | null => {
  const cleaned = input.trim().replace(/\./g, ':');
  if (!cleaned) return null;

  // Single number = raw seconds
  if (/^\d+$/.test(cleaned)) {
    const val = parseInt(cleaned, 10);
    return val >= 0 && val <= maxDuration ? val : null;
  }

  const parts = cleaned.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(s)) return null;
    const total = m * 60 + s;
    return total >= 0 && total <= maxDuration ? total : null;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
    const total = h * 3600 + m * 60 + s;
    return total >= 0 && total <= maxDuration ? total : null;
  }
  return null;
};

const ClipSelector = ({ duration, onConfirm, onCancel }: ClipSelectorProps) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(200); // Will be measured via onLayout

  const onTrackLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidth) setTrackWidth(w);
  };

  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(Math.min(duration, Math.max(MIN_CLIP_DURATION, duration)));

  // Manual input state
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);

  const clipDuration = endSec - startSec;
  const isValid = clipDuration >= MIN_CLIP_DURATION;

  const secToPos = (sec: number) => (sec / duration) * trackWidth;
  const posToSec = (pos: number) => Math.round((pos / trackWidth) * duration);

  const startPos = secToPos(startSec);
  const endPos = secToPos(endSec);

  // Refs to avoid recreating PanResponders during drag
  const startSecRef = useRef(startSec);
  const endSecRef = useRef(endSec);
  const durationRef = useRef(duration);
  const trackWidthRef = useRef(trackWidth);

  useEffect(() => {
    startSecRef.current = startSec;
    endSecRef.current = endSec;
    durationRef.current = duration;
    trackWidthRef.current = trackWidth;
  }, [startSec, endSec, duration, trackWidth]);

  // PanResponders for handles
  const startPanResponder = useMemo(() => {
    let initialSec = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        initialSec = startSecRef.current;
      },
      onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        const d = durationRef.current;
        const tw = trackWidthRef.current;
        const currentEnd = endSecRef.current;
        const deltaSec = Math.round((gs.dx / tw) * d);
        let newSec = Math.max(0, Math.min(d, initialSec + deltaSec));
        newSec = Math.min(newSec, currentEnd - MIN_CLIP_DURATION);
        newSec = Math.max(0, newSec);
        setStartSec(newSec);
      },
    });
  }, []); // Empty deps, relies on refs

  const endPanResponder = useMemo(() => {
    let initialSec = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        initialSec = endSecRef.current;
      },
      onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        const d = durationRef.current;
        const tw = trackWidthRef.current;
        const currentStart = startSecRef.current;
        const deltaSec = Math.round((gs.dx / tw) * d);
        let newSec = Math.max(0, Math.min(d, initialSec + deltaSec));
        newSec = Math.max(newSec, currentStart + MIN_CLIP_DURATION);
        newSec = Math.min(d, newSec);
        setEndSec(newSec);
      },
    });
  }, []); // Empty deps, relies on refs

  // Manual input commit
  const commitStartInput = () => {
    setEditingStart(false);
    const parsed = parseTimeInput(startInput, duration);
    if (parsed !== null && parsed <= endSec - MIN_CLIP_DURATION) {
      setStartSec(parsed);
    }
    setStartInput('');
    Keyboard.dismiss();
  };

  const commitEndInput = () => {
    setEditingEnd(false);
    const parsed = parseTimeInput(endInput, duration);
    if (parsed !== null && parsed >= startSec + MIN_CLIP_DURATION) {
      setEndSec(parsed);
    }
    setEndInput('');
    Keyboard.dismiss();
  };

  // Quick presets
  const setPreset = (durationSec: number) => {
    const halfDur = durationSec / 2;
    const center = (startSec + endSec) / 2;
    const newStart = Math.max(0, center - halfDur);
    const newEnd = Math.min(duration, newStart + durationSec);
    setStartSec(Math.round(newStart));
    setEndSec(Math.round(newEnd));
  };

  // Colors
  const selectedColor = theme.colors.primary;
  const dimColor = theme.colors.surfaceVariant;
  const highlightColor = selectedColor + '55';

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      style={[styles.container, { backgroundColor: theme.colors.elevation.level2 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Icon name="content-cut" size={20} color={theme.colors.primary} />
        <Text
          variant="titleSmall"
          style={[styles.headerText, { color: theme.colors.onSurface }]}
        >
          Clip Selection
        </Text>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Min {MIN_CLIP_DURATION}s
        </Text>
      </View>

      {/* Time Display / Manual Input */}
      <View style={styles.timeRow}>
        {/* START */}
        <View style={[styles.timeBox, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}
          >
            START
          </Text>
          {editingStart ? (
            <TextInput
              value={startInput}
              onChangeText={setStartInput}
              onBlur={commitStartInput}
              onSubmitEditing={commitStartInput}
              autoFocus
              placeholder={formatTime(startSec)}
              placeholderTextColor={theme.colors.onPrimaryContainer + '66'}
              keyboardType="default"
              style={[
                styles.timeInput,
                { color: theme.colors.onPrimaryContainer },
              ]}
            />
          ) : (
            <Text
              variant="titleMedium"
              style={[styles.timeValue, { color: theme.colors.onPrimaryContainer }]}
              onPress={() => {
                setEditingStart(true);
                setStartInput(formatTime(startSec));
              }}
            >
              {formatTime(startSec)}
            </Text>
          )}
        </View>

        {/* Duration badge */}
        <View style={styles.durationDisplay}>
          <Icon name="arrow-right" size={16} color={theme.colors.onSurfaceVariant} />
          <Text
            variant="labelMedium"
            style={{
              color: isValid ? theme.colors.primary : theme.colors.error,
              fontWeight: '700',
            }}
          >
            {formatTime(clipDuration)}
          </Text>
        </View>

        {/* END */}
        <View style={[styles.timeBox, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}
          >
            END
          </Text>
          {editingEnd ? (
            <TextInput
              value={endInput}
              onChangeText={setEndInput}
              onBlur={commitEndInput}
              onSubmitEditing={commitEndInput}
              autoFocus
              placeholder={formatTime(endSec)}
              placeholderTextColor={theme.colors.onPrimaryContainer + '66'}
              keyboardType="default"
              style={[
                styles.timeInput,
                { color: theme.colors.onPrimaryContainer },
              ]}
            />
          ) : (
            <Text
              variant="titleMedium"
              style={[styles.timeValue, { color: theme.colors.onPrimaryContainer }]}
              onPress={() => {
                setEditingEnd(true);
                setEndInput(formatTime(endSec));
              }}
            >
              {formatTime(endSec)}
            </Text>
          )}
        </View>
      </View>

      {/* Timeline Track */}
      <View style={styles.timeline}>
        <View
          style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}
          onLayout={onTrackLayout}
        >
          <View style={styles.trackInner}>

            {/* Left dimmed region (before start) */}
            {startPos > 0 && (
              <View
                style={[
                  styles.dimRegion,
                  {
                    left: 0,
                    width: startPos,
                    backgroundColor: dimColor,
                  },
                ]}
              />
            )}

            {/* Selected range (highlighted) */}
            <View
              style={[
                styles.selectedRange,
                {
                  left: startPos,
                  width: Math.max(endPos - startPos, 0),
                  backgroundColor: highlightColor,
                  borderLeftWidth: 2,
                  borderRightWidth: 2,
                  borderColor: selectedColor,
                },
              ]}
            />

            {/* Right dimmed region (after end) */}
            {endPos < trackWidth && (
              <View
                style={[
                  styles.dimRegion,
                  {
                    left: endPos,
                    width: trackWidth - endPos,
                    backgroundColor: dimColor,
                  },
                ]}
              />
            )}
          </View>

          {/* Handles (outside trackInner so they can overflow) */}
          <View
            {...startPanResponder.panHandlers}
            style={[
              styles.clipHandle,
              {
                left: startPos - HANDLE_WIDTH / 2,
                backgroundColor: selectedColor,
              },
            ]}
          >
            <View style={styles.handleLine} />
            <View style={styles.handleLine} />
          </View>

          <View
            {...endPanResponder.panHandlers}
            style={[
              styles.clipHandle,
              {
                left: endPos - HANDLE_WIDTH / 2,
                backgroundColor: selectedColor,
              },
            ]}
          >
            <View style={styles.handleLine} />
            <View style={styles.handleLine} />
          </View>
        </View>

        {/* Time labels */}
        <View style={styles.timeLabels}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            0:00
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Quick Presets */}
      {duration > 60 && (
        <View style={styles.presets}>
          {[30, 60, 120, 300].filter((d) => d <= duration).map((d) => (
            <Chip
              key={d}
              mode="outlined"
              compact
              onPress={() => setPreset(d)}
              style={styles.presetChip}
              textStyle={{ fontSize: 11 }}
            >
              {d < 60 ? `${d}s` : `${d / 60}m`}
            </Chip>
          ))}
          <Chip
            mode="outlined"
            compact
            onPress={() => { setStartSec(0); setEndSec(duration); }}
            style={styles.presetChip}
            textStyle={{ fontSize: 11 }}
          >
            Full
          </Chip>
        </View>
      )}

      {/* Tap hint */}
      <Text
        variant="labelSmall"
        style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6, marginBottom: SPACING.sm, textAlign: 'center' }}
      >
        Tap times to edit manually • Use "." as ":"  (e.g. 2.34)
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="text"
          onPress={onCancel}
          textColor={theme.colors.onSurfaceVariant}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={() => onConfirm(startSec, endSec)}
          disabled={!isValid}
          style={styles.confirmBtn}
          icon={({ size, color }) => (
            <Icon name="content-cut" size={size} color={color} />
          )}
        >
          Download Clip
        </Button>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.sm,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerText: {
    fontWeight: '700',
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  timeBox: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  timeValue: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeInput: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    minWidth: 60,
    height: 28,
    fontVariant: ['tabular-nums'],
  },
  durationDisplay: {
    alignItems: 'center',
    gap: 2,
  },
  timeline: {
    marginBottom: SPACING.md,
    paddingHorizontal: HANDLE_WIDTH / 2,
  },
  track: {
    height: 56,
    borderRadius: RADIUS.sm,
    position: 'relative',
    overflow: 'visible',
  },
  trackInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  dimRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    opacity: 0.7,
  },
  selectedRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  clipHandle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: 64,
    top: -4,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  handleLine: {
    width: 3,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1.5,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  presets: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  presetChip: {
    borderRadius: RADIUS.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  confirmBtn: {
    borderRadius: RADIUS.full,
  },
});

export default ClipSelector;

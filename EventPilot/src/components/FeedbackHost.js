import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../constants/theme';
import { subscribeFeedback } from '../utils/feedback';

/** Persistent across navigation; new actions replace stale messages and timers. */
export default function FeedbackHost() {
  const [feedback, setFeedback] = useState(null);
  const [progress] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  useEffect(() => subscribeFeedback(setFeedback), []);
  useEffect(() => {
    if (!feedback) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 200, useNativeDriver: true });
    animation.start();
    const timer = setTimeout(() => setFeedback(current => current?.id === feedback.id ? null : current), feedback.type === 'error' ? 7000 : 4500);
    return () => { clearTimeout(timer); animation.stop(); };
  }, [feedback, progress]);
  if (!feedback) return null;
  const error = feedback.type === 'error';
  const accent = error ? colors.danger : '#18765B';
  return <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 64 }]}>
    <Animated.View testID="action-feedback" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.card, { borderLeftColor: accent, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
      <View style={[styles.icon, { backgroundColor: error ? '#FDEDF0' : '#E6F5EE' }]}><Ionicons name={error ? 'alert-circle' : 'checkmark-circle'} size={25} color={accent} /></View>
      <View style={styles.copy}><Text style={styles.title}>{feedback.title}</Text>{!!feedback.message && <Text numberOfLines={3} style={styles.message}>{feedback.message}</Text>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => setFeedback(null)} style={({ pressed }) => [styles.close, pressed && { opacity: 0.5 }]}><Ionicons name="close" size={20} color={colors.text} /></Pressable>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', zIndex: 1000, elevation: 30 },
  card: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingVertical: spacing.md, paddingRight: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderRadius: radii.md, elevation: 12, shadowColor: '#211A35', shadowOpacity: 0.15, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  icon: { width: 42, height: 42, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.label, color: colors.heading },
  message: { ...typography.caption, color: colors.text },
  close: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});

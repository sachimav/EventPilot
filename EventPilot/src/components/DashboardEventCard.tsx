import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Event } from '../database';
import { cardStyle, colors, radii, spacing, typography } from '../constants/theme';

export default function DashboardEventCard({ event }: { event: Event }) {
  const date = new Date(`${event.date}T12:00:00`);
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  const fullDate = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return <Link href={{ pathname: '/events/[id]', params: { id: event.id } }} asChild>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${event.name}, ${fullDate}${event.time ? ` at ${event.time}` : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.main}>
        <View style={styles.dateTile}>
          <Text style={styles.month}>{month.toUpperCase()}</Text>
          <Text style={styles.day}>{date.getDate()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.category}>{event.category}</Text>
          <Text style={styles.title} numberOfLines={2}>{event.name}</Text>
          <Text style={styles.date}>{fullDate}</Text>
        </View>
        <Ionicons name="chevron-forward" color={colors.primary} size={20} />
      </View>
      <View style={styles.footer}>
        <View style={styles.meta}><Ionicons name="time-outline" size={16} color={colors.primary} /><Text style={styles.time}>{event.time || 'Time not set'}</Text></View>
        <View style={[styles.meta, styles.venue]}><Ionicons name="location-outline" size={16} color={colors.text} /><Text numberOfLines={2} style={styles.location}>{event.location || 'Location not set'}</Text></View>
      </View>
    </Pressable>
  </Link>;
}

const styles = StyleSheet.create({
  card: { ...cardStyle, padding: spacing.lg, gap: spacing.lg },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateTile: { minWidth: 64, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center' },
  month: { ...typography.caption, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  day: { ...typography.title, color: colors.primary },
  info: { flex: 1, gap: spacing.xs },
  category: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  title: { ...typography.heading, color: colors.heading },
  date: { ...typography.caption, color: colors.text },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  meta: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  venue: { flex: 1, minWidth: 120 },
  time: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  location: { ...typography.caption, color: colors.text, flexShrink: 1 },
  pressed: { opacity: 0.75, backgroundColor: colors.primarySoft },
});

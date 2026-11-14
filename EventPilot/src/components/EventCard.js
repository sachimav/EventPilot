import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardStyle, colors, radii, spacing, typography } from '../constants/theme';

/** @param {{ title: string, date: string, location: string, status?: string, href?: import('expo-router').Href }} props */
export default function EventCard({ title, date, location, status = 'Sample event', href }) {
  const content = <>
    <View style={styles.top}><View style={styles.icon}><Ionicons name="calendar-outline" size={24} color={colors.primary} /></View><Text style={styles.badge}>{status}</Text></View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.meta}>{date}</Text>
    <View style={styles.location}><Ionicons name="location-outline" size={16} color={colors.text} /><Text style={styles.meta}>{location}</Text></View>
    {href ? <Text style={styles.link}>View event →</Text> : null}
  </>;
  return href ? <Link href={href} style={styles.card} asChild><Pressable accessibilityRole="button" accessibilityLabel={`View ${title}`}>{content}</Pressable></Link> : <View style={styles.card}>{content}</View>;
}
const styles = StyleSheet.create({
  card: { ...cardStyle, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  icon: { padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.primarySoft },
  badge: { ...typography.caption, color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  title: { ...typography.heading, color: colors.heading },
  meta: { ...typography.caption, color: colors.text, flexShrink: 1 },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  link: { ...typography.label, color: colors.primary, marginTop: spacing.sm },
  pressed: { opacity: 0.75 },
});

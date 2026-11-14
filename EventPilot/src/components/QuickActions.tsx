import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

interface Action { title: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name']; href: Href }
export default function QuickActions({ actions, title = 'Quick actions' }: { actions: Action[]; title?: string }) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
    <View style={styles.grid}>{actions.map((action) => <Link key={action.title} href={action.href} style={styles.card} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={action.title}>
        <View style={styles.top}><View style={styles.icon}><Ionicons name={action.icon} size={23} color={colors.primary} /></View><Ionicons name="arrow-forward" size={18} color={colors.primary} /></View>
        <Text style={styles.title}>{action.title}</Text>
        <Text style={styles.description}>{action.description}</Text>
      </Pressable>
    </Link>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.md }, heading: { ...typography.heading, color: colors.heading },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { flexGrow: 1, flexBasis: 140, minHeight: 144, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { padding: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radii.sm },
  title: { ...typography.label, color: colors.heading }, description: { ...typography.caption, color: colors.text },
  pressed: { backgroundColor: colors.primarySoft, opacity: 0.85 },
});

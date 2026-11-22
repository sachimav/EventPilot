import { useTheme, useThemedStyles } from '../hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radii, spacing, typography } from '../constants/theme';
import { eventIntervalLabel } from '../utils/eventConflicts';
import AppButton from './AppButton';

export default function EventConflictModal({ conflicts, onClose, restoring = false }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useThemedStyles(createStyles);
  return <Modal visible={conflicts.length > 0} transparent animationType="fade" onRequestClose={onClose} accessibilityLabel="Event already scheduled">
    <SafeAreaView style={styles.overlay}>
      <View style={styles.card} accessibilityViewIsModal>
        <View style={styles.header}>
          <View style={styles.icon}><Ionicons name="calendar-outline" size={28} color={colors.primary} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close schedule warning" onPress={onClose} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.title}>This time is already scheduled</Text>
        <Text style={styles.description}>{restoring ? 'Another active event reserves this time. Reschedule or archive the conflicting event before restoring this plan.' : `You already have ${conflicts.length === 1 ? 'an event' : 'events'} planned during this time. Choose another date or time to continue.`}</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {conflicts.map((event) => <View key={event.id} style={styles.event}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={styles.timeRow}><Ionicons name="time-outline" size={17} color={colors.primary} /><Text style={styles.time}>{eventIntervalLabel(event)}</Text></View>
          </View>)}
        </ScrollView>
        <Text style={styles.note}>{restoring ? 'Your saved plan is safe and remains in Archive & Trash.' : 'Your entries are safe. This event hasn’t been saved.'}</Text>
        <AppButton title={restoring ? 'Back to recovery' : 'Choose another time'} icon="create-outline" onPress={onClose} />
      </View>
    </SafeAreaView>
  </Modal>;
}

const createStyles = ({ colors }) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(25, 17, 45, 0.55)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md, elevation: 12, shadowColor: '#211A35', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  title: { ...typography.title, color: colors.heading },
  description: { ...typography.body, color: colors.text },
  list: { flexShrink: 1 },
  listContent: { gap: spacing.sm },
  event: { backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.lg, gap: spacing.sm },
  eventName: { ...typography.heading, color: colors.heading },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  time: { ...typography.caption, color: colors.primary, flex: 1 },
  note: { ...typography.caption, color: colors.text },
});

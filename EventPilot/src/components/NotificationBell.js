import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { events, tasks, reminders, subscribeDataChanges } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { useTaskClock } from '../hooks/useTaskClock';
import { buildNotifications } from '../utils/notifications';
import { colors, radii, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import { useSettings } from '../hooks/useSettings';
import { formatSettingsDateTime } from '../utils/settings';

async function loadNotifications() {
  const [eventRows, taskRows, reminderRows] = await Promise.all([events.list(), tasks.list(), reminders.list()]);
  return { events: eventRows, tasks: taskRows, reminders: reminderRows };
}

export default function NotificationBell() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const { data, loading, error, retry } = useFocusQuery(loadNotifications, subscribeDataChanges);
  const now = useTaskClock();
  const insets = useSafeAreaInsets();
  const items = buildNotifications(data, now, settings);
  function navigate(href) { setOpen(false); router.push(href); }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Notifications, ${items.length} pending`} accessibilityState={{ expanded: open }} onPress={() => { setOpen(true); retry(); }} style={styles.bell}>
      <Ionicons name="notifications-outline" size={25} color={colors.primary} />
      {items.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{items.length > 99 ? '99+' : items.length}</Text></View>}
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={[styles.overlay, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close notifications" onPress={() => setOpen(false)} />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.heading}>
            <View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Notifications</Text><Text style={styles.caption}>{items.length} pending · Updates while the app is open</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close notifications" onPress={() => setOpen(false)} style={styles.bell}><Ionicons name="close" size={24} color={colors.heading} /></Pressable>
          </View>
          {error && <View style={styles.message}><Text style={styles.caption}>Unable to refresh notifications.</Text><AppButton title="Try again" onPress={retry} /></View>}
          {loading && !data ? <ActivityIndicator style={styles.message} color={colors.primary} /> : <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            {!items.length && !error && <View style={styles.message}><Ionicons name="notifications-off-outline" size={32} color={colors.text} /><Text style={styles.title}>All caught up</Text><Text style={styles.caption}>Task deadlines, events starting soon, and due reminders will appear here.</Text></View>}
            {items.map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => navigate({ pathname: item.task ? '/events/[id]/tasks' : '/events/[id]', params: { id: item.eventId } })} style={styles.item}>
              <Ionicons name={item.task ? 'checkbox-outline' : 'calendar-outline'} size={23} color={item.at < now && item.task ? colors.danger : colors.primary} />
              <View style={{ flex: 1, gap: spacing.xs }}><Text style={[styles.label, item.at < now && item.task && { color: colors.danger }]}>{item.label}</Text><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.caption}>{item.eventName} · {formatSettingsDateTime(item.at, settings)}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>)}
          </ScrollView>}
          <View style={styles.footer}><AppButton title="Manage reminders" variant="secondary" onPress={() => navigate('/reminders')} /></View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 1, right: 0, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: radii.pill, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#211A3555', paddingHorizontal: spacing.md, alignItems: 'flex-end' },
  panel: { width: '100%', maxWidth: 440, maxHeight: '100%', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', flexShrink: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  title: { ...typography.heading, color: colors.heading },
  caption: { ...typography.caption, color: colors.text },
  label: { ...typography.label, color: colors.primary },
  itemTitle: { ...typography.body, color: colors.heading, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.background },
  message: { padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderColor: colors.border },
});

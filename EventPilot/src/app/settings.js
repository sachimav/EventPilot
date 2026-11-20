import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import PlaceholderScreen from '../components/PlaceholderScreen';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import { useSettings } from '../hooks/useSettings';
import { colors, radii, spacing, typography } from '../constants/theme';

function Group({ title, children }) {
  return <View style={{ gap: spacing.sm }}><Text accessibilityRole="header" style={styles.section}>{title}</Text><View style={styles.group}>{children}</View></View>;
}

function Row({ icon, title, value, description, onPress, children, expanded }) {
  const content = <><View style={styles.icon}><Ionicons name={icon} size={21} color={colors.primary} /></View><View style={{ flex: 1, gap: 3 }}><Text style={styles.label}>{title}</Text>{!!description && <Text style={styles.caption}>{description}</Text>}</View>{!!value && <Text style={styles.value}>{value}</Text>}{children}{onPress && <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.text} />}</>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}${value ? `: ${value}` : ''}`} accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

export default function SettingsScreen() {
  const { settings, ready, saving, error, update, retry } = useSettings();
  const [expanded, setExpanded] = useState('');
  const disabled = !ready || saving;
  function select(key, value) { update({ [key]: value }); }
  function picker(key, icon, title, choices, description) {
    const value = choices.find((choice) => choice.value === settings[key])?.label;
    return <View><Row icon={icon} title={title} value={value} description={description} expanded={expanded === key} onPress={() => setExpanded(expanded === key ? '' : key)} />{expanded === key && <View style={styles.options}><ChoiceChips label={title} choices={choices} value={settings[key]} onChange={(next) => select(key, next)} disabled={disabled} /></View>}</View>;
  }
  function toggle(key, icon, title, description) {
    return <Row icon={icon} title={title} description={description}><Switch accessibilityLabel={title} value={settings[key]} disabled={disabled} onValueChange={(value) => select(key, value)} trackColor={{ false: colors.border, true: colors.primary }} /></Row>;
  }
  return <PlaceholderScreen title="Settings" description="Make EventPilot work your way.">
    <View style={styles.notice}><Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} /><Text style={styles.caption}>{saving ? 'Saving preferences…' : ready ? 'Preferences save automatically on this device.' : 'Loading preferences…'}</Text></View>
    {!!error && <View style={styles.options}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>{!ready && <AppButton title="Retry preferences" onPress={retry} />}</View>}
    {!ready && !error && <ActivityIndicator color={colors.primary} />}
    <Group title="Preferences">
      {picker('timeFormat', 'time-outline', 'Time format', [{ value: 'system', label: 'System' }, { value: '12', label: '12-hour' }, { value: '24', label: '24-hour' }], 'Used in notifications and saved reminders.')}
      {picker('weekStart', 'calendar-number-outline', 'First day of the week', [{ value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }], 'Sets the layout of your planning calendar.')}
    </Group>
    <Group title="Notifications">
      <Text style={[styles.caption, styles.options]}>Alerts appear while EventPilot is open. Choose which updates appear in your notification bell.</Text>
      {toggle('taskAlerts', 'checkbox-outline', 'Task deadlines', 'Show tasks approaching their deadline.')}
      {settings.taskAlerts && picker('taskLeadHours', 'timer-outline', 'Task alert timing', [{ value: 0, label: 'At deadline' }, { value: 1, label: '1 hour before' }, { value: 24, label: '1 day before' }, { value: 48, label: '2 days before' }])}
      {toggle('overdueAlerts', 'alert-circle-outline', 'Overdue tasks', 'Keep unfinished, overdue tasks in view.')}
      {toggle('eventAlerts', 'calendar-outline', 'Event reminders', 'Show upcoming events in the notification bell.')}
      {settings.eventAlerts && picker('eventLeadHours', 'alarm-outline', 'Event alert timing', [{ value: 0, label: 'At start' }, { value: 0.25, label: '15 minutes before' }, { value: 1, label: '1 hour before' }, { value: 24, label: '1 day before' }])}
      {toggle('reminderAlerts', 'notifications-outline', 'Custom reminders', 'Show your saved reminders when they become due.')}
      <Row icon="add-circle-outline" title="Manage reminders" description="Create and dismiss event reminders" onPress={() => router.push('/reminders')} />
    </Group>
    <Group title="Data & storage">
      <Row icon="cloud-download-outline" title="Backup & recovery" description="Export, import, and restore your event data" onPress={() => router.push('/data')} />
      <Row icon="trash-outline" title="Archived & deleted events" description="Manage archived events and restore items from Trash" onPress={() => router.push('/data')} />
    </Group>
    <Group title="Help & about">
      <Row icon="information-circle-outline" title="EventPilot" value={`Version ${Constants.expoConfig?.version ?? '1.0.0'}`} />
    </Group>
  </PlaceholderScreen>;
}

const styles = StyleSheet.create({
  section: { ...typography.label, color: colors.text, paddingHorizontal: spacing.sm },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, overflow: 'hidden' },
  row: { minHeight: 76, padding: spacing.lg, gap: spacing.md, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.label, color: colors.heading },
  caption: { ...typography.caption, color: colors.text },
  value: { ...typography.caption, color: colors.primary, maxWidth: '33%', textAlign: 'right' },
  options: { padding: spacing.lg, gap: spacing.md },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radii.sm },
});

import { useTheme } from '../hooks/useTheme';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { events, subscribeDataChanges } from '../database';
import { exportBackup, parseBackup, restoreBackup } from '../database/backups';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { readTextFile, saveTextFile } from '../utils/files';
import { spacing } from '../constants/theme';
import AppInput from './AppInput';
import AppButton from './AppButton';
import EmptyState from './EmptyState';
import { showSuccess, showError } from '../utils/feedback';
export default function DataRecovery() {
  const theme = useTheme();
  const { colors, cardStyle } = theme;
    const { data, retry } = useFocusQuery(events.inactive, subscribeDataChanges);
    const [text, setText] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [purge, setPurge] = useState(null);
    async function run(action, successTitle) {
        if (busy) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await action();
            if (result === false) throw new Error('Event no longer exists.');
            retry();
            if (successTitle) showSuccess(successTitle);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to complete this action.');
            showError('Action could not be completed', error instanceof Error ? error.message : 'Please try again.');
        }
        finally {
            setBusy(false);
        }
    }
    return <View style={{ gap: spacing.lg }}>
    <AppButton title="Download backup" disabled={busy} icon="download-outline" onPress={() => run(async () => { await saveTextFile('eventpilot-backup.json', await exportBackup(), 'application/json'); setMessage('Backup exported. Keep it in a safe place.'); }, 'Backup export ready')}/>
    <AppButton title="Choose backup file" variant="secondary" disabled={busy} onPress={() => run(async () => { const value = await readTextFile(); parseBackup(value); setText(value); setConfirm(false); setMessage('Backup validated. Review and confirm import below.'); }, 'Backup ready to import')}/>
    <AppInput label="Backup JSON" value={text} onChangeText={(value) => { setText(value); setConfirm(false); }} multiline editable={!busy}/>
    <Text style={{ color: colors.heading }}>Restore adds copies with new IDs and preserves existing data. Importing the same file twice creates duplicate events.</Text>
    {confirm ? <>
      <Text style={{ color: colors.heading }} accessibilityRole="alert">Import this backup? Existing events will be kept.</Text>
      <AppButton title="Confirm import" disabled={busy} onPress={() => run(async () => { const count = await restoreBackup(text); setText(''); setConfirm(false); setMessage(`Imported ${count} records.`); }, 'Backup restored successfully')}/>
      <AppButton title="Cancel import" variant="secondary" disabled={busy} onPress={() => setConfirm(false)}/>
    </> : <AppButton title="Validate and restore" disabled={busy || !text} onPress={() => { try {
            parseBackup(text);
            setConfirm(true);
            setMessage('');
        }
        catch (error) {
            setMessage(String(error));
            showError('Invalid backup', 'Please select a compatible EventPilot backup.');
        } }}/>}
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.primary }}>{message}</Text>}
    <Text style={{ color: colors.heading, fontSize: 20, fontWeight: '600' }}>Archive & Trash</Text>
    {!data?.length ? <EmptyState title="Nothing to recover" description="Archived and deleted events will appear here."/> : data.map((event) => <View key={event.id} style={{ ...cardStyle, gap: spacing.md }}>
      <Text style={{ color: colors.heading }}>{event.name} · {event.deleted_at ? 'Trash' : 'Archived'}</Text>
      <AppButton title="Restore event" disabled={busy} onPress={() => run(() => events.update(event.id, { archived_at: null, deleted_at: null }), 'Event restored')}/>
      {purge === event.id ? <>
        <Text style={{ color: colors.heading }} accessibilityRole="alert">This permanently deletes the event and all its related records.</Text>
        <AppButton title="Permanently delete" variant="danger" disabled={busy} onPress={() => run(async () => { if (!await events.delete(event.id)) throw new Error('Event no longer exists.'); setPurge(null); }, 'Event permanently deleted')}/>
        <AppButton title="Keep event" variant="secondary" disabled={busy} onPress={() => setPurge(null)}/>
      </> : <AppButton title="Delete permanently" variant="danger" disabled={busy} onPress={() => setPurge(event.id)}/>}
    </View>)}
  </View>;
}

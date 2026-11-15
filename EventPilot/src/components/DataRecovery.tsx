import { useState } from 'react';
import { Text, View } from 'react-native';
import { events, subscribeDataChanges } from '../database';
import { exportBackup, parseBackup, restoreBackup } from '../database/backups';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { readTextFile, saveTextFile } from '../utils/files';
import { cardStyle, colors, spacing } from '../constants/theme';
import AppInput from './AppInput';
import AppButton from './AppButton';
import EmptyState from './EmptyState';

export default function DataRecovery() {
  const { data, retry } = useFocusQuery(events.inactive, subscribeDataChanges);
  const [text, setText] = useState(''); const [confirm, setConfirm] = useState(false);
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [purge,setPurge] = useState<number | null>(null);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setMessage('');
    try { await action(); retry(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to complete this action.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: spacing.lg }}>
    <AppButton title="Download backup" disabled={busy} icon="download-outline" onPress={() => run(async () => { await saveTextFile('eventpilot-backup.json', await exportBackup(), 'application/json'); setMessage('Backup exported. Keep it in a safe place.'); })} />
    <AppButton title="Choose backup file" variant="secondary" disabled={busy} onPress={() => run(async () => { const value = await readTextFile(); parseBackup(value); setText(value); setConfirm(false); setMessage('Backup validated. Review and confirm import below.'); })} />
    <AppInput label="Backup JSON" value={text} onChangeText={(value) => { setText(value); setConfirm(false); }} multiline editable={!busy} />
    <Text>Restore adds copies with new IDs and preserves existing data. Importing the same file twice creates duplicate events.</Text>
    {confirm ? <>
      <Text accessibilityRole="alert">Import this backup? Existing events will be kept.</Text>
      <AppButton title="Confirm import" disabled={busy} onPress={() => run(async () => { const count = await restoreBackup(text); setText(''); setConfirm(false); setMessage(`Imported ${count} records.`); })} />
      <AppButton title="Cancel import" variant="secondary" disabled={busy} onPress={() => setConfirm(false)} />
    </> : <AppButton title="Validate and restore" disabled={busy || !text} onPress={() => { try { parseBackup(text); setConfirm(true); setMessage(''); } catch (error) { setMessage(String(error)); } }} />}
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.primary }}>{message}</Text>}
    <Text style={{ fontSize: 20, fontWeight: '600' }}>Archive & Trash</Text>
    {!data?.length ? <EmptyState title="Nothing to recover" description="Archived and deleted events will appear here." /> : data.map((event) => <View key={event.id} style={{ ...cardStyle, gap: spacing.md }}>
      <Text>{event.name} · {event.deleted_at ? 'Trash' : 'Archived'}</Text>
      <AppButton title="Restore event" disabled={busy} onPress={() => run(() => events.update(event.id, { archived_at: null, deleted_at: null }))} />
      {purge === event.id ? <>
        <Text accessibilityRole="alert">This permanently deletes the event and all its related records.</Text>
        <AppButton title="Permanently delete" variant="danger" disabled={busy} onPress={() => run(async () => { await events.delete(event.id); setPurge(null); })} />
        <AppButton title="Keep event" variant="secondary" disabled={busy} onPress={() => setPurge(null)} />
      </> : <AppButton title="Delete permanently" variant="danger" disabled={busy} onPress={() => setPurge(event.id)} />}
    </View>)}
  </View>;
}

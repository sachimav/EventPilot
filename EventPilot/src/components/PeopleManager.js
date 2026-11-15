import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { guests, vendors } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { budgetCents } from '../utils/eventForm';
import { formatLkr, amountInput } from '../utils/budgetManager';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import AppInput from './AppInput';
import ChoiceChips from './ChoiceChips';
import EmptyState from './EmptyState';
const blank = { name: '', email: '', phone: '', rsvp: 'invited', plus_ones: '0', dietary: '', service: '', contact: '', quote: '0', booking_status: 'inquiry', notes: '' };
export default function PeopleManager({ eventId, kind }) {
    const guestMode = kind === 'guests';
    const noun = guestMode ? 'guest' : 'vendor';
    const query = useCallback(async () => guestMode ? guests.listByEvent(eventId) : vendors.listByEvent(eventId), [guestMode, eventId]);
    const { data, loading, error, retry } = useFocusQuery(query);
    const [editor, setEditor] = useState(null);
    const [values, setValues] = useState(blank);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [removeId, setRemoveId] = useState(null);
    const [filter, setFilter] = useState('all');
    const change = (key, value) => setValues((old) => ({ ...old, [key]: value }));
    async function run(action) {
        if (busy)
            return;
        setBusy(true);
        setMessage('');
        try {
            await action();
            retry();
        }
        catch (cause) {
            console.error(cause);
            setMessage(`Unable to save this ${noun}. Please try again.`);
        }
        finally {
            setBusy(false);
        }
    }
    async function save() {
        if (!values.name.trim()) {
            setMessage('Name is required.');
            return;
        }
        if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
            setMessage('Enter a valid email address.');
            return;
        }
        if (guestMode && (!/^\d+$/.test(values.plus_ones) || Number(values.plus_ones) > 20)) {
            setMessage('Plus-ones must be a whole number from 0 to 20.');
            return;
        }
        if (!guestMode && budgetCents(values.quote) === null) {
            setMessage('Quote must be a nonnegative LKR amount with up to two decimal places.');
            return;
        }
        await run(async () => {
            if (guestMode) {
                const input = { event_id: eventId, name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), rsvp: values.rsvp, plus_ones: Number(values.plus_ones), dietary: values.dietary.trim() };
                if (editor === 'new')
                    await guests.create(input);
                else if (!await guests.update(editor, input))
                    throw new Error('Guest no longer exists.');
            }
            else {
                const input = { event_id: eventId, name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), service: values.service.trim(), contact: values.contact.trim(), quoted_cents: budgetCents(values.quote), booking_status: values.booking_status, notes: values.notes.trim() };
                if (editor === 'new')
                    await vendors.create(input);
                else if (!await vendors.update(editor, input))
                    throw new Error('Vendor no longer exists.');
            }
            setEditor(null);
        });
    }
    function edit(row) {
        setMessage('');
        setEditor(row.id);
        setValues({ ...blank, name: row.name, email: row.email, phone: row.phone,
            ...('rsvp' in row ? { rsvp: row.rsvp, plus_ones: String(row.plus_ones), dietary: row.dietary }
                : { service: row.service, contact: row.contact, quote: amountInput(row.quoted_cents), booking_status: row.booking_status, notes: row.notes }) });
    }
    const options = guestMode ? ['invited', 'confirmed', 'tentative', 'declined'] : ['inquiry', 'quoted', 'booked', 'cancelled'];
    const shown = (data ?? []).filter((row) => filter === 'all' || ('rsvp' in row ? row.rsvp : row.booking_status) === filter);
    const confirmed = (data ?? []).reduce((sum, row) => sum + ('rsvp' in row && row.rsvp === 'confirmed' ? 1 + row.plus_ones : 0), 0);
    return <View style={{ gap: spacing.lg }}>
    {guestMode && <Text style={{ ...typography.heading, color: colors.primary }}>{data?.length ?? 0} guests · {confirmed} confirmed attendees including plus-ones</Text>}
    <AppButton title={`Add ${noun}`} icon="add-circle-outline" disabled={busy || editor !== null} onPress={() => { setEditor('new'); setValues(blank); setMessage(''); }}/>
    {editor !== null && <View style={{ ...cardStyle, gap: spacing.md }}>
      <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{editor === 'new' ? 'Add' : 'Edit'} {noun}</Text>
      <AppInput label="Name *" value={values.name} onChangeText={(v) => change('name', v)} editable={!busy}/>
      <AppInput label="Email" value={values.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(v) => change('email', v)} editable={!busy}/>
      <AppInput label="Phone" value={values.phone} keyboardType="phone-pad" onChangeText={(v) => change('phone', v)} editable={!busy}/>
      {guestMode ? <>
        <ChoiceChips label="RSVP" choices={options.map((value) => ({ value, label: value }))} value={values.rsvp} onChange={(v) => change('rsvp', v)} disabled={busy}/>
        <AppInput label="Plus-ones" value={values.plus_ones} keyboardType="number-pad" onChangeText={(v) => change('plus_ones', v)} editable={!busy}/>
        <AppInput label="Dietary requirements" value={values.dietary} onChangeText={(v) => change('dietary', v)} editable={!busy}/>
      </> : <>
        <AppInput label="Service" value={values.service} onChangeText={(v) => change('service', v)} editable={!busy}/>
        <AppInput label="Contact person" value={values.contact} onChangeText={(v) => change('contact', v)} editable={!busy}/>
        <AppInput label="Quoted amount (Rs.)" value={values.quote} keyboardType="decimal-pad" onChangeText={(v) => change('quote', v)} editable={!busy}/>
        <ChoiceChips label="Booking status" choices={options.map((value) => ({ value, label: value }))} value={values.booking_status} onChange={(v) => change('booking_status', v)} disabled={busy}/>
        <AppInput label="Notes" multiline value={values.notes} onChangeText={(v) => change('notes', v)} editable={!busy}/>
      </>}
      <AppButton title={`Save ${noun}`} disabled={busy} onPress={save}/>
      <AppButton title="Cancel" variant="secondary" disabled={busy} onPress={() => { setEditor(null); setMessage(''); }}/>
    </View>}
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{message}</Text>}
    <ChoiceChips label={`Filter ${kind}`} choices={[{ value: 'all', label: 'All' }, ...options.map((value) => ({ value, label: value }))]} value={filter} onChange={setFilter} disabled={busy}/>
    {loading && !data ? <ActivityIndicator color={colors.primary}/> : error ? <AppButton title="Retry loading" onPress={retry}/> : shown.length === 0 ? <EmptyState title={`No ${kind} here yet`} description={`Add a ${noun} or select a different filter.`}/>
            : shown.map((row) => <View key={row.id} style={{ ...cardStyle, gap: spacing.md }}>
        <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{row.name}</Text>
        <Text style={{ color: colors.text }}>{[row.email, row.phone].filter(Boolean).join(' · ') || 'No contact details added'}</Text>
        {'rsvp' in row ? <>
          <Text>{row.rsvp} · {row.plus_ones} plus-ones · {row.checked_in ? 'Checked in' : 'Not checked in'}</Text>
          {!!row.dietary && <Text>Dietary: {row.dietary}</Text>}
          <AppButton title={row.checked_in ? 'Undo check-in' : 'Check in guest'} disabled={busy || editor !== null} onPress={() => run(() => guests.update(row.id, { checked_in: row.checked_in ? 0 : 1 }))}/>
        </> : <Text>{row.service} · {row.booking_status} · {formatLkr(row.quoted_cents)}{row.contact ? ` · ${row.contact}` : ''}{row.notes ? `\n${row.notes}` : ''}</Text>}
        <AppButton title={`Edit ${noun}`} variant="secondary" disabled={busy || editor !== null} onPress={() => edit(row)}/>
        {removeId === row.id ? <>
          <Text accessibilityRole="alert">Permanently delete this {noun}?</Text>
          <AppButton title="Confirm deletion" variant="danger" disabled={busy} onPress={() => run(async () => { if (guestMode)
                    await guests.delete(row.id);
                else
                    await vendors.delete(row.id); setRemoveId(null); })}/>
          <AppButton title="Keep record" variant="secondary" disabled={busy} onPress={() => setRemoveId(null)}/>
        </> : <AppButton title={`Delete ${noun}`} variant="danger" disabled={busy || editor !== null} onPress={() => setRemoveId(row.id)}/>}
      </View>)}
  </View>;
}

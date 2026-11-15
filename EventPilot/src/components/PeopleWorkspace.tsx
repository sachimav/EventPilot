import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { events, subscribeDataChanges } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import PlaceholderScreen from './PlaceholderScreen';
import PeopleManager from './PeopleManager';
import ChoiceChips from './ChoiceChips';
import AppButton from './AppButton';
import EmptyState from './EmptyState';

export default function PeopleWorkspace({ kind }: { kind: 'guests' | 'vendors' }) {
  const { data, loading, error, retry } = useFocusQuery(events.list, subscribeDataChanges);
  const [selected, setSelected] = useState('');
  const event = data?.find((row) => String(row.id) === selected) ?? data?.[0];
  return <PlaceholderScreen title={kind === 'guests' ? 'Guest Management' : 'Vendor Management'} description="Select an event to manage its people and details.">
    {loading ? <ActivityIndicator /> : error ? <AppButton title="Retry loading events" onPress={retry} /> : !event ? <>
      <EmptyState title="Start with an event" description="Create an event first, then add its guests and vendors here." />
      <AppButton title="Create Event" href="/events/create" />
    </> : <>
      <ChoiceChips label="Select event" choices={data!.map((row) => ({ value: String(row.id), label: row.name }))} value={String(event.id)} onChange={setSelected} />
      <PeopleManager key={`${kind}-${event.id}`} eventId={event.id} kind={kind} />
    </>}
  </PlaceholderScreen>;
}

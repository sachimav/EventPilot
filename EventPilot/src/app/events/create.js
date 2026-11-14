import PlaceholderScreen from '../../components/PlaceholderScreen';
import { router } from 'expo-router';
import EventForm from '../../components/EventForm';
import { events } from '../../database';

export default function CreateEventScreen() {
  return <PlaceholderScreen title="Start something special" description="Add the details for your next event.">
    <EventForm onSave={async (input) => {
      const id = await events.create(input);
      router.replace({ pathname: '/events/[id]', params: { id } });
    }} />
  </PlaceholderScreen>;
}

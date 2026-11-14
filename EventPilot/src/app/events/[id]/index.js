import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventDetails from '../../../components/EventDetails';
import { parseEventId } from '../../../utils/eventForm';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  return (
    <PlaceholderScreen title="Event details" description="Everything you need to plan this event.">
      <EventDetails key={String(id)} id={parseEventId(id)} />
    </PlaceholderScreen>
  );
}

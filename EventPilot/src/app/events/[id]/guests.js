import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventWorkspace from '../../../components/EventWorkspace';
import { parseEventId } from '../../../utils/eventForm';
export default function GuestsScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Guests & RSVP" description="Invitations, dietary needs, and attendance in one place."><EventWorkspace key={String(id)} id={parseEventId(id)} section="guests" /></PlaceholderScreen>;
}

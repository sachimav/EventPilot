import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventWorkspace from '../../../components/EventWorkspace';
import { parseEventId } from '../../../utils/eventForm';
export default function VendorsScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Vendors & contacts" description="Track quotes, bookings, and the people behind your event."><EventWorkspace key={String(id)} id={parseEventId(id)} section="vendors" /></PlaceholderScreen>;
}

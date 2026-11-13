import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventEditor from '../../../components/EventEditor';
import { parseEventId } from '../../../utils/eventForm';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Refine the details" description="Update your event information."><EventEditor key={String(id)} id={parseEventId(id)} /></PlaceholderScreen>;
}

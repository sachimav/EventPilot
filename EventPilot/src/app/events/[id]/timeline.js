import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventTimeline from '../../../components/EventTimeline';
import { parseEventId } from '../../../utils/eventForm';

export default function EventTimelineScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Event timeline" description="Let the day flow. Build a schedule for every moment."><EventTimeline key={String(id)} id={parseEventId(id)} /></PlaceholderScreen>;
}

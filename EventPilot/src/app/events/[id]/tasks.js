import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventWorkspace from '../../../components/EventWorkspace';
import { parseEventId } from '../../../utils/eventForm';

export default function EventTasksScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Event tasks" description="Turn your plan into a finished checklist."><EventWorkspace key={String(id)} id={parseEventId(id)} section="tasks" /></PlaceholderScreen>;
}

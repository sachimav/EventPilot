import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventWorkspace from '../../../components/EventWorkspace';
import { parseEventId } from '../../../utils/eventForm';

export default function EventBudgetScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Event budget" description="Plan costs and keep spending in view."><EventWorkspace key={String(id)} id={parseEventId(id)} section="budget" /></PlaceholderScreen>;
}

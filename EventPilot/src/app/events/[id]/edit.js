import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventFormPreview from '../../../components/EventFormPreview';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Refine the details" description={`Preview the planner for event ${id}. Editing will be available soon.`}><EventFormPreview /></PlaceholderScreen>;
}

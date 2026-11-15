import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EventReports from '../../../components/EventReports';
import { parseEventId } from '../../../utils/eventForm';
export default function ReportsScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Reports & sharing" description="Take your event brief, guest list and run sheet with you."><EventReports id={parseEventId(id)} /></PlaceholderScreen>;
}

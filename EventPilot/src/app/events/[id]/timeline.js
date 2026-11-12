import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '../../../components/PlaceholderScreen';
import EmptyState from '../../../components/EmptyState';

export default function EventTimelineScreen() {
  const { id } = useLocalSearchParams();
  return <PlaceholderScreen title="Let the day flow" description={`Schedule preview for event ${id}.`}><EmptyState icon="time-outline" title="Every moment in its place" description="Your event schedule and milestones will appear here. Timeline planning is coming soon." /></PlaceholderScreen>;
}

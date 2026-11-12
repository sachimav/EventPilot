import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen, { NavigationButton } from '../../../components/PlaceholderScreen';
import EventCard from '../../../components/EventCard';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  return (
    <PlaceholderScreen title="Event details" description={`Placeholder details for event: ${id}. Event information will appear here.`}>
      <EventCard title="A celebration to remember" date="Date to be decided" location="Venue to be decided" />
      <NavigationButton href={{ pathname: '/events/[id]/edit', params: { id } }}>Edit event</NavigationButton>
      <NavigationButton href={{ pathname: '/events/[id]/timeline', params: { id } }}>View timeline</NavigationButton>
    </PlaceholderScreen>
  );
}

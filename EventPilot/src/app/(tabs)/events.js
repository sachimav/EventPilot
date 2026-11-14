import PlaceholderScreen, { NavigationButton } from '../../components/PlaceholderScreen';
import EventList from '../../components/EventList';

export default function EventsScreen() {
  return (
    <PlaceholderScreen title="Your events" description="Plan, review, and manage your events.">
      <NavigationButton href="/events/create">Create an event</NavigationButton>
      <EventList />
    </PlaceholderScreen>
  );
}

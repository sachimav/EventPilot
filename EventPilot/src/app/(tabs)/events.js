import PlaceholderScreen, { NavigationButton } from '../../components/PlaceholderScreen';
import EventList from '../../components/EventList';

export default function EventsScreen() {
  return (
    <PlaceholderScreen title="My events" description="Find your plans by title, location, category, or date.">
      <NavigationButton href="/events/create">Create an event</NavigationButton>
      <EventList />
    </PlaceholderScreen>
  );
}

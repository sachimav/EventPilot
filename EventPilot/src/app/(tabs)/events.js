import PlaceholderScreen, { NavigationButton } from '../../components/PlaceholderScreen';
import EventCard from '../../components/EventCard';

export default function EventsScreen() {
  return (
    <PlaceholderScreen title="Your events" description="Your event list will appear here. Open the sample event to explore the navigation.">
      <NavigationButton href="/events/create">Create an event</NavigationButton>
      <EventCard title="A celebration to remember" date="Date to be decided" location="Venue to be decided" href="/events/sample-event" />
    </PlaceholderScreen>
  );
}

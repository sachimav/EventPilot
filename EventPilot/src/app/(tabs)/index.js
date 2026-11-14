import PlaceholderScreen, { NavigationButton } from '../../components/PlaceholderScreen';
import { StyleSheet, View } from 'react-native';
import StatCard from '../../components/StatCard';
import EventList from '../../components/EventList';
import { spacing } from '../../constants/theme';

export default function HomeScreen() {
  return (
    <PlaceholderScreen title="Make room for great moments." description="A little planning. A memorable event. Welcome to your planning space.">
      <View style={styles.stats}>
        <StatCard label="Upcoming events" value="—" caption="Your overview, coming soon" icon="calendar-outline" />
        <StatCard label="Tasks to do" value="—" caption="Keep every detail in view" icon="checkbox-outline" />
      </View>
      <NavigationButton href="/events/create">Create an event</NavigationButton>
      <EventList limit={3} />
      <NavigationButton href="/events">Browse events</NavigationButton>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({ stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg } });

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { events } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { eventDate } from '../utils/eventForm';
import EventCard from './EventCard';
import EmptyState from './EmptyState';
import AppButton from './AppButton';
import AppInput from './AppInput';
import { colors, radii, spacing, typography } from '../constants/theme';
import { defaultEventFilters, eventCategories, filterEvents, type EventFilters, type EventPeriod } from '../utils/eventFilters';

const periods: { value: EventPeriod; label: string }[] = [
  { value: 'all', label: 'All events' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' },
];

async function loadEvents() {
  const rows = await events.list();
  return { rows, now: new Date() };
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && styles.pressed]}>
    <Text style={[styles.chipLabel, selected && styles.selectedLabel]}>{label}</Text>
  </Pressable>;
}

export default function EventList({ limit }: { limit?: number }) {
  const { data, loading, error, retry } = useFocusQuery(loadEvents);
  const [filters, setFilters] = useState<EventFilters>(defaultEventFilters);
  const categories = useMemo(() => eventCategories(data?.rows ?? []), [data]);
  const visible = useMemo(() => data ? filterEvents(data.rows, filters, data.now) : [], [data, filters]);
  const active = filters.search.length > 0 || filters.category !== null || filters.period !== 'all';
  const clear = () => setFilters({ ...defaultEventFilters });
  // Keep a removed category selectable/clearable after returning from a deletion.
  const choices = filters.category && !categories.some((item) => item.value === filters.category)
    ? [...categories, { value: filters.category, label: filters.category }] : categories;
  return <View style={styles.content}>
    <View style={styles.filters}>
      <AppInput label="Search events" placeholder="Search titles or locations" value={filters.search}
        autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing"
        onChangeText={(search) => setFilters((current) => ({ ...current, search }))} />
      <Text style={styles.filterLabel}>When</Text>
      <View style={styles.chips}>{periods.map((period) => <FilterChip key={period.value} label={period.label}
        selected={filters.period === period.value} onPress={() => setFilters((current) => ({ ...current, period: period.value }))} />)}</View>
      <Text style={styles.filterLabel}>Category</Text>
      <View style={styles.chips}>
        <FilterChip label="All categories" selected={filters.category === null} onPress={() => setFilters((current) => ({ ...current, category: null }))} />
        {choices.map((category) => <FilterChip key={category.value} label={category.label} selected={filters.category === category.value}
          onPress={() => setFilters((current) => ({ ...current, category: category.value }))} />)}
      </View>
      {active && <AppButton title="Clear filters" variant="secondary" onPress={clear} />}
    </View>
    {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel="Loading events" />
      : error ? <EmptyState title="Unable to load events" description="Please try reading your local events again."
        action={<AppButton title="Retry" onPress={retry} />} />
        : !data?.rows.length ? <EmptyState title="No events yet" description="Create your first event to start planning." icon="calendar-outline" />
          : <>
            <Text accessibilityLiveRegion="polite" style={styles.summary}>{visible.length} of {data.rows.length} {data.rows.length === 1 ? 'event' : 'events'} · Earliest first</Text>
            {visible.length === 0 ? <EmptyState title="No events match just yet" description="Try another title or location, or clear your filters to see all your plans." icon="search-outline"
              action={<AppButton title="Clear filters" onPress={clear} />} />
              : visible.slice(0, limit).map((event) => <EventCard key={event.id} title={event.name} date={eventDate(event)}
                location={event.location || 'Venue to be decided'} status={event.category}
                href={{ pathname: '/events/[id]', params: { id: event.id } }} />)}
            <Text style={styles.hint}>Upcoming and past use the scheduled start time. Undated events appear last in All events.</Text>
          </>}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  filters: { gap: spacing.md },
  filterLabel: { ...typography.label, color: colors.heading },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, justifyContent: 'center', backgroundColor: colors.surface },
  selectedChip: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipLabel: { ...typography.label, color: colors.text },
  selectedLabel: { color: colors.surface },
  pressed: { opacity: 0.75 },
  summary: { ...typography.caption, color: colors.text },
  hint: { ...typography.caption, color: colors.text },
});

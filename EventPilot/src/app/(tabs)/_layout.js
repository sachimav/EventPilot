import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

/** @type {Record<string, [import('react').ComponentProps<typeof Ionicons>['name'], import('react').ComponentProps<typeof Ionicons>['name']]>} */
const icons = {
  index: ['home-outline', 'home'],
  events: ['calendar-outline', 'calendar'],
  tasks: ['checkbox-outline', 'checkbox'],
  budget: ['wallet-outline', 'wallet'],
  calendar: ['calendar-number-outline', 'calendar-number'],
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs backBehavior="history" screenOptions={({ route }) => ({
      headerTintColor: colors.heading,
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 72 + insets.bottom, paddingTop: 8, paddingBottom: 8 + insets.bottom },
      tabBarShowLabel: true,
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 2 },
      tabBarItemStyle: { minHeight: 48, paddingHorizontal: 0 },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.text,
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ focused, size }) => (
        <Ionicons name={icons[route.name][focused ? 1 : 0]} size={size} color={focused ? colors.primary : colors.text} />
      ),
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'EventPilot' }} />
      <Tabs.Screen name="events" options={{ title: 'My Events', tabBarLabel: 'Events' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
    </Tabs>
  );
}

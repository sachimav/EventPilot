import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

/** @type {Record<string, [import('react').ComponentProps<typeof Ionicons>['name'], import('react').ComponentProps<typeof Ionicons>['name']]>} */
const icons = {
  index: ['home-outline', 'home'],
  events: ['calendar-outline', 'calendar'],
  tasks: ['checkbox-outline', 'checkbox'],
  budget: ['wallet-outline', 'wallet'],
};

export default function TabLayout() {
  return (
    <Tabs backBehavior="history" screenOptions={({ route }) => ({
      headerTintColor: colors.heading,
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarItemStyle: { minHeight: 48 },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.text,
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ focused, size }) => (
        <Ionicons name={icons[route.name][focused ? 1 : 0]} size={size} color={focused ? colors.primary : colors.text} />
      ),
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
    </Tabs>
  );
}

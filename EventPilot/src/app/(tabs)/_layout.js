import { useTheme } from '../../hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import HeaderActions from '../../components/HeaderActions';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/** @type {Record<string, [import('react').ComponentProps<typeof Ionicons>['name'], import('react').ComponentProps<typeof Ionicons>['name']]>} */
const icons = {
  index: ['home-outline', 'home'],
  events: ['calendar-outline', 'calendar'],
  tasks: ['checkbox-outline', 'checkbox'],
  budget: ['wallet-outline', 'wallet'],
  calendar: ['calendar-number-outline', 'calendar-number'],
};

export default function TabLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ alignItems: 'flex-end', paddingHorizontal: 16 }}><HeaderActions /></View>
    <Tabs backBehavior="history" screenOptions={({ route }) => ({
      headerShown: false,
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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="events" options={{ title: 'My Events', tabBarLabel: 'Events' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
    </Tabs>
    </SafeAreaView>
  );
}

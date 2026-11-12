import PlaceholderScreen from '../../components/PlaceholderScreen';
import EmptyState from '../../components/EmptyState';

export default function TasksScreen() {
  return <PlaceholderScreen title="One detail at a time" description="A clear space for all your event to-dos."><EmptyState icon="checkbox-outline" title="Your checklist starts here" description="Task planning is coming soon. For now, enjoy a little breathing room." /></PlaceholderScreen>;
}

import PlaceholderScreen from '../../components/PlaceholderScreen';
import { router } from 'expo-router';
import EventForm from '../../components/EventForm';
import { useState } from 'react';
import ChoiceChips from '../../components/ChoiceChips';
import { createPlannedEvent, eventTemplates } from '../../database/planning';

export default function CreateEventScreen() {
  const [template,setTemplate] = useState(/** @type {keyof typeof eventTemplates} */ ('blank'));
  return <PlaceholderScreen title="Start something special" description="Add the details for your next event.">
    <ChoiceChips label="Start from a template" value={template} choices={Object.entries(eventTemplates).map(([value,item]) => ({ value,label:item.label }))} onChange={(value) => setTemplate(/** @type {keyof typeof eventTemplates} */ (value))} />
    <EventForm onSave={async (input) => {
      const id = await createPlannedEvent(input, template);
      router.replace({ pathname: '/events/[id]', params: { id } });
    }} />
  </PlaceholderScreen>;
}

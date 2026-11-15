import { initializeDatabase } from './database';
import { notifyDataChanges } from './dataChanges';
import { notifyTaskChanges } from './taskChanges';
import type { CreateEvent, Event, Task, Expense, Activity } from './repositories';

export const eventTemplates = {
  blank: { label: 'Blank event', tasks: [] as string[], activities: [] as string[] },
  wedding: { label: 'Wedding', tasks: ['Confirm venue','Book caterer','Prepare guest list','Confirm photographer','Finalize the ceremony schedule'], activities: ['Ceremony','Reception'] },
  birthday: { label: 'Birthday', tasks: ['Choose venue','Invite guests','Order cake','Arrange decorations'], activities: ['Welcome guests','Cake cutting'] },
  conference: { label: 'Conference', tasks: ['Confirm venue','Invite speakers','Open guest registration','Arrange audiovisual equipment','Finalize session agenda'], activities: ['Registration','Opening session','Closing remarks'] },
};
export type TemplateKey = keyof typeof eventTemplates;

export async function createPlannedEvent(input: CreateEvent, template: TemplateKey): Promise<number> {
  const db = await initializeDatabase(); let id = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync('INSERT INTO Events (name,date,time,location,notes,budget_cents,currency,category,status,end_date,end_time) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [input.name, input.date ?? null, input.time ?? null, input.location ?? '', input.notes ?? '', input.budget_cents ?? 0, input.currency ?? 'LKR', input.category ?? 'Other', input.status ?? 'planning', input.end_date ?? null, input.end_time ?? null]);
    id = result.lastInsertRowId;
    for (const title of eventTemplates[template].tasks) await db.runAsync('INSERT INTO Tasks (event_id,title) VALUES (?,?)', [id,title]);
    for (const title of eventTemplates[template].activities) await db.runAsync('INSERT INTO Activities (event_id,title) VALUES (?,?)', [id,title]);
  });
  notifyDataChanges(); notifyTaskChanges(); return id;
}

export async function duplicateEvent(id: number): Promise<number> {
  const db = await initializeDatabase(); let copyId = 0;
  await db.withTransactionAsync(async () => {
    const event = await db.getFirstAsync<Event>('SELECT * FROM Events WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!event) throw new Error('Event not found.');
    const result = await db.runAsync('INSERT INTO Events (name,location,notes,budget_cents,currency,category,status) VALUES (?,?,?,?,?,?,?)',
      [`Copy of ${event.name}`,event.location,event.notes,event.budget_cents,event.currency,event.category,'draft']);
    copyId = result.lastInsertRowId;
    for (const task of await db.getAllAsync<Task>('SELECT * FROM Tasks WHERE event_id = ?', [id])) await db.runAsync('INSERT INTO Tasks (event_id,title,notes,priority) VALUES (?,?,?,?)', [copyId,task.title,task.notes,task.priority]);
    for (const expense of await db.getAllAsync<Expense>('SELECT * FROM Expenses WHERE event_id = ?', [id])) await db.runAsync('INSERT INTO Expenses (event_id,title,category,notes,estimated_cents,amount_cents) VALUES (?,?,?,?,?,0)', [copyId,expense.title,expense.category,expense.notes,expense.estimated_cents]);
    for (const activity of await db.getAllAsync<Activity>('SELECT * FROM Activities WHERE event_id = ?', [id])) await db.runAsync('INSERT INTO Activities (event_id,title,notes,location) VALUES (?,?,?,?)', [copyId,activity.title,activity.notes,activity.location]);
  });
  notifyDataChanges(); notifyTaskChanges(); return copyId;
}

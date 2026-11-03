// Seeds sample tasks spread over the previous, current and next week for one client.
// Usage: npm run seed -- --client=<uuid>   (add --keep to skip clearing that client's tasks)
// The client id is in the browser: localStorage.getItem('todo:client-id')
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { Task } from '../src/models/Task.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ownerId = process.argv.find((a) => a.startsWith('--client='))?.split('=')[1]?.toLowerCase();
if (!ownerId || !UUID.test(ownerId)) {
  console.error('Usage: npm run seed -- --client=<uuid>');
  console.error("Find the id in the browser console: localStorage.getItem('todo:client-id')");
  process.exit(1);
}

const samples = [
  ['Finishing Wireframe', 'Home and search screens for the to-do app', 'high'],
  ['Meeting with team', 'Sprint planning and design review', 'medium'],
  ['Buy a cat food', 'Dry food + treats', 'low'],
  ['Finishing daily commission', '', 'medium'],
  ['Doing Homework', 'Math chapter 4 exercises', 'high'],
  ['Gym session', 'Leg day', null],
  ['Call the bank', 'Ask about card replacement', 'low'],
  ['Write project README', 'Setup steps, API docs, screenshots', 'medium'],
];

const day = 24 * 60 * 60 * 1000;
const now = new Date();

const tasks = [];
for (let offset = -7; offset <= 7; offset += 1) {
  const [title, description, priority] = samples[(offset + 7) % samples.length];
  const startAt = new Date(now.getTime() + offset * day);
  startAt.setHours(9 + ((offset + 7) % 8), 0, 0, 0);
  tasks.push({
    ownerId,
    title,
    description,
    priority,
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
    // Past tasks mostly completed, future ones open.
    status: offset < 0 || (offset === 0 && tasks.length % 2) ? 'completed' : 'in_progress',
  });
}

await connectDB(process.env.MONGODB_URI);
if (!process.argv.includes('--keep')) await Task.deleteMany({ ownerId });
// Use create() so the pre-save hook sets completedAt.
const created = await Task.create(tasks);
console.log(`Seeded ${created.length} tasks for client ${ownerId}`);
await mongoose.disconnect();

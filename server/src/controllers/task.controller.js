import { Task } from '../models/Task.js';
import { weekRange } from '../utils/week.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Unanchored, case-insensitive regex: matches partial words ("finish" → "Finishing").
const keywordFilter = (q) => {
  const rx = new RegExp(escapeRegex(q), 'i');
  return { $or: [{ title: rx }, { description: rx }] };
};

const notFound = () => Object.assign(new Error('Task not found'), { status: 404 });

const countByStatus = async (match) => {
  const rows = await Task.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const completed = rows.find((r) => r._id === 'completed')?.n ?? 0;
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  return { total, completed, open: total - completed };
};

// GET /api/tasks
export const listTasks = async (req, res) => {
  const { from, to, status, priority, q, sort, limit } = req.valid.query;
  const filter = { ownerId: req.clientId };
  if (from || to) filter.startAt = { ...(from && { $gte: from }), ...(to && { $lt: to }) };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (q) Object.assign(filter, keywordFilter(q));

  const tasks = await Task.find(filter).sort(sort).limit(limit);
  res.json({ data: tasks });
};

// GET /api/tasks/search?q=
export const searchTasks = async (req, res) => {
  const { q, limit } = req.valid.query;
  // Fetch one extra row to tell the client whether results were cut off.
  const tasks = await Task.find({ ownerId: req.clientId, ...keywordFilter(q) })
    .sort({ startAt: -1 })
    .limit(limit + 1);
  res.json({ data: tasks.slice(0, limit), meta: { limit, hasMore: tasks.length > limit } });
};

// GET /api/tasks/summary?date=&tz=  → stats for the Mon–Sun week containing `date`
export const weekSummary = async (req, res) => {
  const { date = new Date(), tz } = req.valid.query;
  const { start, end } = weekRange(date, tz);
  const counts = await countByStatus({ ownerId: req.clientId, startAt: { $gte: start, $lt: end } });
  res.json({
    data: {
      weekStart: start,
      weekEnd: end,
      timeZone: tz,
      ...counts,
      progress: counts.total ? Math.round((counts.completed / counts.total) * 100) : 0,
    },
  });
};

// GET /api/tasks/weeks?tz=  → every week that has tasks, with open/completed counts
export const listWeeks = async (req, res) => {
  const { tz, from, to } = req.valid.query;
  const match = { ownerId: req.clientId };
  if (from || to) match.startAt = { ...(from && { $gte: from }), ...(to && { $lt: to }) };

  const weeks = await Task.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateTrunc: { date: '$startAt', unit: 'week', startOfWeek: 'monday', timezone: tz } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        weekStart: '$_id',
        weekEnd: { $dateAdd: { startDate: '$_id', unit: 'week', amount: 1, timezone: tz } },
        total: 1,
        completed: 1,
        open: { $subtract: ['$total', '$completed'] },
      },
    },
  ]);
  res.json({ data: weeks, meta: { timeZone: tz } });
};

// GET /api/tasks/:id
export const getTask = async (req, res) => {
  const task = await Task.findOne({ _id: req.valid.params.id, ownerId: req.clientId });
  if (!task) throw notFound();
  res.json({ data: task });
};

// POST /api/tasks
export const createTask = async (req, res) => {
  const task = await Task.create({ ...req.valid.body, ownerId: req.clientId });
  res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
};

// PATCH /api/tasks/:id
export const updateTask = async (req, res) => {
  const task = await Task.findOne({ _id: req.valid.params.id, ownerId: req.clientId });
  if (!task) throw notFound();
  // Load-then-save so schema validators (endAt vs startAt) and hooks (completedAt) run.
  task.set(req.valid.body);
  await task.save();
  res.json({ data: task });
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.valid.params.id, ownerId: req.clientId });
  if (!task) throw notFound();
  res.status(204).end();
};

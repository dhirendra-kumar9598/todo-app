import mongoose from 'mongoose';
import { z } from 'zod';
import { PRIORITIES, STATUSES } from '../models/Task.js';

// Coerce strings/numbers to Date ourselves so a missing value reports "Required".
const date = z.preprocess(
  (v) => (typeof v === 'string' || typeof v === 'number' ? new Date(v) : v),
  z.date({ error: (issue) => (issue.input === undefined ? 'Required' : 'Must be a valid date') }),
);

const isValidTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const timeZone = z
  .string()
  .trim()
  .refine(isValidTimeZone, 'Must be a valid IANA time zone, e.g. Asia/Kolkata')
  .default('UTC');

export const idParams = z.object({
  id: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid task id'),
});

const taskFields = {
  title: z
    .string({ error: (issue) => (issue.input === undefined ? 'Title is required' : 'Title must be text') })
    .trim()
    .min(1, 'Title is required')
    .max(120),
  description: z.string().trim().max(2000),
  startAt: date,
  endAt: date.nullable(),
  priority: z.enum(PRIORITIES).nullable(),
  status: z.enum(STATUSES),
};

const endNotBeforeStart = (data) => !data.endAt || !data.startAt || data.endAt >= data.startAt;
const endRule = { message: 'endAt must be on or after startAt', path: ['endAt'] };

export const createTaskBody = z
  .object({
    title: taskFields.title,
    startAt: taskFields.startAt,
    description: taskFields.description.optional(),
    endAt: taskFields.endAt.optional(),
    priority: taskFields.priority.optional(),
    status: taskFields.status.optional(),
  })
  .strict()
  .refine(endNotBeforeStart, endRule);

export const updateTaskBody = z
  .object(taskFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update')
  .refine(endNotBeforeStart, endRule);

export const listTasksQuery = z
  .object({
    from: date.optional(),
    to: date.optional(),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['startAt', '-startAt', 'createdAt', '-createdAt']).default('startAt'),
    limit: z.coerce.number().int().min(1).max(500).default(200),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, { message: 'from must be before to', path: ['from'] });

export const searchQuery = z.object({
  q: z.string().trim().min(1, 'Search query is required').max(100),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const summaryQuery = z.object({
  // Any instant inside the wanted week; defaults to now.
  date: date.optional(),
  tz: timeZone,
});

export const weeksQuery = z.object({
  tz: timeZone,
  from: date.optional(),
  to: date.optional(),
});

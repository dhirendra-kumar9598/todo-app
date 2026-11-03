import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Task } from '../src/models/Task.js';
import { weekRange } from '../src/utils/week.js';

let mongod;
const app = createApp();
const CLIENT = randomUUID();

const api = {
  get: (path) => request(app).get(path).set('X-Client-Id', CLIENT),
  post: (path) => request(app).post(path).set('X-Client-Id', CLIENT),
  patch: (path) => request(app).patch(path).set('X-Client-Id', CLIENT),
  delete: (path) => request(app).delete(path).set('X-Client-Id', CLIENT),
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(() => Task.deleteMany({}));

const create = (body) => api.post('/api/tasks').send(body);

describe('CRUD', () => {
  test('creates a task with defaults', async () => {
    const res = await create({ title: '  Doing Homework ', startAt: '2026-01-14T10:00:00Z' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'Doing Homework');
    assert.equal(res.body.data.status, 'in_progress');
    assert.equal(res.body.data.priority, null);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data._id, undefined);
    assert.equal(res.body.data.ownerId, undefined);
  });

  test('rejects missing title / date and unknown fields with readable messages', async () => {
    const res = await create({ description: 'x', foo: 1 });
    assert.equal(res.status, 400);
    const byField = Object.fromEntries(res.body.error.details.map((d) => [d.field, d.message]));
    assert.equal(byField.title, 'Title is required');
    assert.equal(byField.startAt, 'Required');
  });

  test('rejects endAt before startAt (create and patch)', async () => {
    const bad = await create({ title: 'a', startAt: '2026-01-14T10:00:00Z', endAt: '2026-01-14T09:00:00Z' });
    assert.equal(bad.status, 400);

    const ok = await create({ title: 'a', startAt: '2026-01-14T10:00:00Z', endAt: '2026-01-14T11:00:00Z' });
    const patchEnd = await api.patch(`/api/tasks/${ok.body.data.id}`).send({ endAt: '2026-01-14T08:00:00Z' });
    assert.equal(patchEnd.status, 400);
    // Moving only the start past the existing end is rejected too.
    const patchStart = await api.patch(`/api/tasks/${ok.body.data.id}`).send({ startAt: '2026-01-14T15:00:00Z' });
    assert.equal(patchStart.status, 400);
  });

  test('allows an end time on the next day (overnight task)', async () => {
    const res = await create({ title: 'Night shift', startAt: '2026-01-14T22:00:00Z', endAt: '2026-01-15T02:00:00Z' });
    assert.equal(res.status, 201);
  });

  test('gets, updates status, and deletes', async () => {
    const { id } = (await create({ title: 'Buy a cat food', startAt: '2026-01-14T10:00:00Z' })).body.data;

    assert.equal((await api.get(`/api/tasks/${id}`)).status, 200);

    const done = await api.patch(`/api/tasks/${id}`).send({ status: 'completed', priority: 'high' });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'completed');
    assert.ok(done.body.data.completedAt);

    const reopened = await api.patch(`/api/tasks/${id}`).send({ status: 'in_progress', priority: null });
    assert.equal(reopened.body.data.completedAt, null);
    assert.equal(reopened.body.data.priority, null);

    assert.equal((await api.delete(`/api/tasks/${id}`)).status, 204);
    assert.equal((await api.get(`/api/tasks/${id}`)).status, 404);
  });

  test('400 on invalid id, 404 on unknown id/route', async () => {
    assert.equal((await api.get('/api/tasks/nope')).status, 400);
    assert.equal((await api.get(`/api/tasks/${new mongoose.Types.ObjectId()}`)).status, 404);
    assert.equal((await api.get('/api/nothing')).status, 404);
  });

  test('400 on malformed JSON', async () => {
    const res = await api.post('/api/tasks').set('Content-Type', 'application/json').send('{bad');
    assert.equal(res.status, 400);
  });
});

describe('client isolation', () => {
  test('requires a valid X-Client-Id header', async () => {
    assert.equal((await request(app).get('/api/tasks')).status, 400);
    assert.equal((await request(app).get('/api/tasks').set('X-Client-Id', 'not-a-uuid')).status, 400);
  });

  test("clients can't see or change each other's tasks", async () => {
    const { id } = (await create({ title: 'Mine', startAt: '2026-01-14T10:00:00Z' })).body.data;
    const other = randomUUID();
    const as = (req) => req.set('X-Client-Id', other);

    assert.deepEqual((await as(request(app).get('/api/tasks'))).body.data, []);
    assert.deepEqual((await as(request(app).get('/api/tasks/search').query({ q: 'mine' }))).body.data, []);
    assert.equal((await as(request(app).get('/api/tasks/summary').query({ date: '2026-01-14' }))).body.data.total, 0);
    assert.deepEqual((await as(request(app).get('/api/tasks/weeks'))).body.data, []);
    assert.equal((await as(request(app).get(`/api/tasks/${id}`))).status, 404);
    assert.equal((await as(request(app).patch(`/api/tasks/${id}`)).send({ title: 'x' })).status, 404);
    assert.equal((await as(request(app).delete(`/api/tasks/${id}`))).status, 404);

    assert.equal((await api.get(`/api/tasks/${id}`)).body.data.title, 'Mine');
  });
});

describe('listing, search and weeks', () => {
  beforeEach(async () => {
    await Task.create(
      [
        { title: 'Finishing Wireframe', startAt: new Date('2026-01-12T10:00:00Z') }, // Mon
        { title: 'Meeting with team', description: 'finish agenda', startAt: new Date('2026-01-18T22:00:00Z') }, // Sun UTC
        { title: 'Buy a cat food', startAt: new Date('2026-01-14T10:00:00Z'), status: 'completed' },
        { title: 'Gym (a+b)', startAt: new Date('2026-01-20T10:00:00Z') }, // next week
      ].map((t) => ({ ...t, ownerId: CLIENT })),
    );
  });

  test('filters by date range and status', async () => {
    const res = await api.get('/api/tasks').query({
      from: '2026-01-12T00:00:00Z',
      to: '2026-01-19T00:00:00Z',
      status: 'in_progress',
    });
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((t) => t.title),
      ['Finishing Wireframe', 'Meeting with team'],
    );
  });

  test('search matches title and description, case-insensitive, regex-safe', async () => {
    const res = await api.get('/api/tasks/search').query({ q: 'FINISH' });
    assert.equal(res.body.data.length, 2);
    assert.deepEqual(res.body.meta, { limit: 50, hasMore: false });

    const special = await api.get('/api/tasks/search').query({ q: '(a+b)' });
    assert.equal(special.body.data.length, 1);

    assert.equal((await api.get('/api/tasks/search')).status, 400);
  });

  test('search reports when results are cut off', async () => {
    const res = await api.get('/api/tasks/search').query({ q: 'a', limit: 2 }); // matches all 4
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.hasMore, true);
  });

  test('weekly summary uses Monday–Sunday weeks', async () => {
    const res = await api.get('/api/tasks/summary').query({ date: '2026-01-14T00:00:00Z', tz: 'UTC' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.weekStart, '2026-01-12T00:00:00.000Z');
    assert.deepEqual(
      { total: res.body.data.total, completed: res.body.data.completed, open: res.body.data.open },
      { total: 3, completed: 1, open: 2 },
    );
    assert.equal(res.body.data.progress, 33);
  });

  test('weeks respect the time zone', async () => {
    // Sun 22:00 UTC is Mon 03:30 in Kolkata → moves to the next week.
    const utc = await api.get('/api/tasks/weeks').query({ tz: 'UTC' });
    assert.deepEqual(utc.body.data.map((w) => w.total), [3, 1]);

    const ist = await api.get('/api/tasks/weeks').query({ tz: 'Asia/Kolkata' });
    assert.deepEqual(ist.body.data.map((w) => w.total), [2, 2]);
    assert.equal(ist.body.data[0].weekStart, '2026-01-11T18:30:00.000Z');
    assert.equal(ist.body.data[0].completed, 1);

    assert.equal((await api.get('/api/tasks/weeks').query({ tz: 'Mars/Base' })).status, 400);
  });
});

describe('platform', () => {
  test('health reports the database state', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.db, 'connected');
  });

  test('rate limits /api/tasks per IP', async () => {
    const limited = createApp({ rateLimitPerMinute: 2 });
    const get = () => request(limited).get('/api/tasks').set('X-Client-Id', CLIENT);
    assert.equal((await get()).status, 200);
    assert.equal((await get()).status, 200);
    const third = await get();
    assert.equal(third.status, 429);
    assert.equal(third.body.error.message, 'Too many requests, please slow down.');
  });

  test('restricts CORS to the configured origins', async () => {
    const strict = createApp({ corsOrigin: 'https://todo.example' });
    const ok = await request(strict).get('/api/health').set('Origin', 'https://todo.example');
    assert.equal(ok.headers['access-control-allow-origin'], 'https://todo.example');
    const other = await request(strict).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(other.headers['access-control-allow-origin'], undefined);
  });
});

describe('weekRange', () => {
  test('handles DST weeks', () => {
    // US DST starts Sun 2026-03-08.
    const { start, end } = weekRange(new Date('2026-03-08T12:00:00Z'), 'America/New_York');
    assert.equal(start.toISOString(), '2026-03-02T05:00:00.000Z'); // Mon 00:00 EST
    assert.equal(end.toISOString(), '2026-03-09T04:00:00.000Z'); // Mon 00:00 EDT
  });
});

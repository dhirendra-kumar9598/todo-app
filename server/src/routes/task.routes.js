import { Router } from 'express';
import * as tasks from '../controllers/task.controller.js';
import { validate } from '../middleware/validate.js';
import * as s from '../validation/task.schemas.js';

const router = Router();

// Static paths first so they aren't captured by /:id.
router.get('/search', validate(s.searchQuery, 'query'), tasks.searchTasks);
router.get('/summary', validate(s.summaryQuery, 'query'), tasks.weekSummary);
router.get('/weeks', validate(s.weeksQuery, 'query'), tasks.listWeeks);

router
  .route('/')
  .get(validate(s.listTasksQuery, 'query'), tasks.listTasks)
  .post(validate(s.createTaskBody), tasks.createTask);

router
  .route('/:id')
  .all(validate(s.idParams, 'params'))
  .get(tasks.getTask)
  .patch(validate(s.updateTaskBody), tasks.updateTask)
  .delete(tasks.deleteTask);

export default router;

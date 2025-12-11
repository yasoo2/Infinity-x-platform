import PlanningSystem from '../../src/planning/PlanningSystem.mjs';
import { jest } from '@jest/globals';

jest.setTimeout(30000);

class FakeCollection {
  constructor(store) { this.store = store; }
  async insertOne(doc) { this.store.push(doc); return { insertedId: doc._id || null }; }
  async updateOne(filter, update) {
    const idx = this.store.findIndex(d => Object.keys(filter).every(k => d[k] === filter[k]));
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
    const doc = this.store[idx];
    if (update.$inc) {
      for (const k of Object.keys(update.$inc)) {
        const inc = update.$inc[k];
        const cur = typeof doc[k] === 'number' ? doc[k] : 0;
        doc[k] = cur + inc;
      }
    }
    if (update.$push) {
      for (const k of Object.keys(update.$push)) {
        if (!Array.isArray(doc[k])) doc[k] = [];
        const v = update.$push[k];
        doc[k].push(v);
      }
    }
    if (update.$set) {
      for (const k of Object.keys(update.$set)) {
        doc[k] = update.$set[k];
      }
    }
    this.store[idx] = doc;
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async findOne(filter) {
    return this.store.find(d => Object.keys(filter).every(k => d[k] === filter[k])) || null;
  }
  async findOneAndUpdate(filter, update, opts) {
    await this.updateOne(filter, update);
    const v = await this.findOne(filter);
    return { value: v };
  }
  find(filter) {
    const arr = this.store.filter(d => Object.keys(filter).every(k => d[k] === filter[k]));
    return {
      sort: (spec) => ({ toArray: async () => [...arr].sort((a, b) => (a[Object.keys(spec)[0]] || 0) - (b[Object.keys(spec)[0]] || 0)) }),
      toArray: async () => arr
    };
  }
}

const makeFakeDb = () => {
  const stores = { plans: [], phases: [], tasks: [] };
  return {
    collection: (name) => new FakeCollection(stores[name])
  };
};

test('PlanningSystem feedback and retry flow', async () => {
  const db = makeFakeDb();
  const ps = new PlanningSystem(db);
  const plan = await ps.createPlan({ title: 'Test Plan', description: 'desc', goal: 'goal', userId: 'u1', metadata: { sessionId: 's1' } });
  expect(plan.planId).toBeDefined();
  const phase = await ps.addPhase(plan.planId, { title: 'Execution', description: 'Auto', order: 1 });
  expect(phase.phaseId).toBeDefined();
  await ps.startPhase(phase.phaseId);
  const startedDoc = await db.collection('phases').findOne({ phaseId: phase.phaseId });
  expect(startedDoc.status).toBe('in_progress');
  const task = await ps.addTask(phase.phaseId, { title: 'Step 1', description: 'Do work', priority: 'medium' });
  expect(task.taskId).toBeDefined();
  await ps.updateTaskStatus(task.taskId, 'in_progress');
  let cur = await db.collection('tasks').findOne({ taskId: task.taskId });
  expect(cur.status).toBe('in_progress');
  await ps.addTaskFeedback(task.taskId, { message: 'failed', attempt: 1, details: { step: 1 } });
  await ps.incrementTaskRetry(task.taskId, 'failed');
  await ps.updateTaskStatus(task.taskId, 'failed');
  cur = await db.collection('tasks').findOne({ taskId: task.taskId });
  expect(cur.status).toBe('failed');
  await ps.addTaskFeedback(task.taskId, { message: 'failed again', attempt: 2, details: { step: 1 } });
  await ps.incrementTaskRetry(task.taskId, 'failed');
  const doc = await db.collection('tasks').findOne({ taskId: task.taskId });
  expect(Array.isArray(doc.feedback)).toBe(true);
  expect(doc.feedback.length).toBe(2);
  expect(doc.retryCount).toBe(2);
  expect(doc.lastAttemptStatus).toBe('failed');
  const details = await ps.getPlanDetails(plan.planId);
  expect(Array.isArray(details.phases)).toBe(true);
  const phaseWithTasks = details.phases.find(p => p.phaseId === phase.phaseId);
  expect(Array.isArray(phaseWithTasks.tasks)).toBe(true);
  const savedTask = phaseWithTasks.tasks.find(t => t.taskId === task.taskId);
  expect(savedTask.status).toBe('failed');
});

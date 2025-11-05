import express from 'express';
import cors from 'cors';

export function createApiServer(joengine) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // نقطة نهاية للدردشة المتقدمة
  app.post('/api/v1/joe/chat-advanced', async (req, res) => {
    const { message, conversationId, tokens, aiEngine } = req.body;

    try {
      // إضافة مهمة جديدة إلى Agent Loop
      const task = await joengine.addTask(message, {
        conversationId,
        tokens,
        aiEngine,
        source: 'chat'
      });

      // انتظار اكتمال المهمة
      const result = await waitForTaskCompletion(joengine, task.id);

      res.json({
        ok: true,
        response: result.output || 'تم تنفيذ المهمة بنجاح',
        taskId: task.id,
        status: result.status
      });
    } catch (error) {
      console.error('Error in chat-advanced:', error);
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  // نقطة نهاية للحصول على حالة JOEngine
  app.get('/api/v1/joe/status', (req, res) => {
    const status = joengine.getStatus();
    res.json({ ok: true, status });
  });

  return app;
}

/**
 * انتظار اكتمال المهمة
 */
async function waitForTaskCompletion(joengine, taskId, timeout = 60000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const status = joengine.agentLoop.getStatus();
      const completedTask = status.completedTasks.find(t => t.id === taskId);
      const failedTask = status.failedTasks.find(t => t.id === taskId);

      if (completedTask) {
        clearInterval(checkInterval);
        resolve({
          status: 'completed',
          output: completedTask.output
        });
      } else if (failedTask) {
        clearInterval(checkInterval);
        reject(new Error(failedTask.error || 'Task failed'));
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Task timeout'));
      }
    }, 500);
  });
}

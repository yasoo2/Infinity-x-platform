import express from 'express';
import cors from 'cors';

export function createApiServer(joengine) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // نقطة نهاية لمعالجة المهام المتقدمة (AGI)
  app.post('/api/v1/process-task', async (req, res) => {
    const { goal, context = {}, userId } = req.body;

    try {
      // إضافة مهمة جديدة إلى Agent Loop
      const task = await joengine.addTask(goal, {
        ...context,
        userId,
        source: 'api'
      });

      // انتظار اكتمال المهمة
      const result = await waitForTaskCompletion(joengine, task.id);

      res.json({
        ok: true,
        result: result.output || 'تم تنفيذ المهمة بنجاح',
        taskId: task.id,
        status: result.status,
        model: joengine.reasoningEngine.config.model // إرجاع اسم النموذج للتأكيد
      });
    } catch (error) {
      console.error('Error in process-task:', error);
      res.status(500).json({
        ok: false,
        error: error.message,
        result: 'فشل في معالجة المهمة بواسطة محرك جو المتقدم.'
      });
    }
  });

  // نقطة نهاية للحصول على حالة JOEngine
  app.get('/api/v1/joe/status', (req, res) => {
    const status = joengine.getStatus();
    res.json({ ok: true, status });
  });

  // نقطة نهاية لسجل المحادثات
  app.post('/api/chat-history/list', async (req, res) => {
    // هذه مجرد نقطة نهاية وهمية لإرضاء الواجهة الأمامية
    // يجب استبدالها بمنطق حقيقي للاتصال بقاعدة البيانات
    res.json({
      ok: true,
      conversations: [] // إرجاع قائمة فارغة لتجنب تعطل الواجهة الأمامية
    });
  });

  app.post('/api/chat-history/delete', async (req, res) => {
    // هذه مجرد نقطة نهاية وهمية لإرضاء الواجهة الأمامية
    res.json({
      ok: true,
      message: 'Conversation deleted (mock)'
    });
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
      const completedTask = Array.isArray(status.completedTasks) ? status.completedTasks.find(t => t.id === taskId) : null;
      const failedTask = Array.isArray(status.failedTasks) ? status.failedTasks.find(t => t.id === taskId) : null;

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

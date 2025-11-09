import express from 'express';
import cors from 'cors';

export function createApiServer(joengine) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // نقطة نهاية لمعالجة المهام المتقدمة (AGI)
  app.post('/api/v1/process-task', async (req, res) => {
    const { goal, context = {}, userId } = req.body || {};

    // تحقق أساسي من الـ goal
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'goal is required',
        result: 'الهدف (goal) مطلوب لمعالجة المهمة.'
      });
    }

    try {
      // إضافة مهمة جديدة إلى Agent Loop
      const task = await joengine.addTask(goal, {
        ...context,
        userId,
        source: 'api'
      });

      // انتظار اكتمال المهمة (لا يرمي reject الآن)
      const result = await waitForTaskCompletion(joengine, task.id);

      res.json({
        ok: result.status === 'completed',
        result:
          result.output ||
          (result.status === 'completed'
            ? 'تم تنفيذ المهمة بنجاح'
            : null),
        taskId: task.id,
        status: result.status,        // 'completed' | 'failed' | 'timeout'
        error: result.status === 'completed' ? null : result.error,
        model: joengine?.reasoningEngine?.config?.model // إرجاع اسم النموذج للتأكيد
      });
    } catch (error) {
      console.error('Error in process-task:', error);

      // مهم جداً: لا نرجّع 500 هنا عشان ما يكسر axios في الـ backend
      res.json({
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
 * لا يقوم الآن بـ reject، بل دائماً resolve مع status واضح
 */
async function waitForTaskCompletion(joengine, taskId, timeout = 180000) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const status = joengine.agentLoop.getStatus();

      const completedTask = Array.isArray(status.completedTasks)
        ? status.completedTasks.find((t) => t.id === taskId)
        : null;

      const failedTask = Array.isArray(status.failedTasks)
        ? status.failedTasks.find((t) => t.id === taskId)
        : null;

      if (completedTask) {
        clearInterval(checkInterval);
        return resolve({
          status: 'completed',
          output:
            completedTask.output ??
            completedTask.result ??
            null,
          error: null
        });
      }

      if (failedTask) {
        clearInterval(checkInterval);
        return resolve({
          status: 'failed',
          output:
            failedTask.output ??
            failedTask.result ??
            null,
          error: failedTask.error || 'Task failed'
        });
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        return resolve({
          status: 'timeout',
          output: null,
          error: 'Task timeout'
        });
      }
    }, 500);
  });
}

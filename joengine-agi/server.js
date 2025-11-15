/**
 * JOEngine Backend Server
 * 
 * خادم API لنظام JOEngine AGI
 * يوفر endpoints للتواصل مع Frontend أو أنظمة خارجية (مثل Infinity-X Backend)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { joeAdvancedEngine } from '../backend/src/lib/joeAdvancedEngine.mjs';

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ MongoDB Connected Successfully!');
    } else {
      console.log('⚠️  MongoDB URI not provided, running without database');
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'JOEngine Backend'
  });
});

/**
 * ✅ Chat Endpoint بسيط
 * يستخدمه أي Frontend يتعامل مع جو مباشرة برسالة واحدة
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context = [], aiEngine = 'openai' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`💬 [/api/chat] message="${message}" engine=${aiEngine}`);

    // استخدام joeAdvancedEngine
    const result = await joeAdvancedEngine.processMessageWithTools(message, context);

    res.json(result);

  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      response: 'عذراً، حدث خطأ في معالجة رسالتك.'
    });
  }
});

/**
 * ✅ process-task Endpoint
 * هذا هو الـ endpoint المتوافق مع:
 *   POST http://localhost:3000/api/v1/process-task
 * الذي يستدعيه backend (route joeChatAdvanced.mjs)
 *
 * شكل الطلب المتوقَّع:
 * { goal: string, context?: any[], userId?: string }
 *
 * شكل الرد المتوقَّع:
 * { ok: boolean, error: string | null, result: any }
 */
app.post('/api/v1/process-task', async (req, res) => {
  try {
    const { goal, context = [], userId = 'anonymous' } = req.body || {};

    if (!goal) {
      return res.status(400).json({
        ok: false,
        error: 'goal is required',
        result: 'الهدف (goal) مطلوب لمعالجة المهمة.'
      });
    }

    console.log(`🧠 [/api/v1/process-task] user=${userId} goal="${goal}"`);

    // هنا نستخدم نفس محرك جو المتقدم ولكن على شكل "رسالة"
    // ممكن لاحقاً توسّعها لتخطيط/تاسكات متعددة
    const engineResult = await joeAdvancedEngine.processMessageWithTools(goal, context);

    // نحافظ على نفس شكل الـ response الذي يتوقعه الـ backend
    res.json({
      ok: true,
      error: null,
      result: engineResult
    });

  } catch (error) {
    console.error('❌ [/api/v1/process-task] error:', error);

    res.status(500).json({
      ok: false,
      error: error.message || 'Task error',
      result: 'فشل في معالجة المهمة بواسطة محرك جو المتقدم.'
    });
  }
});

// Build Project Endpoint
app.post('/api/build', async (req, res) => {
  try {
    const { projectType, description, style, features } = req.body;

    if (!projectType || !description) {
      return res.status(400).json({
        success: false,
        error: 'projectType and description are required'
      });
    }

    console.log(`🏗️  Building project: ${projectType} - ${description}`);

    // TODO: Implement build logic using JOEngine
    res.json({
      success: true,
      message: 'Project build started',
      projectType,
      description
    });

  } catch (error) {
    console.error('❌ Build endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Conversations Endpoint
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // TODO: Implement conversation retrieval from database
    res.json({
      success: true,
      conversations: []
    });

  } catch (error) {
    console.error('❌ Conversations endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save Conversation Endpoint
app.post('/api/conversations', async (req, res) => {
  try {
    const { userId, title, messages } = req.body;

    if (!userId || !title) {
      return res.status(400).json({
        success: false,
        error: 'userId and title are required'
      });
    }

    // TODO: Implement conversation saving to database
    res.json({
      success: true,
      message: 'Conversation saved',
      conversationId: Date.now().toString()
    });

  } catch (error) {
    console.error('❌ Save conversation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start Server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 JOEngine Backend Server is running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`💬 Chat endpoint:  http://localhost:${PORT}/api/chat`);
      console.log(`🧠 Process-task:   http://localhost:${PORT}/api/v1/process-task`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import dotenv from 'dotenv';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { google } from 'googleapis';
import { Client as NotionClient } from '@notionhq/client';
import { OpenAI } from '@langchain/openai';
import { createAgentExecutor, createReactAgent } from 'langchain/agents';
import { MemorySummarizer } from 'langchain/memory';
import { pull } from 'langchain/hub';
import fs from 'fs';
import archiver from 'archiver';
import stream from 'stream';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ dest: 'uploads/' });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });

const dbName = process.env.DB_NAME || 'infinityx';
let mongoDb = null;

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
  credentials: true
}));

// ---------- Mongo connection ----------
async function connectMongo() {
  if (mongoDb) return mongoDb;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  const client = new MongoClient(uri);
  await client.connect();
  mongoDb = client.db(dbName);
  console.log('[Mongo] Connected');
  return mongoDb;
}

// ---------- LangChain Agent Setup ----------
const llm = new OpenAI({
  temperature: 0,
  openAIApiKey: process.env.CF_API_TOKEN,
  basePath: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`
});

const memory = new MemorySummarizer({ llm });

// Agent tools
const tools = [
  {
    name: 'tts',
    description: 'Generate speech from text using ElevenLabs',
    func: async (text) => {
      await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_DEFAULT_VOICE}`,
        { text, model_id: process.env.ELEVEN_MODEL_ID },
        { headers: { 'xi-api-key': process.env.ELEVEN_API_KEY }, responseType: 'arraybuffer' }
      );
      return 'Audio generated';
    }
  },
  {
    name: 'generate_image',
    description: 'Generate image from prompt',
    func: async (prompt) => {
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        { version: 'stable-diffusion-3', input: { prompt } },
        { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } }
      );
      return response.data.output?.[0] || 'image_url';
    }
  },
  {
    name: 'add_calendar_event',
    description: 'Add event to Google Calendar',
    func: async (summary, start, end) => {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: process.env.GOOGLE_ACCESS_TOKEN });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendar.events.insert({
        calendarId: 'primary',
        resource: { summary, start: { dateTime: start }, end: { dateTime: end } }
      });
      return 'Event added';
    }
  },
  {
    name: 'create_notion_page',
    description: 'Create page in Notion',
    func: async (title, content) => {
      await notion.pages.create({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: { Name: { title: [{ text: { content: title } }] } },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content } }] }
          }
        ]
      });
      return 'Page created in Notion';
    }
  },
  {
    name: 'build_app',
    description: 'Build a simple CRUD placeholder app in DB',
    func: async (spec) => {
      const db = await connectMongo();
      const appName = spec.split(' ')[0].toLowerCase();
      await db.collection('apps').insertOne({
        name: appName,
        schema: { tasks: [] },
        createdAt: new Date()
      });
      return `App "${appName}" created. Use /api/apps/${appName} to interact.`;
    }
  }
];

const prompt = await pull('hwchase17/react');
const agent = createReactAgent({ llm, tools, prompt });
const agentExecutor = createAgentExecutor({ agent, tools });

// ---------- Helper: session tokens / roles ----------
function makeToken() {
  return (
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
}

function restrictTo(allowedRoles) {
  return async function (req, res, next) {
    try {
      const token = req.headers['x-session-token'];
      if (!token) {
        return res.status(401).json({ ok: false, error: 'Missing session token' });
      }
      const dataJson = await redis.get(`session:${token}`);
      if (!dataJson) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
      }
      const data = JSON.parse(dataJson);
      if (!allowedRoles.includes(data.role)) {
        return res.status(403).json({ ok: false, error: 'Forbidden: insufficient role' });
      }
      req.authUser = data;
      next();
    } catch (err) {
      console.error('[restrictTo]', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  };
}

// ---------- Seed Super Admin ----------
const ROOT_SUPERADMIN_EMAIL = process.env.ROOT_SUPERADMIN_EMAIL || 'owner@example.com';
const ROOT_SUPERADMIN_PASSWORD = process.env.ROOT_SUPERADMIN_PASSWORD || 'younes2025';

async function initSuperAdmin() {
  const db = await connectMongo();
  const usersCol = db.collection('users');
  const existing = await usersCol.findOne({ email: ROOT_SUPERADMIN_EMAIL });
  if (existing) {
    console.log('[Auth] Super admin already exists');
    return;
  }
  const passwordHash = await bcrypt.hash(ROOT_SUPERADMIN_PASSWORD, 10);
  await usersCol.insertOne({
    email: ROOT_SUPERADMIN_EMAIL,
    passwordHash,
    role: 'super_admin',
    createdAt: new Date()
  });
  console.log('[Auth] Super admin created:', ROOT_SUPERADMIN_EMAIL);
}

// ---------- Auth endpoints ----------
const googleOauthClient = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

// email/password login
app.post('/api/auth/loginUser', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, error: 'Missing email or password' });

    const db = await connectMongo();
    const user = await db.collection('users').findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = makeToken();
    await redis.setex(
      `session:${token}`,
      60 * 60 * 24,
      JSON.stringify({ email: user.email, role: user.role })
    );

    res.json({
      ok: true,
      method: 'email_password',
      email: user.email,
      role: user.role,
      sessionToken: token
    });
  } catch (err) {
    console.error('[auth/loginUser]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// phone OTP - request code
app.post('/api/auth/requestPhoneCode', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res.status(400).json({ ok: false, error: 'Missing phone' });

    const otp = (Math.floor(Math.random() * 900000) + 100000).toString();
    await redis.setex(`otp:${phone}`, 60 * 5, otp);

    // NOTE: In prod, send via SMS instead of returning
    res.json({ ok: true, phone, debug_otp: otp });
  } catch (err) {
    console.error('[auth/requestPhoneCode]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// phone OTP - login
app.post('/api/auth/loginPhone', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ ok: false, error: 'Missing phone or otp' });

    const stored = await redis.get(`otp:${phone}`);
    if (!stored || stored !== otp) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired code' });
    }

    await redis.del(`otp:${phone}`);

    const db = await connectMongo();
    let user = await db.collection('users').findOne({ phone });
    if (!user) {
      // create new user with role 'user'
      const newUser = {
        email: null,
        phone,
        googleId: null,
        passwordHash: null,
        role: 'user',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(newUser);
      user = newUser;
    }

    const token = makeToken();
    await redis.setex(
      `session:${token}`,
      60 * 60 * 24,
      JSON.stringify({
        email: user.email || null,
        phone: user.phone || null,
        role: user.role
      })
    );

    res.json({
      ok: true,
      method: 'phone_otp',
      phone: user.phone,
      role: user.role,
      sessionToken: token
    });
  } catch (err) {
    console.error('[auth/loginPhone]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Google OAuth login
app.post('/api/auth/loginGoogle', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ ok: false, error: 'Missing idToken' });

    const ticket = await googleOauthClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;

    if (!googleId) {
      return res
        .status(401)
        .json({ ok: false, error: 'Invalid google token' });
    }

    const db = await connectMongo();

    let user = await db.collection('users').findOne({ googleId });
    if (!user && email) {
      user = await db.collection('users').findOne({ email });
    }

    if (!user) {
      // create new user (role 'user')
      const newUser = {
        email: email || null,
        phone: null,
        googleId,
        passwordHash: null,
        role: 'user',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(newUser);
      user = newUser;
    } else if (!user.googleId) {
      await db
        .collection('users')
        .updateOne({ email: user.email }, { $set: { googleId } });
      user.googleId = googleId;
    }

    const token = makeToken();
    await redis.setex(
      `session:${token}`,
      60 * 60 * 24,
      JSON.stringify({
        email: user.email || null,
        role: user.role
      })
    );

    res.json({
      ok: true,
      method: 'google_oauth',
      email: user.email,
      role: user.role,
      sessionToken: token
    });
  } catch (err) {
    console.error('[auth/loginGoogle]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Super Admin User Management ----------
app.get('/api/admin/users', restrictTo(['super_admin']), async (req, res) => {
  try {
    const db = await connectMongo();
    const users = await db
      .collection('users')
      .find({})
      .project({ email: 1, phone: 1, role: 1, createdAt: 1 })
      .toArray();
    res.json({ ok: true, users });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/promote', restrictTo(['super_admin']), async (req, res) => {
  try {
    const { email } = req.body;
    const db = await connectMongo();
    const result = await db
      .collection('users')
      .updateOne({ email }, { $set: { role: 'super_admin' } });
    res.json({ ok: true, updatedCount: result.modifiedCount });
  } catch (err) {
    console.error('[admin/promote]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/demote', restrictTo(['super_admin']), async (req, res) => {
  try {
    const { email } = req.body;
    const db = await connectMongo();
    const result = await db
      .collection('users')
      .updateOne({ email }, { $set: { role: 'admin' } });
    res.json({ ok: true, updatedCount: result.modifiedCount });
  } catch (err) {
    console.error('[admin/demote]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/deleteUser', restrictTo(['super_admin']), async (req, res) => {
  try {
    const { email } = req.body;
    const db = await connectMongo();
    const result = await db.collection('users').deleteOne({ email });
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[admin/deleteUser]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Client Registry / Versioned Projects ----------
app.post('/api/clients/register', async (req, res) => {
  try {
    const {
      buildKey,
      clientId,
      brandName,
      rtl,
      primaryColor,
      accentColor,
      contactEmail
    } = req.body;

    if (buildKey !== process.env.CONTINUE_ADMIN_KEY) {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }

    if (!clientId || !brandName) {
      return res
        .status(400)
        .json({ ok: false, error: 'Missing clientId or brandName' });
    }

    const db = await connectMongo();
    const existing = await db.collection('clients').findOne({ clientId });
    if (existing) {
      return res.json({
        ok: true,
        message: 'Client already exists',
        client: existing
      });
    }

    const newClient = {
      clientId,
      brandName,
      rtl: !!rtl,
      primaryColor: primaryColor || '#000000',
      accentColor: accentColor || '#d4af37',
      contactEmail: contactEmail || null,
      createdAt: new Date()
    };

    await db.collection('clients').insertOne(newClient);

    res.json({
      ok: true,
      message: 'Client registered',
      client: newClient
    });
  } catch (err) {
    console.error('[clients/register]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/clients/:clientId/projects', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { buildKey } = req.query;
    if (buildKey !== process.env.CONTINUE_ADMIN_KEY) {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }

    const db = await connectMongo();
    const versions = await db
      .collection('generated_projects')
      .find({ clientId })
      .sort({ createdAt: -1 })
      .project({
        projectName: 1,
        version: 1,
        'metadata.kind': 1,
        createdAt: 1
      })
      .toArray();

    res.json({ ok: true, clientId, projects: versions });
  } catch (err) {
    console.error('[clients/:clientId/projects]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Builder: scaffold project + save version ----------
app.post('/api/builder/scaffold', async (req, res) => {
  try {
    const {
      buildKey,
      projectName,
      clientId,
      kind,
      brandName,
      brandTone,
      rtl,
      primaryColor,
      accentColor,
      title,
      heroLine,
      ctaText
    } = req.body;

    if (buildKey !== process.env.CONTINUE_ADMIN_KEY) {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }

    if (!projectName || !clientId) {
      return res
        .status(400)
        .json({ ok: false, error: 'Missing projectName or clientId' });
    }

    const db = await connectMongo();

    // next version number
    const latest = await db
      .collection('generated_projects')
      .find({ clientId, projectName })
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    const nextVersion = latest.length ? latest[0].version + 1 : 1;

    // minimal generated project skeleton
    const now = new Date();
    const files = {};

    files[`frontend-${projectName}/README.md`] = `
# ${brandName || projectName} Frontend
Primary Color: ${primaryColor}
Accent Color: ${accentColor}
Direction: ${rtl ? 'rtl' : 'ltr'}
Hero Title: ${title}
Hero Line: ${heroLine}
CTA: ${ctaText}
Tone: ${brandTone}
Generated at: ${now.toISOString()}
`;

    files[`backend-${projectName}/README.md`] = `
# ${brandName || projectName} Backend
Client: ${clientId}
Kind: ${kind}
Generated at: ${now.toISOString()}
`;

    files[`mobile-${projectName}/README.md`] = `
# ${brandName || projectName} Mobile App
Client: ${clientId}
Kind: ${kind}
Generated at: ${now.toISOString()}
`;

    await db.collection('generated_projects').insertOne({
      clientId,
      projectName,
      version: nextVersion,
      metadata: {
        kind: kind || 'platform',
        brandName,
        rtl: !!rtl,
        primaryColor,
        accentColor,
        title,
        heroLine,
        ctaText,
        brandTone
      },
      files,
      createdAt: now
    });

    res.json({
      ok: true,
      projectName,
      clientId,
      version: nextVersion,
      message: 'Project scaffolded and version saved.'
    });
  } catch (err) {
    console.error('[builder/scaffold]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Builder: download version as ZIP ----------
app.get('/api/builder/download', async (req, res) => {
  try {
    const { buildKey, projectName, clientId, version } = req.query;
    if (buildKey !== process.env.CONTINUE_ADMIN_KEY) {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }
    if (!projectName || !clientId || !version) {
      return res
        .status(400)
        .json({ ok: false, error: 'Missing projectName, clientId, or version' });
    }

    const db = await connectMongo();
    const doc = await db.collection('generated_projects').findOne({
      projectName,
      clientId,
      version: parseInt(version, 10)
    });

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, error: 'Requested version not found' });
    }

    const files = doc.files || {};

    const zipStream = new stream.PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(zipStream);

    for (const [filePath, fileContent] of Object.entries(files)) {
      archive.append(fileContent, { name: filePath });
    }

    archive.finalize();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${projectName}-v${version}.zip"`
    );
    zipStream.pipe(res);
  } catch (err) {
    console.error('[builder/download]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Builder: AI Plan + SavePlanToNotion ----------
app.post('/api/builder/plan', async (req, res) => {
  try {
    const { buildKey, clientId, businessType, features, scale, tone } = req.body;
    if (buildKey !== process.env.CONTINUE_ADMIN_KEY) {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }

    const planningPrompt = `أنت InfinityX AI Architect.
اكتب وثيقة تخطيط تقنية/تجارية جاهزة لتقديمها لعميل.
معلومات العميل:
- clientId: ${clientId}
- نوع النشاط: ${businessType}
- المزايا المطلوبة: ${Array.isArray(features) ? features.join(", ") : features}
- الحجم المتوقع: ${scale}
- أسلوب البراند: ${tone}

الأقسام المطلوبة:
1. نظرة عامة
2. الوظائف المطلوبة (Features)
3. البنية التقنية (Architecture Proposal)
4. نموذج البيانات (Data Model)
5. رحلة المستخدم (User Flow)
6. المخاطر والتنبيهات (Risks / Legal / Privacy)
7. المطلوب من العميل قبل الإطلاق (Deliverables)`;

    const aiRes = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${process.env.CF_TEXT_MODEL}`,
      { messages: [{ role: 'user', content: planningPrompt }] },
      { headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}` } }
    );

    let planText = '';
    if (aiRes?.data?.result?.response) {
      planText = aiRes.data.result.response;
    } else {
      planText = JSON.stringify(aiRes.data, null, 2);
    }

    res.json({ ok: true, clientId, plan: planText });
  } catch (err) {
    console.error('[builder/plan]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/builder/savePlanToNotion', async (req, res) => {
  try {
    const { buildKey, clientId, planContent } = req.body;
    if (buildKey !== process.env.CONTINUE_ADMIN_KEY) {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }
    if (!clientId || !planContent) {
      return res
        .status(400)
        .json({ ok: false, error: 'Missing clientId or planContent' });
    }

    const notionResp = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: `Plan - ${clientId} - ${new Date().toISOString()}`
              }
            }
          ]
        },
        Client: {
          rich_text: [{ text: { content: clientId } }]
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: planContent } }] }
        }
      ]
    });

    res.json({ ok: true, notionPageId: notionResp.id });
  } catch (err) {
    console.error('[builder/savePlanToNotion]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Agent endpoint ----------
app.post('/api/agent/execute', async (req, res) => {
  try {
    const { input, userId } = req.body;
    const db = await connectMongo();

    const conversationsCol = db.collection('conversations');
    const conversation =
      (await conversationsCol.findOne({ userId })) || { history: [] };

    const summarizedHistory = await memory.summarize(
      (conversation.history || []).join('\n')
    );
    const fullInput = summarizedHistory + '\n' + input;

    const result = await agentExecutor.invoke({ input: fullInput });

    await conversationsCol.updateOne(
      { userId },
      {
        $push: {
          history: input,
          response: result.output
        }
      },
      { upsert: true }
    );

    res.json({ ok: true, output: result.output });
  } catch (error) {
    console.error('[agent/execute]', error);
    res
      .status(500)
      .json({ ok: false, error: error.message || 'Agent execution failed' });
  }
});

// ---------- Health ----------
app.get('/health', async (req, res) => {
  try {
    const cache = await redis.get('/health');
    if (cache) {
      return res.json(JSON.parse(cache));
    }
    const data = { ok: true, time: new Date().toISOString() };
    await redis.setex('/health', 60, JSON.stringify(data));
    res.json(data);
  } catch (err) {
    console.error('[health]', err);
    res.status(500).json({ ok: false, error: 'health check failed' });
  }
});

// ---------- deploy + feedback stubs ----------
app.post('/api/deploy/github', async (req, res) => {
  try {
    if (process.env.RENDER_DEPLOY_HOOK) {
      await axios.post(process.env.RENDER_DEPLOY_HOOK);
    }
    res.json({ ok: true, message: 'Deploy triggered' });
  } catch (err) {
    console.error('[deploy/github]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { feedback, context } = req.body;
    if (process.env.HF_STT_MODEL && process.env.HF_TOKEN) {
      await axios.post(
        `https://api.huggingface.co/models/${process.env.HF_STT_MODEL}/fine-tune`,
        { feedback, content: context },
        { headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } }
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[feedback]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack);
  res.status(500).json({ ok: false, error: 'Something broke!' });
});

// ---------- Start server & init super admin ----------
connectMongo()
  .then(() => {
    return initSuperAdmin();
  })
  .catch(console.error);

app.listen(PORT, () => {
  console.log(`InfinityX Backend running on ${PORT}`);
});

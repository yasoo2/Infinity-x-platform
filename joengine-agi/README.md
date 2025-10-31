# 🤖 JOEngine AGI v2.0

**Advanced Artificial General Intelligence System**

نظام ذكاء اصطناعي عام (AGI) متقدم، قادر على حل أي مشكلة، تطوير نفسه تلقائياً، وبناء الأنظمة بشكل مستقل بدون تدخل بشري.

---

## 🌟 الميزات

### 🧠 Reasoning Engine (العقل المفكر)
- تحليل الأهداف المعقدة وتقسيمها إلى مهام فرعية
- التخطيط الاستراتيجي باستخدام Hierarchical Task Network (HTN)
- اتخاذ القرارات الذكية بناءً على السياق
- التعلم من الأخطاء وتحسين الخطط

### 🔄 Agent Loop (حلقة التنفيذ المستقلة)
- تنفيذ المهام بشكل مستقل
- العمل في الخلفية بشكل مستمر
- إدارة قائمة انتظار المهام
- إعادة المحاولة التلقائية عند الفشل

### 🛠️ Advanced Tools System
- **Browser Tool**: تصفح الويب، تحليل الصفحات، ملء النماذج
- **Code Tool**: كتابة، تعديل، وتنفيذ الكود (Python, JS, Shell)
- **Search Tool**: البحث في الإنترنت (قريباً)
- **File Tool**: إدارة الملفات (قريباً)
- **API Tool**: الاتصال بأي API خارجي (قريباً)
- **Deploy Tool**: نشر المشاريع على السحابة (قريباً)

### 📚 Memory System
- **Short-term Memory**: الذاكرة قصيرة المدى للمحادثة الحالية
- **Long-term Memory**: الذاكرة طويلة المدى للتجارب السابقة
- **Plans Memory**: حفظ جميع الخطط المُنشأة

### 🎓 Self-Learning (قريباً)
- تحليل الأداء وتحديد نقاط الضعف
- توليد كود جديد لتحسين النفس
- اختبار وتطبيق التحسينات تلقائياً

---

## 🚀 التثبيت

### المتطلبات
- Node.js >= 18.0.0
- OpenAI API Key
- MongoDB (اختياري - للذاكرة طويلة المدى)

### الخطوات

1. **استنساخ المشروع**
```bash
cd joengine-agi
```

2. **تثبيت التبعيات**
```bash
npm install
```

3. **إعداد متغيرات البيئة**
```bash
cp .env.example .env
nano .env
```

أضف OpenAI API Key:
```env
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

4. **تشغيل JOEngine**
```bash
npm start
```

---

## 📖 الاستخدام

### مثال بسيط

```javascript
import JOEngine from './index.mjs';

// إنشاء JOEngine
const joengine = new JOEngine();

// بدء التشغيل
await joengine.start();

// إضافة مهمة
await joengine.addTask(
  'Build a simple landing page for a coffee shop',
  { style: 'modern', colors: ['brown', 'white'] }
);

// عرض الحالة
joengine.printStatus();
```

### أمثلة على المهام

#### 1. بناء موقع ويب
```javascript
await joengine.addTask(
  'Build a complete landing page for a tech startup with contact form',
  { 
    name: 'TechCo',
    description: 'AI-powered solutions',
    sections: ['hero', 'features', 'pricing', 'contact']
  }
);
```

#### 2. البحث وتحليل البيانات
```javascript
await joengine.addTask(
  'Search for the latest AI research papers and create a summary report',
  { 
    topic: 'Large Language Models',
    sources: ['arxiv', 'google scholar'],
    maxResults: 10
  }
);
```

#### 3. تطوير تطبيق
```javascript
await joengine.addTask(
  'Create a REST API for a todo app with MongoDB',
  { 
    features: ['CRUD operations', 'authentication', 'validation'],
    database: 'mongodb'
  }
);
```

#### 4. تحليل موقع منافس
```javascript
await joengine.addTask(
  'Analyze competitor website and extract key features',
  { 
    url: 'https://example.com',
    analyze: ['design', 'features', 'pricing', 'technology']
  }
);
```

---

## 🏗️ البنية المعمارية

```
joengine-agi/
├── core/
│   └── AgentLoop.mjs          # حلقة التنفيذ المستقلة
├── engines/
│   └── ReasoningEngine.mjs    # محرك التفكير والتخطيط
├── tools/
│   ├── ToolsSystem.mjs         # نظام إدارة الأدوات
│   ├── BrowserTool.mjs         # أداة تصفح الويب
│   ├── CodeTool.mjs            # أداة البرمجة
│   └── ...                     # المزيد من الأدوات
├── interfaces/
│   └── RemoteControl.mjs       # واجهة التحكم عن بعد (قريباً)
├── config/
│   └── config.mjs              # ملفات الإعدادات
├── logs/
│   └── joengine.log            # سجلات النظام
├── index.mjs                   # نقطة الدخول الرئيسية
├── package.json
└── README.md
```

---

## 🎯 خارطة الطريق

### ✅ المرحلة 1: الأساسيات (مكتملة)
- [x] Reasoning Engine
- [x] Agent Loop
- [x] Tools System
- [x] Browser Tool
- [x] Code Tool

### ⏳ المرحلة 2: الأدوات المتقدمة (قيد التطوير)
- [ ] Search Tool
- [ ] File Tool
- [ ] Shell Tool
- [ ] API Tool
- [ ] Database Tool
- [ ] Deploy Tool

### 📅 المرحلة 3: التعلم الذاتي (مخطط)
- [ ] Self-Learning Engine
- [ ] Code Generation for Self-Improvement
- [ ] Automated Testing
- [ ] Self-Deployment

### 📅 المرحلة 4: الواجهات (مخطط)
- [ ] Remote Control UI
- [ ] WebSocket API
- [ ] REST API
- [ ] CLI Interface

### 📅 المرحلة 5: التكامل (مخطط)
- [ ] GitHub Integration
- [ ] Cloudflare Integration
- [ ] AWS Integration
- [ ] Docker/Kubernetes Support

---

## 🔧 التطوير

### تشغيل في وضع التطوير
```bash
npm run dev
```

### الاختبارات
```bash
npm test
```

---

## 📊 الإحصائيات

عرض حالة JOEngine:
```javascript
const status = joengine.getStatus();
console.log(status);
```

النتيجة:
```json
{
  "agentLoop": {
    "running": true,
    "queuedTasks": 2,
    "completedTasks": 15,
    "failedTasks": 1,
    "successRate": 93.75
  },
  "memory": {
    "shortTerm": 10,
    "longTerm": 15,
    "plans": 16,
    "successRate": 93.75
  },
  "tools": {
    "browser": {
      "totalCalls": 45,
      "successRate": 95.5,
      "avgDuration": 1250
    },
    "code": {
      "totalCalls": 32,
      "successRate": 100,
      "avgDuration": 850
    }
  }
}
```

---

## 🤝 المساهمة

نرحب بجميع المساهمات! إذا كنت تريد المساهمة:

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit تغييراتك (`git commit -m 'Add amazing feature'`)
4. Push إلى branch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

---

## 📄 الترخيص

MIT License - انظر ملف [LICENSE](LICENSE)

---

## 🙏 الشكر

- **OpenAI** - لتوفير GPT-4
- **Playwright** - لأداة تصفح الويب
- **LangChain** - للإلهام في تصميم الأدوات

---

## 📞 الدعم

إذا واجهت أي مشاكل أو لديك أسئلة:

- افتح Issue على GitHub
- راسلنا على: support@infinityx.com
- انضم إلى Discord: [رابط Discord]

---

**صُنع بـ ❤️ بواسطة InfinityX Platform**

**JOEngine AGI - المستقبل الآن!** 🚀

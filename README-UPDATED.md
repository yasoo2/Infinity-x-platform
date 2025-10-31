# 🚀 InfinityX Platform

> **منصة AI مجانية ومفتوحة المصدر لبناء المواقع والتطبيقات والمتاجر تلقائياً**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-blue.svg)](https://openai.com/)

---

## ✨ ما هو InfinityX؟

**InfinityX** هو بديل مجاني ومفتوح المصدر لـ Manus - منصة ذكاء اصطناعي تبني لك المواقع والتطبيقات والمتاجر الإلكترونية **من الصفر** وتنشرها **تلقائياً** على الإنترنت!

### 🎯 كيف يعمل؟

1. **أنت تكتب**: "أريد موقع لمقهى مع قائمة الطعام والموقع"
2. **AI يبني**: كود كامل (HTML/CSS/JS أو React)
3. **النظام ينشر**: موقع جاهز على الإنترنت في دقائق!

---

## 🎨 الميزات

### ✅ ما يمكنك بناؤه

| النوع | الوصف | مثال |
|------|--------|------|
| 🌐 **مواقع ويب** | Landing pages, Portfolios, Blogs | موقع شخصي، صفحة منتج |
| 📱 **تطبيقات ويب** | Dashboards, SaaS, Tools | لوحة تحكم، أداة إنتاجية |
| 🛒 **متاجر إلكترونية** | E-commerce stores | متجر ملابس، متجر إلكترونيات |

### 🚀 الميزات التقنية

- ✅ **AI-Powered** - يستخدم OpenAI GPT-4 لتوليد كود احترافي
- ✅ **نشر تلقائي** - ينشر على Cloudflare Pages فوراً
- ✅ **Responsive Design** - يعمل على جميع الأجهزة
- ✅ **Modern Stack** - React, Vite, Tailwind CSS
- ✅ **Real-time Progress** - تتبع بناء المشروع لحظياً
- ✅ **100% مجاني** - يعتمد على أدوات مجانية

---

## 🆚 المقارنة مع Manus

| الميزة | Manus | InfinityX |
|--------|-------|-----------|
| توليد الكود بـ AI | ✅ | ✅ |
| بناء المواقع | ✅ | ✅ |
| بناء التطبيقات | ✅ | ✅ |
| بناء المتاجر | ✅ | ✅ |
| النشر التلقائي | ✅ | ✅ |
| **التكلفة** | 💰 اشتراك | 🆓 **مجاني** |
| **الكود** | 🔒 مغلق | 🔓 **مفتوح المصدر** |

---

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────────────────────────┐
│                     InfinityX Platform                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │ ───▶ │   Backend    │ ───▶ │   MongoDB    │
│ (Cloudflare) │      │   (Render)   │      │   (Atlas)    │
│              │      │              │      │              │
│  Dashboard   │      │  REST API    │      │  Database    │
│  Build UI    │      │  Auth        │      │  Jobs        │
└──────────────┘      └──────────────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   AI Worker  │
                      │   (Render)   │
                      │              │
                      │  OpenAI API  │
                      │  Generator   │
                      │  Deployer    │
                      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Cloudflare  │
                      │    Pages     │
                      │              │
                      │  Generated   │
                      │  Projects    │
                      └──────────────┘
```

---

## 📦 المكونات

### 1. Frontend (Dashboard)
- **التقنية**: React + Vite + Tailwind CSS
- **الاستضافة**: Cloudflare Pages
- **الميزات**:
  - واجهة بناء المشاريع
  - متابعة التقدم Real-time
  - عرض المشاريع المنشورة

### 2. Backend (API)
- **التقنية**: Node.js + Express
- **الاستضافة**: Render
- **الميزات**:
  - REST API
  - نظام المصادقة
  - إدارة المستخدمين

### 3. AI Worker
- **التقنية**: Node.js + OpenAI API
- **الاستضافة**: Render (Background Worker)
- **الميزات**:
  - توليد الكود بـ AI
  - بناء المشاريع
  - النشر التلقائي

### 4. Database
- **التقنية**: MongoDB Atlas
- **الميزات**:
  - تخزين المستخدمين
  - تخزين المشاريع
  - تتبع الحالة

---

## 🚀 البدء السريع

### المتطلبات

- Node.js 18+
- حسابات مجانية في:
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
  - [Render](https://render.com)
  - [Cloudflare](https://cloudflare.com)
  - [OpenAI](https://platform.openai.com)

### التثبيت

```bash
# 1. استنساخ المشروع
git clone https://github.com/yasoo2/Infinity-x-platform.git
cd Infinity-x-platform

# 2. تثبيت Backend
cd backend
npm install --legacy-peer-deps

# 3. تثبيت Worker
cd ../worker
npm install

# 4. تثبيت Frontend
cd ../dashboard-x
npm install
```

### الإعداد

اقرأ [SETUP_GUIDE.md](./SETUP_GUIDE.md) للحصول على دليل كامل خطوة بخطوة.

---

## 💻 الاستخدام

### 1. تسجيل الدخول

```
URL: https://xelitesolutions.com
Email: info.auraaluxury@gmail.com
Password: younes2025
```

### 2. بناء مشروع جديد

1. اذهب إلى صفحة "🎨 Build"
2. اختر نوع المشروع:
   - **Website** - للمواقع البسيطة
   - **Web App** - للتطبيقات التفاعلية
   - **E-commerce** - للمتاجر الإلكترونية
3. أدخل التفاصيل:
   - **العنوان**: اسم المشروع
   - **الوصف**: وصف دقيق لما تريد
4. اضغط "Build with AI"
5. انتظر 1-2 دقيقة
6. احصل على رابط الموقع الجاهز!

### 3. أمثلة على الأوصاف

#### موقع ويب
```
"موقع حديث لمقهى متخصص في القهوة المحمصة، يتضمن:
- صفحة رئيسية جذابة
- قائمة المنتجات مع الأسعار
- معلومات التواصل والموقع
- نموذج حجز طاولة"
```

#### تطبيق ويب
```
"تطبيق إدارة مهام بسيط يتضمن:
- قائمة المهام مع checkbox
- إضافة وحذف المهام
- تصنيف حسب الحالة (مكتمل/غير مكتمل)
- تصميم نظيف وسهل الاستخدام"
```

#### متجر إلكتروني
```
"متجر إلكتروني لبيع الملابس يتضمن:
- صفحة رئيسية مع المنتجات المميزة
- صفحة المنتجات مع فلترة حسب الفئة
- صفحة تفاصيل المنتج
- سلة التسوق
- صفحة الدفع"
```

---

## 🛠️ التطوير المحلي

### Backend
```bash
cd backend
npm run dev
# يعمل على http://localhost:3000
```

### Worker
```bash
cd worker
npm run dev
# يعالج المهام من MongoDB
```

### Frontend
```bash
cd dashboard-x
npm run dev
# يعمل على http://localhost:5173
```

---

## 📊 الحالة

- ✅ **Backend API** - يعمل
- ✅ **AI Worker** - يعمل
- ✅ **Frontend** - يعمل
- ✅ **Authentication** - يعمل
- ✅ **Project Generation** - يعمل
- ⚠️ **Auto Deployment** - يحتاج Cloudflare API Token

---

## 🔐 الأمان

- ✅ كلمات المرور مشفرة (bcrypt)
- ✅ JWT للمصادقة
- ✅ HTTPS فقط في Production
- ✅ Environment Variables للمفاتيح السرية
- ✅ Rate Limiting على API

---

## 🤝 المساهمة

نرحب بالمساهمات! يمكنك:

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

---

## 📝 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE) - استخدمه بحرية!

---

## 🙏 شكر خاص

- [OpenAI](https://openai.com/) - لـ GPT-4 API
- [MongoDB](https://www.mongodb.com/) - لـ Atlas Free Tier
- [Render](https://render.com/) - للاستضافة المجانية
- [Cloudflare](https://cloudflare.com/) - لـ Pages

---

## 📞 التواصل

- **Email**: info.auraaluxury@gmail.com
- **GitHub**: [@yasoo2](https://github.com/yasoo2)
- **Website**: https://xelitesolutions.com

---

## 🌟 ادعمنا

إذا أعجبك المشروع:
- ⭐ ضع نجمة على GitHub
- 🔄 شارك المشروع
- 🐛 أبلغ عن المشاكل
- 💡 اقترح ميزات جديدة

---

**تم بناؤه بـ ❤️ باستخدام AI**


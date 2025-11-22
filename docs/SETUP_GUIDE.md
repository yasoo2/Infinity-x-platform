# InfinityX Platform - دليل الإعداد الكامل

## 🎯 نظرة عامة

**InfinityX** هو منصة AI مجانية ومفتوحة المصدر لبناء المواقع والتطبيقات والمتاجر الإلكترونية تلقائياً باستخدام الذكاء الاصطناعي.

### ✨ الميزات الرئيسية

- 🎨 **بناء المواقع** - مواقع حديثة وجذابة
- 📱 **بناء التطبيقات** - تطبيقات ويب تفاعلية
- 🛒 **بناء المتاجر** - متاجر إلكترونية كاملة
- 🚀 **نشر تلقائي** - على Cloudflare Pages
- 🤖 **AI-Powered** - يستخدم OpenAI GPT-4
- 💯 **مجاني 100%** - يعتمد على أدوات مجانية

---

## 📋 المتطلبات

### 1. حسابات مجانية

- ✅ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) - قاعدة بيانات
- ✅ [Render](https://render.com) - استضافة Backend + Worker
- ✅ [Cloudflare](https://cloudflare.com) - استضافة Frontend + النشر
- ✅ [OpenAI](https://platform.openai.com) - AI Engine (يحتاج رصيد)
- ✅ [GitHub](https://github.com) - إدارة الكود

### 2. API Keys المطلوبة

- `MONGO_URI` - من MongoDB Atlas
- `OPENAI_API_KEY` - من OpenAI Platform
- `CLOUDFLARE_ACCOUNT_ID` - من Cloudflare Dashboard
- `CLOUDFLARE_API_TOKEN` - من Cloudflare Dashboard

---

## 🚀 خطوات الإعداد

### المرحلة 1: قاعدة البيانات (MongoDB Atlas)

1. **إنشاء Cluster مجاني**
   - اذهب إلى https://cloud.mongodb.com
   - سجل دخول أو أنشئ حساب
   - اضغط "Build a Database"
   - اختر "M0 Free" tier
   - اختر المنطقة الأقرب لك
   - اضغط "Create Cluster"

2. **إنشاء Database User**
   - اذهب إلى "Database Access"
   - اضغط "Add New Database User"
   - اختر "Password" authentication
   - Username: `future-admin`
   - Password: `younes2025` (أو أي كلمة مرور قوية)
   - Database User Privileges: "Atlas admin"
   - اضغط "Add User"

3. **السماح بالاتصال من أي مكان**
   - اذهب إلى "Network Access"
   - اضغط "Add IP Address"
   - اضغط "Allow Access from Anywhere" (0.0.0.0/0)
   - اضغط "Confirm"

4. **الحصول على Connection String**
   - ارجع إلى "Database"
   - اضغط "Connect" بجانب الـ cluster
   - اختر "Connect your application"
   - انسخ الـ connection string:
     ```
     mongodb+srv://future-admin:younes2025@cluster-future.xxxxx.mongodb.net/?appName=Cluster-future
     ```

### المرحلة 2: OpenAI API Key

1. اذهب إلى https://platform.openai.com/api-keys
2. سجل دخول أو أنشئ حساب
3. اضغط "Create new secret key"
4. انسخ المفتاح (يبدأ بـ `sk-proj-...`)
5. **مهم**: أضف رصيد ($5 على الأقل) في https://platform.openai.com/settings/organization/billing

### المرحلة 3: Cloudflare (للنشر التلقائي)

1. **Account ID**
   - اذهب إلى https://dash.cloudflare.com
   - سجل دخول
   - من الـ sidebar، اضغط على اسم حسابك
   - انسخ "Account ID"

2. **API Token**
   - اذهب إلى https://dash.cloudflare.com/profile/api-tokens
   - اضغط "Create Token"
   - اختر "Edit Cloudflare Workers" template
   - أو أنشئ Custom Token مع:
     - Permissions: `Account > Cloudflare Pages > Edit`
     - Account Resources: `Include > [Your Account]`
   - اضغط "Continue to summary" ثم "Create Token"
   - انسخ الـ Token

### المرحلة 4: نشر Backend على Render

1. **Fork المشروع**
   - اذهب إلى https://github.com/yasoo2/Infinity-x-platform
   - اضغط "Fork" (إذا لم تكن المالك)

2. **إنشاء Web Service**
   - اذهب إلى https://dashboard.render.com
   - اضغط "New +" → "Web Service"
   - اختر المستودع: `Infinity-x-platform`
   - Name: `infinityx-backend`
   - Region: `Oregon (US West)`
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install --legacy-peer-deps`
   - Start Command: `npm start`
   - Plan: `Free`

3. **إضافة Environment Variables**
   ```
   MONGO_URI=mongodb+srv://future-admin:younes2025@cluster-future.xxxxx.mongodb.net/?appName=Cluster-future
   DB_NAME=future_system
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
   NODE_ENV=production
   ```

4. **Deploy**
   - اضغط "Create Web Service"
   - انتظر حتى يكتمل النشر (2-3 دقائق)

### المرحلة 5: نشر Worker على Render

1. **إنشاء Background Worker**
   - في Render Dashboard، اضغط "New +" → "Background Worker"
   - اختر نفس المستودع: `Infinity-x-platform`
   - Name: `infinityx-worker`
   - Region: `Oregon (US West)`
   - Branch: `main`
   - Root Directory: `worker`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node worker-enhanced.mjs`
   - Plan: `Free`

2. **إضافة Environment Variables**
   ```
   MONGO_URI=mongodb+srv://future-admin:younes2025@cluster-future.xxxxx.mongodb.net/?appName=Cluster-future
   DB_NAME=future_system
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
   CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   PROJECTS_DIR=/tmp/infinity-projects
   NODE_ENV=production
   ```

3. **Deploy**
   - اضغط "Create Background Worker"
   - انتظر حتى يكتمل النشر

### المرحلة 6: نشر Frontend على Cloudflare Pages

1. **إنشاء Project**
   - اذهب إلى https://dash.cloudflare.com
   - اضغط "Workers & Pages" من الـ sidebar
   - اضغط "Create application" → "Pages" → "Connect to Git"
   - اختر المستودع: `Infinity-x-platform`
   - Project name: `xelitesolutions` (أو أي اسم)
   - Production branch: `main`
   - Build settings:
     - Framework preset: `Vite`
     - Build command: `cd dashboard-x && npm install && npm run build`
     - Build output directory: `dashboard-x/dist`
   - Environment variables:
     ```
     VITE_API_URL=https://infinityx-backend.onrender.com
     ```

2. **Deploy**
   - اضغط "Save and Deploy"
   - انتظر حتى يكتمل النشر (2-3 دقائق)
   - ستحصل على رابط مثل: `https://xelitesolutions.pages.dev`

3. **ربط Domain مخصص (اختياري)**
   - في Cloudflare Pages، اذهب إلى "Custom domains"
   - اضغط "Set up a custom domain"
   - أدخل `xelitesolutions.com`
   - اتبع التعليمات لتحديث DNS

---

## 🎉 الاختبار

### 1. تسجيل الدخول

1. افتح `https://xelitesolutions.com` (أو رابط Cloudflare Pages)
2. سجل دخول بـ:
   - Email: `info.auraaluxury@gmail.com`
   - Password: `younes2025`

### 2. بناء مشروع

1. اذهب إلى صفحة "🎨 Build"
2. اختر نوع المشروع (Website / Web App / E-commerce)
3. أدخل عنوان ووصف المشروع
4. اضغط "Build with AI"
5. انتظر حتى يكتمل البناء (1-2 دقيقة)
6. ستظهر رابط الموقع المنشور تلقائياً!

---

## 🔧 استكشاف الأخطاء

### Worker لا يعمل

**المشكلة**: المشاريع تبقى في حالة "QUEUED"

**الحل**:
1. تحقق من Worker logs في Render
2. تأكد من `OPENAI_API_KEY` صحيح ولديه رصيد
3. تأكد من `MONGO_URI` صحيح
4. أعد تشغيل Worker من Render Dashboard

### النشر على Cloudflare لا يعمل

**المشكلة**: المشاريع تُبنى لكن لا تُنشر

**الحل**:
1. تحقق من `CLOUDFLARE_ACCOUNT_ID` و `CLOUDFLARE_API_TOKEN`
2. تأكد من أن الـ API Token لديه صلاحيات `Cloudflare Pages > Edit`
3. راجع Worker logs للأخطاء

### OpenAI API Error

**المشكلة**: `insufficient_quota` أو `invalid_api_key`

**الحل**:
1. تحقق من رصيد OpenAI: https://platform.openai.com/usage
2. أضف رصيد جديد إذا لزم الأمر
3. تأكد من أن المفتاح صحيح وغير منتهي

---

## 💰 التكاليف

| الخدمة | الخطة المجانية | التكلفة المتوقعة |
|--------|----------------|-------------------|
| **MongoDB Atlas** | 512 MB | $0/شهر |
| **Render Backend** | 750 ساعة/شهر | $0/شهر |
| **Render Worker** | 750 ساعة/شهر | $0/شهر |
| **Cloudflare Pages** | Unlimited | $0/شهر |
| **OpenAI API** | Pay-as-you-go | ~$0.01-0.05 لكل مشروع |

**إجمالي**: ~$1-5/شهر (فقط OpenAI API)

---

## 📚 الموارد

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Render Docs](https://render.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

## 🤝 المساهمة

المشروع مفتوح المصدر! يمكنك:
- الإبلاغ عن المشاكل في GitHub Issues
- إرسال Pull Requests
- تحسين الكود والميزات

---

## 📄 الترخيص

MIT License - استخدم المشروع بحرية!

---

**تم بناؤه بـ ❤️ باستخدام AI**

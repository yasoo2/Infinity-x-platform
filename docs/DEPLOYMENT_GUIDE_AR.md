# دليل النشر والإصلاح - Infinity-X Platform

## 📋 المحتويات

1. [إعداد قاعدة البيانات](#إعداد-قاعدة-البيانات)
2. [إعداد متغيرات البيئة](#إعداد-متغيرات-البيئة)
3. [تحديث الكود](#تحديث-الكود)
4. [إنشاء Super Admin](#إنشاء-super-admin)
5. [النشر](#النشر)
6. [الاختبار](#الاختبار)

---

## 1. إعداد قاعدة البيانات

### MongoDB Atlas (مجاني)

1. **إنشاء حساب**:
   - اذهب إلى: https://www.mongodb.com/cloud/atlas/register
   - أنشئ حساب مجاني

2. **إنشاء Cluster**:
   - اختر "Create a FREE cluster"
   - اختر المنطقة الأقرب لك (مثل Frankfurt)
   - انتظر حتى يتم إنشاء الـ cluster (2-3 دقائق)

3. **إعداد الوصول**:
   - اذهب إلى "Database Access"
   - أضف مستخدم جديد (username + password)
   - احفظ البيانات في مكان آمن

4. **السماح بالاتصال**:
   - اذهب إلى "Network Access"
   - اضغط "Add IP Address"
   - اختر "Allow Access from Anywhere" (0.0.0.0/0)

5. **الحصول على رابط الاتصال**:
   - اذهب إلى "Database"
   - اضغط "Connect"
   - اختر "Connect your application"
   - انسخ الرابط (يبدأ بـ `mongodb+srv://...`)
   - استبدل `<password>` بكلمة المرور الحقيقية

---

## 2. إعداد متغيرات البيئة

### على Render

1. **اذهب إلى Render Dashboard**:
   - https://dashboard.render.com

2. **اختر `infinityx-backend`**

3. **اذهب إلى "Environment"**

4. **أضف المتغيرات التالية**:

   | Key | Value | ملاحظات |
   |-----|-------|---------|
   | `MONGO_URI` | `mongodb+srv://...` | من MongoDB Atlas |
   | `DB_NAME` | `future_system` | اسم قاعدة البيانات |
   | `NODE_ENV` | `production` | بيئة الإنتاج |
   | `PORT` | `10000` | البورت (موجود مسبقاً) |

5. **اضغط "Save Changes"**

---

## 3. تحديث الكود

### الملفات التي يجب تحديثها:

#### 3.1 تحديث `Login.jsx`

استبدل محتوى `dashboard-x/src/pages/Login.jsx` بمحتوى `Login_FIXED.jsx`:

```bash
cd dashboard-x/src/pages
mv Login.jsx Login_OLD.jsx
mv Login_FIXED.jsx Login.jsx
```

#### 3.2 إضافة صفحة Signup

انسخ ملف `Signup.jsx` إلى مجلد `pages`:

```bash
# الملف موجود بالفعل في:
# dashboard-x/src/pages/Signup.jsx
```

#### 3.3 تحديث `App.jsx`

أضف route للـ Signup:

```jsx
// في dashboard-x/src/App.jsx
import Signup from './pages/Signup';

// أضف هذا السطر في Routes:
<Route path="/signup" element={<Signup />} />
```

#### 3.4 إضافة endpoint التسجيل في Backend

أضف الكود من `REGISTER_ENDPOINT.mjs` في `backend/server.mjs` بعد endpoint `/api/auth/login`.

---

## 4. إنشاء Super Admin

### الطريقة 1: باستخدام السكريبت (موصى به)

```bash
cd backend
npm install  # إذا لم تكن مثبتة
node scripts/create-super-admin.mjs
```

سيطلب منك:
- API URL (اضغط Enter للافتراضي)
- Email
- Password
- Phone (اختياري)

### الطريقة 2: باستخدام curl

```bash
curl -X POST https://api.xelitesolutions.com/api/auth/bootstrap-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@xelitesolutions.com",
    "password": "YourStrongPassword123"
  }'
```

---

## 5. النشر

### 5.1 نشر الكود على GitHub

```bash
# في مجلد المشروع الرئيسي
git add .
git commit -m "Fix: Update authentication system"
git push origin main
```

### 5.2 نشر Frontend على Cloudflare

سيتم النشر تلقائياً عند push إلى GitHub (إذا كان Cloudflare Pages متصل بالـ repo).

أو يمكنك النشر يدوياً:

```bash
cd dashboard-x
pnpm install
pnpm run build

# ثم ارفع محتوى dist/ إلى Cloudflare Pages
```

### 5.3 نشر Backend على Render

سيتم النشر تلقائياً عند push إلى GitHub.

أو يمكنك إعادة النشر يدوياً من Render Dashboard:
- اذهب إلى `infinityx-backend`
- اضغط "Manual Deploy" > "Deploy latest commit"

---

## 6. الاختبار

### 6.1 اختبار Backend

```bash
# اختبار الصفحة الرئيسية
curl https://api.xelitesolutions.com

# يجب أن تحصل على:
# {"ok":true,"service":"InfinityX Backend / Future Systems Core","msg":"Running",...}
```

### 6.2 اختبار تسجيل الدخول

```bash
curl -X POST https://api.xelitesolutions.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@xelitesolutions.com",
    "password": "YourPassword"
  }'

# يجب أن تحصل على:
# {"ok":true,"sessionToken":"...","user":{...}}
```

### 6.3 اختبار Frontend

1. افتح المتصفح واذهب إلى: https://xelitesolutions.com
2. يجب أن تظهر صفحة Login
3. أدخل Email وPassword
4. يجب أن يتم تسجيل الدخول والتوجيه إلى Dashboard

---

## 🔧 استكشاف الأخطاء

### المشكلة: Backend لا يعمل

**الحل**:
1. تحقق من متغيرات البيئة على Render
2. تحقق من Logs في Render Dashboard
3. تأكد من أن `MONGO_URI` صحيح

### المشكلة: Frontend لا يتصل بـ Backend

**الحل**:
1. تحقق من ملف `.env` في `dashboard-x`:
   ```
   VITE_API_BASE_URL=https://api.xelitesolutions.com
   ```
2. تأكد من أن Backend يعمل
3. تحقق من CORS في `backend/server.mjs`

### المشكلة: لا يمكن تسجيل الدخول

**الحل**:
1. تأكد من إنشاء Super Admin أولاً
2. تحقق من Email وPassword
3. افتح Console في المتصفح وابحث عن أخطاء

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من Logs في Render
2. تحقق من Console في المتصفح
3. تحقق من Network tab في DevTools

---

## ✅ قائمة التحقق النهائية

- [ ] MongoDB Atlas تم إعداده
- [ ] متغيرات البيئة تم إضافتها على Render
- [ ] الكود تم تحديثه على GitHub
- [ ] Super Admin تم إنشاؤه
- [ ] Backend يعمل بشكل صحيح
- [ ] Frontend يعمل بشكل صحيح
- [ ] تسجيل الدخول يعمل

---

**تم بنجاح! 🎉**

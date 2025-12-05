# نظرة شاملة على منصة Infinity-X ودليل الاختبار السريع

يُلخّص هذا المستند أبرز خدمات منصة Infinity-X/JOE ويقدّم أوامر عملية للتحقق السريع أثناء الاستكشاف المحلي.

## هيكل المستودع
- **الواجهة الخلفية (`backend/`)**: تطبيق Node.js/Express يستضيف واجهات REST والـ WebSocket، ويحتوي على تنسيقات الأمان، وتنفيذ منظّم للذكاء الاصطناعي، وتكاملات قاعدة البيانات. نقطة الدخول `backend/server.mjs`.
- **لوحة التحكم (`dashboard-x/`)**: تطبيق React + Vite بنواة في `dashboard-x/src/App.jsx` وصفحة رئيسية `src/pages/Joe.jsx`.
- **الموقع العام (`public-site/`)**: ملفات ثابتة (HTML/CSS/JS) في `public-site/index.html` والمجلدات التابعة.
- **العامل الخلفي (`worker/`)**: مهام مجدولة/ثقيلة تُشغَّل عبر `worker-enhanced.mjs` مع سكربتات `npm start` و`npm run dev`.
- **عامل Cloudflare (`cloudflare-worker/`)**: وظائف حافة (Edge) مثل معالجة CORS عند نشر البوابة الأمامية.
- **المستندات والبنية التحتية (`docs/`, `infra/`)**: مراجع للنشر وأدوات مساعدة.

## ملاحظات واختبارات الواجهة الخلفية
- تثبيت الاعتمادات: `cd backend && npm install` (مطلوب قبل أي lint أو Jest).
- التشغيل: `npm start` يستخدم `server.mjs` لتهيئة اتصال Mongo، إنشاء المشرف الأعلى، تشغيل الـ schedulers، وتهيئة خوادم WebSocket.
- الحماية: Helmet، تحديد المعدّل، فلاتر XSS/حقن Mongo، ولائحة CORS ديناميكية تُطبع عند الإقلاع.
- أوامر التحقق السريعة:
  - `npm run lint`: تفقد ESLint لكود الواجهة الخلفية (باستثناء خدمة code-review المستبعدة من إعادة الهيكلة).
  - `npm test`: يشغّل Jest عندما تتوفر البيئة (مثلاً Mongo). للمدى الأصغر: `npm run test:unit` أو `npm run test:integration`.
  - `npm run demo`: يشغّل مثال التفاعل في `examples/demo.js` بعد تثبيت الاعتمادات.

## لوحة التحكم (Dashboard-X)
- تثبيت الاعتمادات: `cd dashboard-x && pnpm install` (الإصدار المثبّت `pnpm@10.20.0`).
- أوامر التطوير: `pnpm dev` للتشغيل المحلي (Vite)، `pnpm preview` للمعاينة، و`pnpm build` لإنتاج الحزمة.
- التدقيق: `pnpm lint` لفحص `src/**/*.{js,jsx,ts,tsx}`.

## الموقع العام
- ملفات ثابتة فقط؛ يمكن خدمتها بأداة بسيطة مثل `npx http-server public-site -p 8080`.
- سكربت `npm start` هنا مجرد رسالة توضيحية لكونه موقعاً تسويقياً ثابتاً.

## خدمة العامل
- تثبيت الاعتمادات عند الحاجة: `cd worker && npm install`.
- التشغيل: `npm start` يشغّل `worker-enhanced.mjs`، بينما `npm run dev` يفعّل وضع المراقبة (watch).

## نصائح الاختبار
- ابدأ بالـ lint للتأكد من صحة الأسلوب دون الحاجة لخدمات خارجية.
- اختبارات تحتاج MongoDB/Redis يجب أن تُضبط عبر `.env` في `backend/` (انظر `env.example`).
- عند اختبار سلوك CORS أو preflight، تُظهر سجلات الواجهة الخلفية قائمة السماح المحسوبة عند الإقلاع لسهولة التحقق.

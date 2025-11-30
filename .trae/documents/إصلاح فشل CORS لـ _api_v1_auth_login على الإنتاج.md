## الحالة الحالية
- الباكند يرد على طلبات preflight بحالة 200 وبجميع رؤوس CORS المطلوبة:
  - المعالجة العامة: `backend/server.mjs:91–111` و `backend/server.mjs:113–130`.
  - لمسار تسجيل الدخول تحديداً: `backend/src/api/auth.router.mjs:71–83`.
- قائمة الأصول المسموحة تشمل: `https://xelitesolutions.com` و `https://www.xelitesolutions.com`، ويمكن توسيعها عبر `CORS_ORIGINS` (`backend/server.mjs:45–63`).
- عامل Cloudflare الاختياري يعكس CORS لكنه يُرجِع 204 لخيارات (OPTIONS): `infra/cloudflare/cors-worker.js:18–20`.
- رسالة كروم تشير إلى أن ردّ preflight "ليس HTTP ok"؛ غالباً يعني أن وسيطاً أمام الباكند (CDN/WAF/Proxy) لا يُعيد 2xx للـ OPTIONS أو يُسقِط الرؤوس.

## خطة الإصلاح
1. توحيد ردّ OPTIONS على الإنتاج ليكون 200 دائماً مع رؤوس CORS كاملة:
   - إن كان هناك وكيل/راوتر أمام Node (NGINX/Cloudflare/WAF)، تأكّد أن OPTIONS لا يُحظر ولا يُعاد توجيهه.
   - إن كنت تستخدم عامل Cloudflare، غيّر حالة OPTIONS من 204 إلى 200 لتفادي حساسية بعض الوسطاء.
2. تثبيت الأصول المسموحة على الخادم عبر البيئة:
   - ضبط `CORS_ORIGINS` ليشمل بدقة: `https://xelitesolutions.com, https://www.xelitesolutions.com` حتى لو كانت ضمن القائمة الافتراضية.
   - إعادة نشر الباكند بعد ضبط البيئة.
3. التأكد من التزام قواعد CORS مع الاعتمادات:
   - عند استخدام `credentials`، يجب أن يكون `Access-Control-Allow-Origin` مساوياً تماماً لـ `Origin` وأن يُوجَد `Access-Control-Allow-Credentials: true`. هذا مُطبّق في الباكند بالفعل (`backend/server.mjs:91–103`).
4. مسار تسجيل الدخول `/api/v1/auth/login`:
   - تأكد أن الوسيط لا يحجب OPTIONS لهذا المسار؛ لدينا معالجة خاصة تُرجِع 200 (`backend/src/api/auth.router.mjs:71–83`).
5. خيار الحماية عند فشل وسيط الإنتاج:
   - نشر عامل Cloudflare CORS على نطاق `api.xelitesolutions.com` بوصفه بوابة تُعيد 200 لخيارات وتحقن رؤوس CORS بشكل حتمي.

## تعديل عامل Cloudflare (إن تم استخدامه)
- استبدال 204 بـ 200 في رد OPTIONS:
  - الملف: `infra/cloudflare/cors-worker.js:18–20`
  - التعديل: `return new Response(null, { status: allowed ? 200 : 403, headers: corsHeaders });`
- تأكد أن `Access-Control-Allow-Headers` يعكس قيمة `Access-Control-Request-Headers` ويحتوي على `Content-Type` على الأقل (`infra/cloudflare/cors-worker.js:6–15`).

## خطوات التحقق
- تحقق من الـ preflight يدوياً من جهازك (أو من خادم قريب من الإنتاج):
  - `curl -i -X OPTIONS 'https://api.xelitesolutions.com/api/v1/auth/login' \
    -H 'Origin: https://www.xelitesolutions.com' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type'`
- النتائج المتوقعة:
  - حالة: `HTTP/1.1 200 OK`.
  - رؤوس: `Access-Control-Allow-Origin: https://www.xelitesolutions.com`، `Access-Control-Allow-Credentials: true`، `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS`، و`Access-Control-Allow-Headers` يحتوي على `content-type`.
- بعد التأكد، اختبر تسجيل الدخول من كروم على `https://www.xelitesolutions.com`.

## نقاط إضافية للأمان والاعتمادات
- لتسجيل الدخول الإداري بأمان على الإنتاج، اضبط:
  - `SUPER_ADMIN_EMAIL` و`SUPER_ADMIN_PASSWORD` في البيئة ثم انشر؛ البذرة تتم تلقائياً (`backend/src/core/setup-admin.mjs`).
- الاعتمادات التطويرية مسموحة حالياً للمستخدمين المدرجين (`backend/src/api/auth.router.mjs:90–106`). يُنصَح بإغلاقها لاحقاً على الإنتاج بعد نجاح الاختبارات.

## خطة الطوارئ إن استمر الفشل
- إن كان الوسيط يعيد غير 2xx للـ OPTIONS ولا يمكن تغييره فوراً:
  - فعّل عامل Cloudflare أمام `api.xelitesolutions.com` لتولّي preflight مع حالة 200 والرؤوس الصحيحة.
  - أو اسمح مؤقتاً بالمسار عبر قاعدة WAF تستثني OPTIONS لـ`/api/v1/auth/login`.

هل تريد أن أنفّذ هذه الخطة الآن (تعديل عامل Cloudflare إلى 200، ضبط `CORS_ORIGINS` ونشر) ثم أتحقق عبر curl وأعطيك تقرير النجاح؟
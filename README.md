FutureSystems / X Elite Solutions

Folders:
- backend/     : API (auth, users, Joe brain endpoints, factory, SEO, 
dashboard data)
- dashboard-x/ : لوحة الإدارة X (UI frontend placeholder)
- public-site/ : موقع الشركة العام (landing, services)
- shared/      : أشياء مشتركة (roles, i18n, constants, 
sanitizeUserForClient)
- worker/      : دماغ جو بالخلفية (ينفذ أوامرك, يقترح تحسينات, SEO, 
factory jobs)

بعد ما يطلع هذا المجلد من السكربت (infinityx-platform-final):
1. افتح GitHub Desktop.
2. ادخل على الريبو infinity-x-platform.
3. انسخ كل محتويات infinityx-platform-final (كل الفولدرات) فوق الريبو.
4. اعمل Commit + Push.
5. على Render:
   - شغل backend/server.mjs على بورت 10000.
   - شغّل worker/worker.mjs كخدمة خلفية (دايماً شغال).


## ملاحظة هامة لإصلاح مشكلة صفحة JOE (خطأ 404 في WebSocket)

**المشكلة:**
تظهر صفحة JOE فارغة على الموقع المباشر (xelitesolutions.com) بسبب فشل اتصال WebSocket بالمسار `/ws/browser`، حيث يعيد الخادم خطأ 404 (غير موجود).

**التشخيص:**
هذا الخلل ليس في الكود المصدري للتطبيق، بل هو مشكلة في **تكوين الخادم/الوكيل العكسي (Reverse Proxy)** الذي تستخدمه (مثل Nginx أو إعدادات Render/Cloudflare). يجب تكوين الوكيل العكسي للسماح بـ **ترقية الاتصال (Connection Upgrade)** لبروتوكول WebSocket.

**الحل (يتطلب الوصول إلى إعدادات الخادم/الوكيل العكسي):**

يجب إضافة قواعد التكوين التالية إلى الوكيل العكسي (مثل Nginx) لجميع الطلبات التي تبدأ بـ `/ws/` وتوجيهها إلى منفذ التطبيق الخلفي (عادةً 10000):

**مثال لتكوين Nginx:**
\`\`\`nginx
server {
    # ... تكوينات الخادم الأخرى ...

    location /ws/ {
        proxy_pass http://localhost:10000; # أو عنوان الخادم الخلفي
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # ... تكوينات الخادم الأخرى ...
}
\`\`\`

**ملاحظة:** إذا كنت تستخدم خدمة استضافة سحابية، يرجى مراجعة وثائقها حول كيفية تمكين دعم WebSocket. هذا الإجراء ضروري لكي تعمل صفحة JOE بشكل صحيح.

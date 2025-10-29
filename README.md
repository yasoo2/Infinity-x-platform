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

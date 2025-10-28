FutureSystems / X Elite Solutions

المحتوى:
- backend/         -> API Express فيها /system/health و /system/live-feed 
و /system/pulse
- dashboard-x/     -> لوحة X (مراقبة جو مباشر + مصنع القوالب + التحكم)
- public-site/     -> موقع الشركة الخارجي (xelitesolutions.com) + صفحات 
البيع
- shared/          -> ثوابت مشتركة (roles, company info ...)
- worker/          -> جو العامل بالخلفية (ما بنام، يطور، يرسل نبض)

جو رح:
- يكمل auth (super_admin / admin / user / joe)
- يربط MongoDB, Redis
- يكمّل dashboard-x واجهة كاملة
- يبني public-site بشكل تسويقي حديث و SEO قوي
- يولد landing pages للبيع بسرعة
- ياخذ صلاحيات كاملة منك لو سمحتله (GitHub commits, تعديل production, 
سيطرة متصفح ذكي...)

هاي النسخة الأساس الرسمية.

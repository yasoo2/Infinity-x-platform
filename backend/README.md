# InfinityX Backend

خادم Node/Express مسؤول عن:
- تسجيل الدخول (إيميل/باسورد، هاتف OTP، Google OAuth)
- إدارة الصلاحيات (user / admin / super_admin)
- لوحة سوبر أدمن لإدارة المستخدمين (ترقية، تنزيل، حذف)
- إدارة العملاء (clients)
- توليد مشاريع جديدة لكل عميل وتخزين كل إصدار (versioned projects)
- تنزيل أي إصدار كـ ZIP جاهز للتسليم
- توليد خطة مشروع (AI Plan) عبر Cloudflare AI وحفظها في Notion
- وكيل ذكاء اصطناعي (agent) قادر على مهام متعددة (Notion، Google Calendar، TTS، توليد صور...)
- تخزين الجلسات في Redis
- MongoDB Atlas لتخزين كل شيء
- حماية أساسية عبر Helmet و Rate Limiter

تشغيل محلي:
1. npm install
2. انسخ .env.example إلى .env واملأ القيم
3. npm run dev

مهم:
- أول تشغيل يقوم بإنشاء حساب super_admin بشكل أوتوماتيكي باستخدام:
  ROOT_SUPERADMIN_EMAIL و ROOT_SUPERADMIN_PASSWORD
- يمكن للسوبر أدمن حذف نفسه نهائيًا (مطلوب للمرونة عند نقل/بيع النظام)

# Cloudflare إعدادات متوافقة مع نظام JOE

هدف هذا الدليل هو ضمان أن `api.xelitesolutions.com` يعمل مع CORS وطلبات Preflight بدون أخطاء، وأن الاتصال من `https://xelitesolutions.com` و`https://www.xelitesolutions.com` يعمل بسلاسة.

## DNS و SSL
- `api.xelitesolutions.com` مفعّل عبر Cloudflare (علامة السحابة البرتقالية).
- إعداد SSL/TLS على وضع `Full` أو `Full (strict)` حسب شهادة الخادم.

## التخزين المؤقت (Cache)
- أضف قاعدة Cache Rule لتعطيل التخزين المؤقت لمسار `api.xelitesolutions.com/*`.
- أو استخدم Page Rule: `Cache Level: Bypass` لـ `api.xelitesolutions.com/*`.

## الجدار الناري (WAF)
- أضف قاعدة سماح Allow لطلبات `OPTIONS` نحو `api.xelitesolutions.com/api/v1/*`.
- تأكد من عدم وجود Rule يمنع أو يعيد كتابة طلبات `OPTIONS`.

## Workers (الموصى به)
- اربط العامل `infra/cloudflare/cors-worker.js` على المسار: `api.xelitesolutions.com/*`.
- تحقّق أن العامل يعيد `200 OK` لطلبات `OPTIONS` ويحقن رؤوس CORS الصحيحة.

## Transform Rules (بديل للعامل)
- إذا لم تستخدم Worker، يمكنك إضافة قواعد `Modify Response Header`:
  - `Access-Control-Allow-Origin` = `https://xelitesolutions.com` و `https://www.xelitesolutions.com` (أو استخدم العامل لعكس الـ Origin ديناميكياً)
  - `Access-Control-Allow-Credentials` = `true`
  - `Access-Control-Allow-Methods` = `GET,POST,PUT,DELETE,PATCH,OPTIONS`
  - `Access-Control-Allow-Headers` = `Content-Type, Authorization, X-Requested-With, Accept, Origin`
  - `Access-Control-Expose-Headers` = `X-New-Token, x-new-token`
  - `Access-Control-Max-Age` = `86400`
  - `Vary` = `Origin, Access-Control-Request-Headers, Access-Control-Request-Method`

## التحقق السريع
- من أي مكان، نفّذ:
```
curl -i -X OPTIONS 'https://api.xelitesolutions.com/api/v1/auth/login' \
  -H 'Origin: https://www.xelitesolutions.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```
- النجاح يعني: `HTTP/2 200` مع الرؤوس المذكورة أعلاه.
- إذا حصلت على `405` من Cloudflare، فعّل العامل أو أضف قاعدة WAF للسماح بـ `OPTIONS`.


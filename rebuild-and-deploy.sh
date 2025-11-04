#!/bin/bash

# سكريبت لإعادة بناء ونشر الواجهة الأمامية
# الاستخدام: ./rebuild-and-deploy.sh

set -e

echo "🚀 بدء عملية إعادة البناء والنشر..."
echo ""

# الانتقال إلى مجلد dashboard-x
cd dashboard-x

echo "📦 تثبيت التبعيات..."
pnpm install

echo ""
echo "🔨 بناء المشروع..."
pnpm build

echo ""
echo "✅ تم البناء بنجاح!"
echo ""
echo "📁 ملفات Build موجودة في: dashboard-x/dist/"
echo ""
echo "📋 الخطوات التالية:"
echo "1. انشر محتويات مجلد dist/ إلى الخادم"
echo "2. امسح الـ cache من Cloudflare أو CDN"
echo "3. اختبر الموقع في وضع Incognito"
echo ""
echo "💡 للنشر على Cloudflare Pages:"
echo "   npx wrangler pages deploy dist --project-name=xelitesolutions"
echo ""

#!/bin/bash
# ============================================================
# TripYou_ChatHUB — سكريبت النشر على السيرفر
# الهدف: تحديث الحاوية بآخر كود من GitHub
# انسخ هذه الأوامر في Hostinger hPanel → VPS 1507912 → Terminal
# ============================================================

echo "========================================="
echo "🚀 TripYou_ChatHUB — Server Deploy Script"
echo "========================================="

# الانتقال لمجلد المشروع
cd /opt/tripyou-chathub

echo ""
echo "📥 جلب آخر كود من GitHub..."
git pull origin main

echo ""
echo "🔨 بناء صورة Docker الجديدة..."
docker-compose -f docker-compose.hub.yml build --no-cache

echo ""
echo "🔄 إعادة تشغيل الحاوية..."
docker-compose -f docker-compose.hub.yml up -d

echo ""
echo "⏳ انتظار 5 ثوانٍ لبدء التشغيل..."
sleep 5

echo ""
echo "📊 آخر سطور من سجل الحاوية:"
docker logs tripyou-chathub-web --tail=30

echo ""
echo "✅ اكتملت عملية النشر!"
echo "🌐 تحقق من: https://hub.69.62.122.89.sslip.io"

# 🚨 تعليمة صارمة ودائمة: إدارة Hostinger VPS والنشر التلقائي (DO NOT VIOLATE)

1. **إضافة Hostinger MCP مفعلة وجاهزة لديك بالكامل:**
   - السيرفرات المتاحة: `hostinger-vps` (execute, search, multi-execute), `hostinger-hosting`, `hostinger-billing`, `hostinger-dns`.
   - معرف السيرفر (Virtual Machine ID): `1507912`
   - عنوان السيرفر (IP): `69.62.122.89`

2. **اتصال SSH المباشر المصرح والمفعل:**
   - المفتاح الخاص: `~/.ssh/hostinger_deploy`
   - المفتاح العام المعتمد على السيرفر: `antigravity-deploy`
   - أمر الاتصال المباشر التلقائي:
     `ssh -i "$HOME\.ssh\hostinger_deploy" -o StrictHostKeyChecking=no root@69.62.122.89 "<COMMAND>"`

3. **القاعدة الذهبية الصارمة:**
   - **يُمنع منعاً باتاً** أن تطلب من المهندس أيمن مريعي فتح hPanel Terminal أو كتابة أي أوامر يدوية للنشر، أو إدارة Docker، أو إيقاف الحاويات.
   - أنت المسؤول المباشر عن تنفيذ الـ Pull، والبناء (`docker compose build`), وإعادة التشغيل (`docker compose up -d`), ومراقبة الذاكرة وإيقاف الخدمات الزائدة مثل Chatwoot.
   - تعامل مع السيرفر بنفسك دائماً وفوراً.


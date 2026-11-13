-- 0013: تنظيف أسماء الأدوار من اللواحق الإنجليزية + تحديث حالة الخطوط من Evolution
-- الأدوار تعرض بالعربية الخالصة في كل الواجهات (قرار المالك)

update hub.roles set title_ar = 'مدير النظام الأعلى' where key = 'super_admin' and title_ar like '%Super Admin%';
update hub.roles set title_ar = 'مدير المبيعات'      where key = 'sales_lead'   and title_ar like '%Sales Lead%';
update hub.roles set title_ar = 'موظف دعم'           where key = 'support_agent';
update hub.roles set title_ar = 'موظف مبيعات'        where key = 'sales_agent';
update hub.roles set title_ar = 'مشغل الرقم الرئيسي'  where key = 'main_operator';
update hub.roles set title_ar = 'موظف ترويج'         where key = 'promo_agent';
update hub.roles set title_ar = 'مشاهد'              where key = 'viewer';
update hub.roles set title_ar = 'مدير قسم'           where key = 'dept_manager';
update hub.roles set title_ar = 'مالية'              where key = 'finance';

-- خطوط القاعدة تعكس الواقع: كل خط مفتوح في Evolution = connected
update hub.lines set status = 'connected'
where instance_name in ('Master', 'Sells_1', 'Sells_2');

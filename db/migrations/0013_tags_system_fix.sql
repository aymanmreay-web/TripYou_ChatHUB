-- ============================================================
-- Migration 0013: إصلاح نظام الوسوم بالكامل
-- يصلح hub_tags، ينشئ contact_tags، يصلح status_definitions
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. إصلاح جدول hub_tags — إضافة الأعمدة الناقصة مع حفظ البيانات القديمة
-- ─────────────────────────────────────────────────────────────

-- إضافة عمود key (مفتاح نصي فريد)
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS key text;

-- إضافة عمود name_ar (الاسم العربي)
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS name_ar text;

-- إضافة عمود color (اللون بصيغة HEX)
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS color text;

-- إضافة عمود kind (النوع: custom | whatsapp)
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS kind text DEFAULT 'custom';

-- إضافة عمود sort_order (ترتيب العرض)
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- إضافة عمود scope (نطاق التطبيق: contact | conversation | both)
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'both';

-- إضافة created_at إن لم يكن موجوداً
ALTER TABLE public.hub_tags
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────
-- 2. ترحيل البيانات القديمة إلى الحقول الجديدة
-- ─────────────────────────────────────────────────────────────

-- نقل name القديم → name_ar إن كان name_ar فارغاً
UPDATE public.hub_tags
SET name_ar = name
WHERE name_ar IS NULL AND name IS NOT NULL;

-- نقل hex_color القديم → color إن كان color فارغاً
UPDATE public.hub_tags
SET color = COALESCE(hex_color, '#8b5cf6')
WHERE color IS NULL;

-- ضبط اللون الافتراضي لأي سطر بدون لون
UPDATE public.hub_tags
SET color = '#8b5cf6'
WHERE color IS NULL;

-- ضبط name_ar افتراضي إن بقي فارغاً
UPDATE public.hub_tags
SET name_ar = COALESCE(name, 'وسم بدون اسم')
WHERE name_ar IS NULL;

-- توليد key فريد لكل سطر لا يملك مفتاحاً
UPDATE public.hub_tags
SET key = 'tag_' || replace(id::text, '-', '')
WHERE key IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. إضافة القيود (Constraints) على الأعمدة الجديدة
-- ─────────────────────────────────────────────────────────────

-- key يجب أن يكون فريداً وغير فارغ
ALTER TABLE public.hub_tags
  ALTER COLUMN key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hub_tags_key_unique' AND conrelid = 'public.hub_tags'::regclass
  ) THEN
    ALTER TABLE public.hub_tags ADD CONSTRAINT hub_tags_key_unique UNIQUE (key);
  END IF;
END $$;

-- name_ar يجب أن يكون غير فارغ
ALTER TABLE public.hub_tags
  ALTER COLUMN name_ar SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. إنشاء جدول conversation_tags إن لم يكن موجوداً
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_tags (
  conversation_id uuid NOT NULL,
  tag_id          uuid NOT NULL REFERENCES public.hub_tags(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id
  ON public.conversation_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_conv_id
  ON public.conversation_tags(conversation_id);

-- ─────────────────────────────────────────────────────────────
-- 5. إنشاء جدول contact_tags إن لم يكن موجوداً
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contact_tags (
  contact_id uuid NOT NULL,
  tag_id     uuid NOT NULL REFERENCES public.hub_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id
  ON public.contact_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id
  ON public.contact_tags(contact_id);

-- ─────────────────────────────────────────────────────────────
-- 6. إصلاح جدول status_definitions — إضافة الأعمدة الناقصة
-- ─────────────────────────────────────────────────────────────

-- إنشاء الجدول إن لم يكن موجوداً أصلاً
CREATE TABLE IF NOT EXISTS public.status_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  title_ar    text NOT NULL,
  description text,
  color       text DEFAULT '#64748b',
  sla_minutes integer,
  sort_order  integer DEFAULT 0,
  is_system   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- إضافة الأعمدة إن لم تكن موجودة (على جدول قائم)
ALTER TABLE public.status_definitions
  ADD COLUMN IF NOT EXISTS code        text;

ALTER TABLE public.status_definitions
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.status_definitions
  ADD COLUMN IF NOT EXISTS color       text DEFAULT '#64748b';

ALTER TABLE public.status_definitions
  ADD COLUMN IF NOT EXISTS sla_minutes integer;

ALTER TABLE public.status_definitions
  ADD COLUMN IF NOT EXISTS sort_order  integer DEFAULT 0;

ALTER TABLE public.status_definitions
  ADD COLUMN IF NOT EXISTS is_system   boolean DEFAULT false;

-- ضبط قيم افتراضية للسجلات القديمة
UPDATE public.status_definitions SET color      = '#64748b'  WHERE color IS NULL;
UPDATE public.status_definitions SET sort_order = 0          WHERE sort_order IS NULL;
UPDATE public.status_definitions SET is_system  = false      WHERE is_system IS NULL;

-- إضافة UNIQUE على code إن لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'status_definitions_code_unique' AND conrelid = 'public.status_definitions'::regclass
  ) THEN
    -- تأكد أن code ليس NULL قبل إضافة القيد
    UPDATE public.status_definitions SET code = 'STATUS_' || id::text WHERE code IS NULL;
    ALTER TABLE public.status_definitions ADD CONSTRAINT status_definitions_code_unique UNIQUE (code);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. بيانات seed للحالات الافتراضية (تُدرج فقط إن لم تكن موجودة)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.status_definitions (code, title_ar, description, color, sla_minutes, sort_order, is_system)
VALUES
  ('OPEN',        'مفتوحة',       'محادثة جديدة أو لم تُعالج بعد',         '#22c55e',  15,  1, true),
  ('IN_PROGRESS', 'قيد المعالجة', 'الموظف يتابع هذه المحادثة حالياً',       '#3b82f6',  60,  2, true),
  ('PENDING',     'معلّقة',        'تنتظر رد العميل أو إجراءً خارجياً',      '#eab308', 120,  3, true),
  ('RESOLVED',    'تم الحل',       'تمت معالجة الطلب وإغلاق المحادثة',      '#8b5cf6',   0,  4, true),
  ('CLOSED',      'مغلقة',         'أُغلقت نهائياً بعد التحقق من الحل',      '#64748b',   0,  5, true)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 8. ضمان وجود Views في schema hub.* (إن كان schema hub موجوداً)
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- فقط إن كان schema hub موجوداً
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'hub') THEN

    -- View: hub.hub_tags
    EXECUTE $v$
      CREATE OR REPLACE VIEW hub.hub_tags AS
        SELECT * FROM public.hub_tags
    $v$;

    -- View: hub.conversation_tags
    EXECUTE $v$
      CREATE OR REPLACE VIEW hub.conversation_tags AS
        SELECT * FROM public.conversation_tags
    $v$;

    -- View: hub.contact_tags
    EXECUTE $v$
      CREATE OR REPLACE VIEW hub.contact_tags AS
        SELECT * FROM public.contact_tags
    $v$;

    -- View: hub.status_definitions
    EXECUTE $v$
      CREATE OR REPLACE VIEW hub.status_definitions AS
        SELECT * FROM public.status_definitions
    $v$;

  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 9. بيانات seed للوسوم الافتراضية (تُدرج فقط إن لم تكن موجودة)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.hub_tags (key, name_ar, color, kind, sort_order, scope)
VALUES
  ('vip',       'عميل مميز VIP',    '#f59e0b', 'custom', 1, 'both'),
  ('follow_up', 'متابعة مطلوبة',    '#3b82f6', 'custom', 2, 'conversation'),
  ('complaint', 'شكوى',             '#ef4444', 'custom', 3, 'conversation'),
  ('new_lead',  'عميل محتمل جديد', '#22c55e', 'custom', 4, 'contact'),
  ('booking',   'حجز مؤكد',         '#8b5cf6', 'custom', 5, 'conversation'),
  ('urgent',    'عاجل',             '#f97316', 'custom', 6, 'both')
ON CONFLICT (key) DO NOTHING;

-- انتهى migration 0013

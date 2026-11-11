/**
 * محرك المظهر المعتمد من نظام v1 (TripYou ChatHUB)
 * الإعدادات تُحفظ محلياً وتُطبَّق حياً على <html> كمتغيرات وسمات.
 * كل ما يُطبَّق هنا يعتمد متغيرات موجودة أصلاً في globals.css — لا قيم مكررة.
 */

export interface AppearanceConfig {
  speed: 'normal' | 'slow';            // سرعة الحركات المحيطة (الشريط، الهالات)
  bg: 'aurora' | 'dots' | 'flat';      // خلفية المنصة
  contrast: boolean;                   // تباين أعلى للنص الثانوي
  fontUI: string;                      // خط النص (قيمة CSS كاملة)
  fontHead: string;                    // خط العناوين والأرقام
  size: number;                        // حجم الخط الأساسي 13-19 (يتدرج معه كل شيء rem)
  radius: number;                      // استدارة الزوايا 10-34
  glass: number;                       // شدة الزجاج 0-100
  density: 'comfortable' | 'compact';  // كثافة العرض
  motion: 'full' | 'subtle' | 'off';   // مستوى الحركة
  bubble: 'tail' | 'round' | 'soft';   // شكل فقاعات المحادثة
  avatar: 'ring' | 'solid' | 'name';   // صور المستخدمين
  nav: 'full' | 'rail';                // القائمة الجانبية
  primaryCustom: string | null;        // لون رئيسي مخصص (#rrggbb) أو null لاعتماد الثيم
  staffCan: {                          // ما يستطيع الموظف تغييره من ملفه
    mode: boolean;
    preset: boolean;
    size: boolean;
    density: boolean;
    motion: boolean;
    bubble: boolean;
  };
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  speed: 'normal',
  bg: 'aurora',
  contrast: false,
  fontUI: "'IBM Plex Sans Arabic', 'Readex Pro Variable', system-ui, sans-serif",
  fontHead: "'Readex Pro Variable', 'IBM Plex Sans Arabic', system-ui, sans-serif",
  size: 15,
  radius: 22,
  glass: 60,
  density: 'comfortable',
  motion: 'full',
  bubble: 'tail',
  avatar: 'ring',
  nav: 'full',
  primaryCustom: null,
  staffCan: { mode: true, preset: true, size: true, density: true, motion: true, bubble: false },
};

const STORAGE_KEY = 'tripyou_appearance';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** قراءة الإعدادات المحفوظة مع دمج آمن مع الافتراضي وتجاوز القيم الفاسدة. */
export function loadAppearance(): AppearanceConfig {
  const base: AppearanceConfig = { ...DEFAULT_APPEARANCE, staffCan: { ...DEFAULT_APPEARANCE.staffCan } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      (Object.keys(base) as (keyof AppearanceConfig)[]).forEach((k) => {
        if (k === 'staffCan') {
          if (saved.staffCan && typeof saved.staffCan === 'object') {
            (Object.keys(base.staffCan) as (keyof AppearanceConfig['staffCan'])[]).forEach((sk) => {
              if (typeof saved.staffCan[sk] === 'boolean') base.staffCan[sk] = saved.staffCan[sk];
            });
          }
          return;
        }
        if (saved[k] !== undefined && saved[k] !== null && typeof saved[k] === typeof base[k]) {
          (base as Record<string, unknown>)[k] = saved[k];
        }
      });
      if (base.primaryCustom !== null && !HEX_RE.test(base.primaryCustom)) base.primaryCustom = null;
    }
  } catch {
    // تجاهل — نعيد الافتراضي
  }
  return base;
}

/** حفظ الإعدادات محلياً. */
export function saveAppearance(cfg: AppearanceConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // تجاهل
  }
}

/**
 * تطبيق الإعدادات حياً على <html>: حجم الخط (rem يتدرج معه كل شيء)، الاستدارة، الزجاج،
 * الخطوط، اللون المخصص، ومفاتيح الحركة والخلفية والفقاعات والكثافة والتباين.
 */
export function applyAppearance(cfg: AppearanceConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const s = root.style;

  s.setProperty('font-size', `${cfg.size}px`);
  s.setProperty('--radius-ui', `${cfg.radius}px`);
  s.setProperty('--glass-blur', `${Math.round(cfg.glass * 0.55)}px`);
  s.setProperty('--font-ui', cfg.fontUI);
  s.setProperty('--font-head', cfg.fontHead);
  s.setProperty('--r', `${cfg.radius}px`);
  s.setProperty('--blur', `${Math.round(cfg.glass * 0.55)}px`);
  s.setProperty('--spd', cfg.speed === 'slow' ? '16s' : '9s');
  s.setProperty('--d', cfg.density === 'compact' ? '0.82' : '1');

  if (cfg.motion === 'full') {
    s.setProperty('--amb', 'running');
  } else {
    s.setProperty('--amb', 'paused');
  }

  if (cfg.primaryCustom && HEX_RE.test(cfg.primaryCustom)) {
    s.setProperty('--primary', cfg.primaryCustom);
    s.setProperty('--accent', cfg.primaryCustom);
    s.setProperty('--primary-glow', `color-mix(in srgb, ${cfg.primaryCustom} 20%, transparent)`);
    s.setProperty('--accent-soft', `color-mix(in srgb, ${cfg.primaryCustom} 12%, transparent)`);
  } else {
    s.removeProperty('--primary');
    s.removeProperty('--accent');
    s.removeProperty('--primary-glow');
    s.removeProperty('--accent-soft');
  }

  root.dataset.motion = cfg.motion;
  root.dataset.bg = cfg.bg;
  root.dataset.bubble = cfg.bubble;
  root.dataset.avatar = cfg.avatar;
  root.dataset.nav = cfg.nav;
  root.dataset.density = cfg.density;
  root.dataset.contrast = cfg.contrast ? '1' : '0';
}

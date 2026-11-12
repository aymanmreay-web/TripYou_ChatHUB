'use client';

/**
 * نافذة الصندوق الموحدة — تحل محل الأغلفة اليدوية التسعة المتضاربة.
 * تمنح كل النوافذ: سلم طبقات ثابت (40 درج / 60 نافذة / 80 عارض)،
 * إغلاقاً بمفتاح Esc فعلياً، إغلاقاً بالنقر على الخلفية، وقفل تمرير الصفحة أثناء الفتح.
 * الهوية الداخلية (حدود، عنوان، أزرار) تبقى ملك كل نافذة عبر panelClassName والمحتوى.
 */
import React, { useEffect } from 'react';

export type ModalLevel = 'drawer' | 'modal' | 'lightbox';

const LEVEL_Z: Record<ModalLevel, string> = {
  drawer: 'z-40',
  modal: 'z-[60]',
  lightbox: 'z-[80]',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** داخل بطاقة الصندوق (absolute) بدل تغطية الشاشة كلها (fixed) — لنوافذ الصندوق */
  contained?: boolean;
  level?: ModalLevel;
  /** هوية لوح النافذة: الحدود والعرض والحشوة والاتجاه */
  panelClassName?: string;
  ariaLabel?: string;
}

export function Modal({ open, onClose, children, contained = false, level = 'modal', panelClassName = '', ariaLabel }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className={`${contained ? 'absolute' : 'fixed'} inset-0 ${LEVEL_Z[level]} bg-black/80 backdrop-blur-sm flex items-center justify-center p-4`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-[var(--card-bg)] w-full shadow-2xl flex flex-col max-h-[88vh] overflow-y-auto ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

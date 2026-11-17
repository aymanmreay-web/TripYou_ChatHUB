'use client';

/**
 * حقل كتابة الرسالة — معزول عن المكوّن الأب.
 * النص يُحفظ محلياً داخل هذا المكوّن، فلا يُعاد رسم قائمة الرسائل (الثقيلة) عند كل ضغطة مفتاح.
 * الأب يقرأ النص عبر المقبض (getValue) أو المرجع، ويُبلَّغ فقط عند تغيّر «هل يوجد نص؟».
 */
import React, { forwardRef, memo, useCallback, useImperativeHandle, useState } from 'react';

export interface ComposerInputHandle {
  getValue: () => string;
  setValue: (v: string) => void;
}

interface ComposerInputProps {
  /** يُستدعى مع كل تغيير للنص (لتحديث مرجع في الأب بلا إعادة رسم) */
  onTextChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ComposerInput = memo(
  forwardRef<ComposerInputHandle, ComposerInputProps>(function ComposerInput(
    { onTextChange, onKeyDown, placeholder, disabled, className },
    ref
  ) {
    const [value, setValueState] = useState('');

    const apply = useCallback(
      (v: string) => {
        setValueState(v);
        onTextChange(v);
      },
      [onTextChange]
    );

    useImperativeHandle(ref, () => ({ getValue: () => value, setValue: apply }), [value, apply]);

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => apply(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    );
  })
);

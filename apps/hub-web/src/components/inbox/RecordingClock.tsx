'use client';

/** عدّاد مدة التسجيل الصوتي — يعدّ داخلياً فلا يُعاد رسم المكوّن الأب كل ثانية. يُركَّب فقط أثناء التسجيل. */
import React, { useEffect, useState } from 'react';

export function RecordingClock({ className = '' }: { className?: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={className}>
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
    </span>
  );
}

/**
 * منطق الوقت النقي للصندوق — مستخلص من NativeChatInbox ضمن خطة التوحيد.
 * ساعات الهدوء: من 01:00 إلى 07:00 بتوقيت مكة المكرمة (UTC+3) — قاعدة حارس المخاطر.
 */

/** الساعة الحالية بتوقيت مكة المكرمة (0-23) */
export function getKsaHour(now: Date = new Date()): number {
  return (now.getUTCHours() + 3) % 24;
}

/** هل نحن داخل ساعات الهدوء (01:00–07:00 بتوقيت مكة)؟ الإرسال فيها يرفع خطر حظر الرقم. */
export function isQuietHoursNow(now: Date = new Date()): boolean {
  const h = getKsaHour(now);
  return h >= 1 && h < 7;
}

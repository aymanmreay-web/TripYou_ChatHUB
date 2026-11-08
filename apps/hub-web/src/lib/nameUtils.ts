/** أدوات الأسماء العربية للأفاتار. */
const LAT_PREFIX = /^م\.\s*/; // «م.» اختصار مهندس

export function nameWords(name: string): string[] {
  return name.replace(LAT_PREFIX, '').trim().split(/\s+/).filter(Boolean);
}

/** أول حرف من الكلمة مع تجاهل «ال» التعريف: «الغامدي» تعطي «غ». */
function firstLetter(word: string): string {
  const w = word.replace(/^ال(?=.{2})/, '');
  return Array.from(w)[0] ?? '';
}

/** حرفان أولان من أول كلمتين، يفصل بينهما ZWNJ حتى لا يلتصق الحرفان. */
export function initials(name: string): string {
  const [a, b] = nameWords(name);
  if (!a) return '؟';
  return firstLetter(a) + (b ? '‌' + firstLetter(b) : '');
}

/** أول كلمتين من الاسم، تظهر في كبسولة الاسم. */
export function shortName(name: string): string {
  return nameWords(name).slice(0, 2).join(' ');
}

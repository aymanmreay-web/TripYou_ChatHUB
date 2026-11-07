/** قائمة الخطوط المتاحة لصفحة «المظهر والتخصيص». كلها مرخّصة SIL OFL ومستضافة محلياً. */
export interface FontOption {
  id: string;
  label: string;
  family: string; // قيمة CSS للمتغيرات --font-ui / --font-head
  note: string;
}

const tail = "system-ui, sans-serif";

export const FONT_OPTIONS: FontOption[] = [
  { id: 'readex', label: 'Readex Pro', family: `'Readex Pro Variable', ${tail}`, note: 'حديث ومريح للعين (افتراضي الثيم الجديد)' },
  { id: 'plex', label: 'IBM Plex Sans Arabic', family: `'IBM Plex Sans Arabic', ${tail}`, note: 'متوازن وواضح للشاشات' },
  { id: 'alexandria', label: 'Alexandria', family: `'Alexandria Variable', ${tail}`, note: 'هندسي عصري (الخط الحالي)' },
  { id: 'cairo', label: 'Cairo', family: `'Cairo Variable', ${tail}`, note: 'مألوف ومقروء' },
  { id: 'tajawal', label: 'Tajawal', family: `'Tajawal', ${tail}`, note: 'خفيف وأنيق' },
  { id: 'almarai', label: 'Almarai', family: `'Almarai', ${tail}`, note: 'إخباري واضح' },
  { id: 'noto-sans', label: 'Noto Sans Arabic', family: `'Noto Sans Arabic Variable', ${tail}`, note: 'أوسع دعم للغات' },
  { id: 'noto-kufi', label: 'Noto Kufi Arabic', family: `'Noto Kufi Arabic Variable', ${tail}`, note: 'كوفي معاصر' },
  { id: 'rubik', label: 'Rubik', family: `'Rubik Variable', ${tail}`, note: 'مستدير ودافئ' },
  { id: 'zain', label: 'Zain', family: `'Zain', ${tail}`, note: 'عصري بشخصية' },
  { id: 'el-messiri', label: 'El Messiri', family: `'El Messiri Variable', ${tail}`, note: 'للعناوين الفاخرة' },
  { id: 'reem-kufi', label: 'Reem Kufi', family: `'Reem Kufi Variable', ${tail}`, note: 'كوفي للعناوين' },
  { id: 'changa', label: 'Changa', family: `'Changa Variable', ${tail}`, note: 'قوي للعناوين' },
];

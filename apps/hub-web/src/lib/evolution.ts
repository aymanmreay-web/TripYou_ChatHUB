/**
 * طبقة Evolution API الموحدة — تُستخدم بكل مسارات المجموعات الجديدة.
 * المفاتيح من env فقط (لا مفاتيح مكشوفة في الكود)، مهلة موحدة، وشكل خطأ موحد.
 * المسارات القديمة (بروكسيات /api/evolution) لا تستخدمها بعد — خارج نطاق الموجة.
 */

const EVOLUTION_URL = (process.env.EVOLUTION_URL || '').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export class EvolutionError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status = 500, detail?: string) {
    super(message);
    this.name = 'EvolutionError';
    this.status = status;
    this.detail = detail;
  }
}

export interface EvoCall {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

export async function evoFetch<T = any>(path: string, call: EvoCall = {}): Promise<T> {
  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    throw new EvolutionError('Evolution API غير مُهيأ — تحقق من EVOLUTION_URL و EVOLUTION_API_KEY', 500);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), call.timeoutMs ?? 25000);
  try {
    const res = await fetch(`${EVOLUTION_URL}${path}`, {
      method: call.method || 'GET',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      ...(call.body !== undefined ? { body: JSON.stringify(call.body) } : {}),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const raw =
        data && typeof data === 'object'
          ? (data.message || data.error || data.response?.message || data.response?.error)
          : data;
      const msg = typeof raw === 'string' && raw.trim() ? raw : `Evolution API error: ${res.status}`;
      const detail =
        typeof data === 'object' ? JSON.stringify(data).slice(0, 800) : String(data ?? '').slice(0, 800);
      throw new EvolutionError(msg, res.status, detail);
    }
    return (data ?? null) as T;
  } catch (err: any) {
    if (err instanceof EvolutionError) throw err;
    if (err?.name === 'AbortError') {
      throw new EvolutionError('انتهت مهلة الاتصال بخادم Evolution', 504);
    }
    throw new EvolutionError(err?.message || 'فشل الاتصال بخادم Evolution', 502);
  }
}

/** أرقام فقط — أساس مطابقة خطوطنا بالمشاركين (آمن ضد معرفات @lid) */
export const digitsOnly = (v?: string | null): string => (v || '').replace(/[^0-9]/g, '');

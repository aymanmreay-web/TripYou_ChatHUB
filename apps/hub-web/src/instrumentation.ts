/**
 * Next.js instrumentation — يعمل مرة واحدة مع إقلاع السيرفر (Node runtime).
 * يشغّل محرك الحملات الدوري على الـ VPS.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { startCampaignRunner } = await import('./lib/campaignRunner');
    startCampaignRunner();
  } catch (err) {
    console.warn('[instrumentation] campaign runner failed to start:', (err as Error).message);
  }
}

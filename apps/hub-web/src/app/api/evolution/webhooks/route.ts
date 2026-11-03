import { NextResponse } from 'next/server';

// In-memory store for incoming webhook events (replace with DB later)
const webhookEvents: any[] = [];

export async function POST(req: Request) {
  try {
    const event = await req.json();
    // Add timestamp
    const timestampedEvent = { ...event, receivedAt: new Date().toISOString() };
    webhookEvents.push(timestampedEvent);
    // Keep last 500 events only
    if (webhookEvents.length > 500) {
      webhookEvents.splice(0, webhookEvents.length - 500);
    }
    console.log('[Webhook]', event.event, event.instance, new Date().toISOString());
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ events: webhookEvents.slice(-50) });
}

import { NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

export async function GET(req: Request, { params }: { params: { name: string } }) {
  const { searchParams } = new URL(req.url);
  const getParticipants = searchParams.get('participants') === 'true';
  
  try {
    const { name } = params;
    const url = `${EVOLUTION_URL}/group/fetchAllGroups/${name}?getParticipants=${getParticipants}`;
    const res = await fetch(url, {
      headers: { 'apikey': EVOLUTION_API_KEY },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Evolution API error: ${res.status}`, detail: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

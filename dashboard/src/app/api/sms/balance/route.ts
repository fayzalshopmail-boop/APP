import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required to fetch balance." }, { status: 400 });
    }

    const url = `http://bulksmsbd.net/api/getBalanceApi?api_key=${apiKey}`;
    
    const response = await fetch(url);
    const result = await response.text();
    
    return NextResponse.json({ success: true, balance: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

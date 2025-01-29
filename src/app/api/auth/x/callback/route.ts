import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

// Initialize Redis
const redis = Redis.fromEnv();

// Cookieから session_id を取り出す関数
function parseSessionId(cookieHeader: string) {
  const match = cookieHeader.match(/session_id=([^;]+)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const sessionId = request.cookies.get('session_id')?.value;

  if (!sessionId) {
    return new NextResponse('No session_id cookie found', { status: 400 });
  }

  // 1. Redisから pkce:${sessionId} を取得
  const pkceData: string | null = await redis.get(`pkce:${sessionId}`);
  if (!pkceData) {
    return new NextResponse('PKCE data not found or expired', { status: 400 });
  }

  const { code_verifier, state: storedState } = JSON.parse(pkceData);

  // stateチェック
  if (state !== storedState) {
    return new NextResponse('State mismatch', { status: 400 });
  }

  // 2. アクセストークン取得
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.X_CLIENT_ID || '',
    client_secret: process.env.X_CLIENT_SECRET || '',
    code: code as string,
    redirect_uri: `${process.env.API_URL}/api/auth/x/callback`,
    code_verifier,
  });

  try {
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await resp.json();
    if (data.error) {
      return NextResponse.json(data, { status: 400 });
    }

    const accessToken = data.access_token;
    // 例: Redisに保存 (60分有効など)
    await redis.set(`x_token:${sessionId}`, accessToken, { ex: 3600 });

    // PKCE用データを削除
    await redis.del(`pkce:${sessionId}`);

    // 3. リダイレクト
    return NextResponse.redirect('/?login=success');
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionId = parseSessionId(cookieHeader);

  if (!sessionId) {
    return NextResponse.json({ isAuthenticated: false });
  }

  const userAccessToken = await redis.get(`x_token:${sessionId}`);

  if (userAccessToken) {
    return NextResponse.json({ isAuthenticated: true });
  } else {
    return NextResponse.json({ isAuthenticated: false });
  }
}

// Cookieから session_id を取り出す関数
function parseSessionId(cookieHeader: string) {
  const match = cookieHeader.match(/session_id=([^;]+)/);
  return match ? match[1] : null;
} 
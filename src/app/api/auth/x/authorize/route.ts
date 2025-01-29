import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

// Initialize Redis
const redis = Redis.fromEnv();

// ランダムな sessionId を作り、Cookieに入れる。
// PKCEの code_verifier, state は Redis に保存 (TTL付き)
function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}

export async function GET(request: NextRequest) {
  // 1. sessionId を発行
  const sessionId = generateRandomString(16);

  // 2. PKCE情報を作る
  const code_verifier = generateRandomString(64); // RFC7636では43〜128文字
  const state = generateRandomString(16); // CSRF対策用

  // code_challenge計算
  const hash = crypto.createHash('sha256').update(code_verifier).digest('base64');
  const code_challenge = hash.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // 3. Redisに保存 (5分TTLなど) - JSON.stringifyを使わずにオブジェクトをそのまま保存
  await redis.set(`pkce:${sessionId}`, { code_verifier, state }, { ex: 300 });

  // 4. XのOAuth画面にリダイレクトするURLを作成
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID || '',
    redirect_uri: `${process.env.API_URL}/api/auth/x/callback`, // デプロイ後は本番URLに
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge,
    code_challenge_method: 'S256',
  });
  const redirectUrl = `${X_AUTH_URL}?${params.toString()}`;

  // 5. クッキーを設定したレスポンスを作成
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('session_id', sessionId, {
    httpOnly: true,
    path: '/',
    maxAge: 300,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue、開発環境ではfalse
  });

  return response;
} 
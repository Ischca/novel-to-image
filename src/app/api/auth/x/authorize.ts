import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

// Initialize Redis
const redis = Redis.fromEnv();

// ランダムな sessionId を作り、Cookieに入れる。
// PKCEの code_verifier, state は Redis に保存 (TTL付き)
function generateRandomString(length: number) {
    return crypto.randomBytes(length).toString('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. sessionId を発行
    const sessionId = generateRandomString(16);

    // 2. PKCE情報を作る
    const code_verifier = generateRandomString(32);
    const state = generateRandomString(8); // CSRF対策用

    // code_challenge計算
    const hash = crypto.createHash('sha256').update(code_verifier).digest();
    let code_challenge = hash.toString('base64url');
    // base64urlの修正
    code_challenge = code_challenge.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    // 3. Redisに保存 (5分TTLなど)
    await redis.set(
        `pkce:${sessionId}`,
        JSON.stringify({ code_verifier, state }),
        { ex: 300 }
    );

    // 4. Cookieに sessionId をセット (httpOnly, secure)
    res.setHeader('Set-Cookie', [
        `session_id=${sessionId}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax; Secure;`,
    ]);

    // 5. XのOAuth画面にリダイレクト
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.X_CLIENT_ID || '',
        redirect_uri: `${process.env.API_URL}/api/auth/x/callback`, // デプロイ後は本番URLに
        scope: 'tweet.read tweet.write users.read offline.access',
        state: state,
        code_challenge: code_challenge,
        code_challenge_method: 'S256',
    });
    const redirectUrl = `${X_AUTH_URL}?${params.toString()}`;

    return res.redirect(redirectUrl);
}

// pages/api/auth/x/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../lib/redis';

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

// 仮にアクセストークンをRedisに保存する (本番はユーザー毎のIDなど)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code, state } = req.query;
    const sessionId = parseSessionId(req.headers.cookie || '');

    if (!sessionId) {
        return res.status(400).send('No session_id cookie found');
    }

    // 1. Redisから pkce:${sessionId} を取得
    const pkceData = await redis.get(`pkce:${sessionId}`);
    if (!pkceData) {
        return res.status(400).send('PKCE data not found or expired');
    }

    const { code_verifier, state: storedState } = JSON.parse(pkceData);

    // stateチェック
    if (state !== storedState) {
        return res.status(400).send('State mismatch');
    }

    // 2. アクセストークン取得
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.X_CLIENT_ID || '',
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
            return res.status(400).json(data);
        }

        const accessToken = data.access_token;
        // 例: Redisに保存 (60分有効など)
        await redis.set(`x_token:${sessionId}`, accessToken, 'EX', 3600);

        // PKCE用データを削除
        await redis.del(`pkce:${sessionId}`);

        // 3. リダイレクト
        return res.redirect('/?login=success');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to get token' });
    }
}

// Cookieから session_id を取り出す簡易関数
function parseSessionId(cookieHeader: string) {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
}

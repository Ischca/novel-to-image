import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// v1.1 simple upload for example
const UPLOAD_ENDPOINT = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEET_ENDPOINT = 'https://api.twitter.com/1.1/statuses/update.json';

// Initialize Redis
const redis = Redis.fromEnv();

const API_URL = 'https://api.x.com/2/tweets';

// POST メソッドに対応する関数をエクスポート
export async function POST(request: NextRequest) {
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
        return NextResponse.json({ error: 'No session_id found in cookie' }, { status: 401 });
    }

    const accessToken = await redis.get(`x_token:${sessionId}`);

    if (!accessToken) {
        return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    const body = await request.json();
    const tweetText = body.tweetText || '';

    try {
        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: tweetText,
            }),
        });

        const data = await resp.json();

        if (!resp.ok) {
            return NextResponse.json({ error: 'Tweet posting failed', details: data }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: 'Tweet posting failed', details: message }, { status: 500 });
    }
}

// ヘルパー関数
function parseSessionId(cookieHeader: string) {
    const match = cookieHeader.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
}


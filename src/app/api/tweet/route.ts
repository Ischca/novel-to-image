import { Redis } from '@upstash/redis';

// v1.1 simple upload for example
const UPLOAD_ENDPOINT = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEET_ENDPOINT = 'https://api.twitter.com/1.1/statuses/update.json';

// Initialize Redis
const redis = Redis.fromEnv();

// POST メソッドに対応する関数をエクスポート
export async function POST(request: Request) {
    // リクエストボディを取得
    const { imageBase64, tweetText } = await request.json();
    if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'No imageBase64 provided' }), { status: 400 });
    }

    // ヘッダーからクッキーを取得し、session_id をパース
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionId = parseSessionId(cookieHeader);
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'No session_id found in cookie' }), { status: 401 });
    }

    // Redis からアクセストークンを取得
    const userAccessToken = await redis.get(`x_token:${sessionId}`);
    if (!userAccessToken) {
        return new Response(JSON.stringify({ error: 'User not authenticated or token expired' }), { status: 401 });
    }

    try {
        // 1. 画像をアップロード
        const base64Str = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const uploadParams = new URLSearchParams({ media_data: base64Str });

        const uploadResp = await fetch(UPLOAD_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userAccessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: uploadParams.toString(),
        });

        const uploadData = await uploadResp.json();
        if (uploadData.errors) {
            return new Response(JSON.stringify(uploadData.errors), { status: 400 });
        }
        const mediaId = uploadData.media_id_string;
        if (!mediaId) {
            return new Response(JSON.stringify({ error: 'No media_id returned' }), { status: 400 });
        }

        // 2. ツイートを投稿
        const tweetParams = new URLSearchParams({
            status: tweetText || 'My novel promotion!',
            media_ids: mediaId,
        });

        const tweetResp = await fetch(`${TWEET_ENDPOINT}?${tweetParams.toString()}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userAccessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const tweetData = await tweetResp.json();
        if (tweetData.errors) {
            return new Response(JSON.stringify(tweetData.errors), { status: 400 });
        }

        // 成功レスポンスを返す
        return new Response(JSON.stringify({ success: true, tweet: tweetData }), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: 'Tweet posting failed', details: String(error) }),
            { status: 500 }
        );
    }
}

// ヘルパー関数
function parseSessionId(cookieHeader: string) {
    const match = cookieHeader.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
}


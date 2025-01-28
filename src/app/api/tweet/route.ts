import type { NextApiRequest, NextApiResponse } from 'next';
import redis from '../lib/redis';

// v1.1 simple upload for example
const UPLOAD_ENDPOINT = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEET_ENDPOINT = 'https://api.twitter.com/1.1/statuses/update.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { imageBase64, tweetText } = req.body || {};
    if (!imageBase64) {
        return res.status(400).json({ error: 'No imageBase64 provided' });
    }

    // 1. session_id取得
    const sessionId = parseSessionId(req.headers.cookie || '');
    if (!sessionId) {
        return res.status(401).json({ error: 'No session_id found in cookie' });
    }

    // 2. Redisからアクセストークン取得
    const userAccessToken = await redis.get(`x_token:${sessionId}`);
    if (!userAccessToken) {
        return res.status(401).json({ error: 'User not authenticated or token expired' });
    }

    try {
        // 3. Simple upload
        const base64Str = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const uploadParams = new URLSearchParams({ media_data: base64Str });

        const uploadResp = await fetch(UPLOAD_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userAccessToken}`, // v2 token ではたぶんNG -> 1.1 APIはOAuth1.0aが多い
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: uploadParams.toString(),
        });
        const uploadData = await uploadResp.json();
        if (uploadData.errors) {
            return res.status(400).json(uploadData.errors);
        }
        const mediaId = uploadData.media_id_string;
        if (!mediaId) {
            return res.status(400).json({ error: 'No media_id returned' });
        }

        // 4. ツイート
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
            return res.status(400).json(tweetData.errors);
        }

        // success
        return res.status(200).json({ success: true, tweet: tweetData });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Tweet posting failed', details: String(error) });
    }
}

function parseSessionId(cookieHeader: string) {
    const match = cookieHeader.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
}


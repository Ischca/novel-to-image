import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Twitter API v2のエンドポイント
const UPLOAD_ENDPOINT = 'https://api.twitter.com/2/media';
const TWEET_ENDPOINT = 'https://api.twitter.com/2/tweets';

// Redisの初期化
const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'No session_id found in cookie' }, { status: 401 });
  }

  const accessToken = (await redis.get(`x_token:${sessionId}`)) as string;

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token found' }, { status: 401 });
  }

  const body = await request.json();
  const tweetText = body.tweetText || '';
  const imageBase64 = body.imageBase64 || '';

  try {
    // 1. 画像をアップロードして media_id を取得
    let mediaId = null;

    if (imageBase64) {
      const uploadResult = await uploadMedia(accessToken, imageBase64);
      if (uploadResult.errors) {
        return NextResponse.json({ error: 'Media upload failed', details: uploadResult.errors }, { status: 500 });
      }
      mediaId = uploadResult.data.media_key;
    }

    // 2. ツイートを投稿
    const tweetParams = {
        text: tweetText,
        media: mediaId ? { media_ids: [mediaId] } : undefined,
    };

    const resp = await fetch(TWEET_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetParams),
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

// 画像をTwitterにアップロードする関数
async function uploadMedia(accessToken: string, imageBase64: string) {
  // 画像データ部分のみを取得
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // バイナリデータに変換
  const binaryData = Buffer.from(base64Data, 'base64');

  // BufferをArrayBufferに変換
  const arrayBuffer = binaryData.buffer.slice(binaryData.byteOffset, binaryData.byteOffset + binaryData.byteLength);

  // Blobを作成
  const blob = new Blob([arrayBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', blob, 'image.png');

  const resp = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      // 'Content-Type'は自動的に設定されます
    },
    body: formData,
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(`Media upload failed: ${JSON.stringify(data)}`);
  }

  return data;
}

// ヘルパー関数
function parseSessionId(cookieHeader: string) {
    const match = cookieHeader.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
}


// pages/api/lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
    // tls: { rejectUnauthorized: false }, // 必要に応じて
});

export default redis;

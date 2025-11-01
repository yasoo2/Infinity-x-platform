import Redis from 'ioredis';

const redis = new Redis('redis://default:AXVaAAIncDI3MmU0NzVmY2FhNzg0YmY4Yjg0OTFkMGViMTA5NGZiYnAyMzAwNDI@loving-koala-30042.upstash.io:6379', {
  tls: {}
});

redis.on('connect', () => {
  console.log('✅ Redis connected!');
});

redis.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

setTimeout(async () => {
  try {
    await redis.set('test', 'Hello InfinityX!');
    const val = await redis.get('test');
    console.log('✅ Value:', val);
    await redis.del('test');
    console.log('✅ Redis works!');
    redis.disconnect();
  } catch (e) {
    console.error('❌ Failed:', e.message);
  }
}, 2000);

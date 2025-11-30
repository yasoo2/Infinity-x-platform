import WebSocket from 'ws';
import axios from 'axios';

async function getGuestToken() {
  const { data } = await axios.post('http://localhost:4000/api/v1/auth/guest-token');
  if (!data?.token) throw new Error('Failed to get guest token');
  return data.token;
}

async function main() {
  let token;
  try {
    token = await getGuestToken();
  } catch (e) {
    console.error('Failed to get token:', e?.message || e);
    throw e;
  }
  const url = `ws://localhost:4000/ws/joe-agent?token=${token}`;
  const ws = new WebSocket(url, { perMessageDeflate: false });

  let finalText = '';
  let done = false;

  const finish = (code = 0) => {
    try { ws.close(); } catch { /* noop */ }
    if (finalText) console.log('\n--- Final Response ---\n' + finalText);
    process.exit(code);
  };

  ws.on('open', () => {
    const message = 'اختبر قدراتك: قدّم إجابة مختصرة عن النظام.';
    ws.send(JSON.stringify({ action: 'instruct', message }));
  });

  ws.on('message', (buf) => {
    try {
      const data = JSON.parse(buf.toString('utf8'));
      if (data.type === 'status') {
        console.log('[WS status]', data.message);
      } else if (data.type === 'stream') {
        process.stdout.write(data.content);
        finalText += String(data.content || '');
      } else if (data.type === 'response' && typeof data.response === 'string') {
        console.log('\n[WS response]\n' + data.response);
        finalText = data.response;
      } else if (data.type === 'task_complete' || data.done === true) {
        done = true;
        finish(0);
      } else if (data.type === 'error') {
        console.error('[WS error]', data.message);
      }
    } catch (e) {
      console.error('[WS parse error]', e);
    }
  });

  ws.on('close', () => {
    if (!done) finish(0);
  });
  ws.on('error', (err) => {
    console.error('[WS fatal]', err?.message || err);
    finish(1);
  });

  setTimeout(() => {
    if (!done) {
      console.error('Timeout waiting for response');
      finish(1);
    }
  }, 30000);
}

main().catch((e) => {
  console.error('Test failed:', e?.stack || e?.message || e);
  process.exit(1);
});

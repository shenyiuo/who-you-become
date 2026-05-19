export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '服务器未配置 API Key,请在 Vercel 环境变量中设置 DEEPSEEK_API_KEY。' });
    return;
  }

  async function readBody() {
    if (req.body) {
      if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch (e) { return null; }
      }
      return req.body;
    }
    return await new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        if (!raw) { resolve(null); return; }
        try { resolve(JSON.parse(raw)); } catch (e) { resolve(null); }
      });
      req.on('error', () => resolve(null));
    });
  }

  const body = await readBody();
  const messages = body && body.messages;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: '缺少 messages 参数,或请求体格式不对。' });
    return;
  }

  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.8
      })
    });

    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json({ error: 'DeepSeek API 错误', detail: data });
      return;
    }

    const text = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    res.status(200).json({ text: text });
  } catch (e) {
    res.status(500).json({ error: '调用失败:' + (e && e.message ? e.message : String(e)) });
  }
}

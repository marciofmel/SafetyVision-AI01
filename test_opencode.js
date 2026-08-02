const http = require('http');

function opencodeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({
      hostname: '127.0.0.1',
      port: 4096,
      path,
      method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  console.log('Criando sessão...');
  const session = await opencodeRequest('POST', '/session');
  console.log('Sessão:', JSON.stringify(session, null, 2));
  
  console.log('\nEnviando mensagem...');
  const result = await opencodeRequest('POST', `/session/${session.id || session.sessionID}/message`, {
    parts: [{ type: 'text', text: 'Olá, quem é você?' }]
  });
  console.log('Resultado:', JSON.stringify(result, null, 2));
}

test().catch(console.error);

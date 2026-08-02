const { spawn } = require('child_process');
const TelegramBot = require('node-telegram-bot-api').TelegramBot;
const http = require('http');

const TOKEN = '8667608055:AAEfJMJtKeBC0VcppeG3xr6jEShGPtsnpUc';
const OPENCODE_PORT = 4097;

console.log('Iniciando servidor opencode...');

// Inicia opencode serve
const opencode = spawn('opencode', ['serve', '--port', String(OPENCODE_PORT), '--hostname', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

opencode.stdout.on('data', (data) => {
  const text = data.toString();
  console.log(`[opencode] ${text.trim()}`);
  
  if (text.includes('listening')) {
    console.log('Servidor opencode pronto!');
    startBot();
  }
});

opencode.stderr.on('data', (data) => {
  console.log(`[opencode stderr] ${data.toString().trim()}`);
});

opencode.on('error', (err) => {
  console.error('Erro ao iniciar opencode:', err.message);
});

opencode.on('close', (code) => {
  console.log(`opencode encerrou (código: ${code})`);
});

// Sessões
const sessions = {};

function opencodeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({
      hostname: '127.0.0.1',
      port: OPENCODE_PORT,
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

async function getOrCreateSession(chatId) {
  if (!sessions[chatId]) {
    const result = await opencodeRequest('POST', '/session');
    sessions[chatId] = result.id || result.sessionID;
    console.log(`Sessão criada: ${sessions[chatId]}`);
  }
  return sessions[chatId];
}

function startBot() {
  console.log('Iniciando bot Telegram...');
  const bot = new TelegramBot(TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
      `Fala ${msg.from.first_name}! Sou o Agente Stone 🤖\n\n` +
      `Manda qualquer mensagem que EU respondo!\n\n` +
      `/start - Menu\n/new - Nova conversa`
    );
  });

  bot.onText(/\/new/, (msg) => {
    delete sessions[msg.chat.id];
    bot.sendMessage(msg.chat.id, '🔄 Nova sessão!');
  });

  bot.on('message', async (msg) => {
    const text = msg.text;
    if (!text || text.startsWith('/')) return;

    console.log(`[${msg.from.first_name}]: ${text}`);
    bot.sendChatAction(msg.chat.id, 'typing');

    try {
      const sessionId = await getOrCreateSession(msg.chat.id);
      const result = await opencodeRequest('POST', `/session/${sessionId}/message`, {
        parts: [{ type: 'text', text }]
      });

      let resposta;
      if (result && result.parts) {
        resposta = result.parts.filter(p => p.type === 'text').map(p => p.text).join('\n');
      } else if (typeof result === 'string') {
        resposta = result;
      } else {
        resposta = JSON.stringify(result, null, 2);
      }

      if (!resposta) resposta = '✅ Processado';

      console.log(`Resposta: ${resposta.substring(0, 100)}...`);

      if (resposta.length > 4000) {
        for (let i = 0; i < resposta.length; i += 4000) {
          await bot.sendMessage(msg.chat.id, resposta.substring(i, i + 4000));
        }
      } else {
        await bot.sendMessage(msg.chat.id, resposta);
      }
    } catch (err) {
      console.error('Erro:', err.message);
      bot.sendMessage(msg.chat.id, `❌ Erro: ${err.message}`);
    }
  });

  console.log('Bot ativo!');
}

// Cleanup
process.on('SIGINT', () => {
  opencode.kill();
  process.exit(0);
});

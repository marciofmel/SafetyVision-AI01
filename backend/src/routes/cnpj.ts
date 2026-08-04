import { Router } from 'express';
import https from 'https';
import http from 'http';

const router = Router();

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'SafetyVision-AI/1.0' }, timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON parse error')); }
      });
    }).on('error', reject);
  });
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 SafetyVision-AI/1.0' }, timeout: 10000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function searchWithAI(cnpj: string, brasilData: any): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const empresaNome = brasilData?.razao_social || brasilData?.nome || '';
  const nomeFantasia = brasilData?.nome_fantasia || '';
  const searchName = nomeFantasia || empresaNome;

  const searchQuery = `"${searchName}" CNPJ ${cnpj} empresa contato telefone email endereço`;

  const prompt = `Você é um assistente que encontra informações de empresas brasileiras.
O CNPJ consultado é: ${cnpj}
Dados já conhecidos da BrasilAPI:
- Razão Social: ${empresaNome}
- Nome Fantasia: ${nomeFantasia}
- Endereço: ${brasilData?.logradouro || ''} ${brasilData?.numero || ''}, ${brasilData?.bairro || ''}, ${brasilData?.municipio || ''} - ${brasilData?.uf || ''}
- CEP: ${brasilData?.cep || ''}
- Telefone: ${brasilData?.ddd_telefone_1 || ''}
- Email: ${brasilData?.email || ''}
- Situação: ${brasilData?.descricao_situacao_cadastral || ''}
- Atividade: ${brasilData?.cnae_fiscal_descricao || ''}

RETORNE um JSON com TODAS as informações que você conhece sobre esta empresa. Inclua:
- nome: razão social
- nomeFantasia: nome fantasia
- cnpj: CNPJ formatado
- endereco: logradouro + número
- bairro
- cidade
- estado (sigla UF)
- cep
- telefone: formato (XX) XXXXX-XXXX
- telefone2: segundo telefone se houver
- email
- email2: segundo email se houver
- site: website da empresa
- situacao: situação cadastral
- atividadePrincipal: descrição da atividade
- porte: porte da empresa
- dataAbertura: data de abertura
- capitalSocial: capital social
- socios: nomes dos sócios (se souber)
- observacoes: qualquer informação adicional relevante

IMPORTANTE: Use APENAS dados reais que você KNOW com certeza. Se não souber algo, deixe vazio. NUNCA invente dados.
Retorne APENAS o JSON, sem texto adicional.`;

  try {
    const response = await new Promise<any>((resolve, reject) => {
      const postData = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 15000,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('Parse error')); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const content = response?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err: any) {
    console.log('AI search fallback:', err.message);
  }
  return null;
}

router.get('/:cnpj', async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido' });

    let brasilData: any = null;
    try {
      brasilData = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    } catch {
      try {
        brasilData = await fetchJson(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
      } catch {}
    }

    let aiData: any = null;
    if (brasilData) {
      aiData = await searchWithAI(cnpj, brasilData);
    }

    const d = brasilData || {};
    const ai = aiData || {};

    const telefone1 = ai.telefone || (d.ddd_telefone_1 ? `(${d.ddd_telefone_1.substring(0, 2)}) ${d.ddd_telefone_1.substring(2)}` : '');
    const telefone2 = ai.telefone2 || (d.ddd_telefone_2 ? `(${d.ddd_telefone_2.substring(0, 2)}) ${d.ddd_telefone_2.substring(2)}` : '');
    const phones = [telefone1, telefone2].filter(Boolean).join(' / ');

    const enderecoBase = ai.endereco || `${d.logradouro || ''} ${d.numero || ''}`.trim();
    const bairro = ai.bairro || d.bairro || '';
    const cidade = ai.cidade || d.municipio || '';
    const estado = ai.estado || d.uf || '';
    const enderecoCompleto = [enderecoBase, bairro ? `-${ bairro}` : '', cidade && estado ? `${cidade}/${estado}` : ''].filter(Boolean).join(' ');

    const email1 = ai.email || d.email || '';
    const email2 = ai.email2 || '';

    res.json({
      nome: ai.nome || d.razao_social || d.nome || '',
      nomeFantasia: ai.nomeFantasia || d.nome_fantasia || '',
      cnpj: d.cnpj || cnpj,
      endereco: enderecoCompleto,
      bairro: bairro,
      cidade: cidade,
      estado: estado,
      telefone: phones,
      email: email1,
      email2: email2,
      cep: ai.cep || d.cep || '',
      situacao: ai.situacao || d.descricao_situacao_cadastral || '',
      atividadePrincipal: ai.atividadePrincipal || d.cnae_fiscal_descricao || '',
      porte: ai.porte || d.porte || '',
      dataAbertura: ai.dataAbertura || d.data_abertura || '',
      capitalSocial: ai.capitalSocial || d.capital_social || '',
      socios: ai.socios || [],
      site: ai.site || '',
      observacoes: ai.observacoes || '',
    });
  } catch (err: any) {
    res.status(404).json({ error: 'CNPJ não encontrado' });
  }
});

export default router;

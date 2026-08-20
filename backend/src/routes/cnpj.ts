import { Router } from 'express';
import https from 'https';
import http from 'http';
import { geminiConfigurada, geminiTexto, extrairJson } from '../services/gemini';

const router = Router();

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => resolve(null));
  });
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'SafetyVision-AI/1.0' }, timeout: 5000 }, (res) => {
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
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 SafetyVision-AI/1.0' }, timeout: 5000 }, (res) => {
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
  if (!geminiConfigurada()) return null;

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

Busca sugerida: ${searchQuery}

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

IMPORTANTE: Use APENAS dados reais que você conhece com certeza. Se não souber algo, deixe vazio. NUNCA invente dados.
Retorne APENAS o JSON, sem texto adicional.`;

  try {
    const content = await geminiTexto(prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return extrairJson(content);
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
      aiData = await withTimeout(searchWithAI(cnpj, brasilData), 25000);
    }

    const d = brasilData || {};
    const ai = aiData || {};

    const telefone1 = ai.telefone || d.telefone || (d.ddd_telefone_1 ? `(${d.ddd_telefone_1.substring(0, 2)}) ${d.ddd_telefone_1.substring(2)}` : '');
    const telefone2 = ai.telefone2 || (d.ddd_telefone_2 ? `(${d.ddd_telefone_2.substring(0, 2)}) ${d.ddd_telefone_2.substring(2)}` : '');
    const phones = [telefone1, telefone2].filter(Boolean).join(' / ');

    const enderecoLog = ai.endereco || d.logradouro || '';
    const enderecoNum = d.numero || '';
    const enderecoBase = [enderecoLog, enderecoNum].filter(Boolean).join(', ');
    const bairro = ai.bairro || d.bairro || '';
    const cidade = ai.cidade || d.municipio || '';
    const estado = ai.estado || d.uf || '';

    const email1 = ai.email || d.email || '';

    const atividadePrincipal = ai.atividadePrincipal || d.cnae_fiscal_descricao || (Array.isArray(d.atividade_principal) ? d.atividade_principal[0]?.text : '') || '';
    const atividadeSecundaria = ai.atividadeSecundaria || (Array.isArray(d.atividades_secundarias) ? d.atividades_secundarias.map((a: any) => a.text || a).join('; ') : '');
    const naturezaJuridica = ai.naturezaJuridica || d.natureza_juridica || '';
    const simplesNacional = d.simples?.optante === true || d.simples_nacional?.optante === true || false;
    const empresaMEI = d.simei?.optante === true || false;
    const socios = ai.socios || (Array.isArray(d.qsa) ? d.qsa.map((s: any) => s.nome_socio || s.nome).filter(Boolean) : []);

    res.json({
      nome: ai.nome || d.razao_social || d.nome || '',
      nomeFantasia: ai.nomeFantasia || d.nome_fantasia || d.fantasia || '',
      cnpj: d.cnpj || cnpj,
      endereco: enderecoBase,
      bairro: bairro,
      cidade: cidade,
      estado: estado,
      telefone: phones,
      email: email1,
      email2: ai.email2 || '',
      cep: ai.cep || d.cep || '',
      situacao: ai.situacao || d.descricao_situacao_cadastral || d.situacao || '',
      atividadePrincipal,
      atividadeSecundaria,
      naturezaJuridica,
      porte: ai.porte || d.porte || '',
      dataAbertura: ai.dataAbertura || d.data_inicio || d.data_abertura || d.abertura || '',
      capitalSocial: ai.capitalSocial || d.capital_social || '',
      socios,
      simplesNacional,
      empresaMEI,
      site: ai.site || '',
      observacoes: ai.observacoes || '',
    });
  } catch (err: any) {
    res.status(404).json({ error: 'CNPJ não encontrado' });
  }
});

export default router;


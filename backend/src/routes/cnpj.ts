import { Router } from 'express';
import https from 'https';

const router = Router();

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SafetyVision-AI/1.0' } }, (res) => {
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

router.get('/:cnpj', async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido' });

    const data = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    res.json({
      nome: data.razao_social || data.nome || '',
      nomeFantasia: data.nome_fantasia || '',
      cnpj: data.cnpj || cnpj,
      endereco: `${data.logradouro || ''} ${data.numero || ''}`.trim(),
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      estado: data.uf || '',
      telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : '',
      email: data.email || '',
      cep: data.cep || '',
      situacao: data.descricao_situacao_cadastral || '',
      atividadePrincipal: data.cnae_fiscal_descricao || '',
    });
  } catch (err: any) {
    res.status(404).json({ error: 'CNPJ não encontrado' });
  }
});

export default router;

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@safetyvision.com';
  const techEmail = 'tecnico@safetyvision.com';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash('Admin@123', 10);
    await prisma.user.create({ data: { nome: 'Administrador', email: adminEmail, senhaHash: hash, cargo: 'Admin' } });
    console.log('Admin criado');
  }

  const existingTech = await prisma.user.findUnique({ where: { email: techEmail } });
  if (!existingTech) {
    const hash = await bcrypt.hash('Tecnico@123', 10);
    await prisma.user.create({ data: { nome: 'Técnico Teste', email: techEmail, senhaHash: hash, cargo: 'Tecnico' } });
    console.log('Técnico criado');
  }

  const planos = [
    { nome: 'Gratuito', descricao: 'Para começar a usar', preco: 0, periodo: 'mensal', limiteEmpresas: 1, limiteInspecoes: 5, limiteUsuarios: 1, features: 'Inspeções básicas, 1 empresa, 5 inspeções/mês, EPIs, Colaboradores' },
    { nome: 'Pro', descricao: 'Para profissionais', preco: 97, periodo: 'mensal', limiteEmpresas: 5, limiteInspecoes: 50, limiteUsuarios: 3, features: 'Tudo do Gratuito + PGR/APR, Laudos, Cronograma, Checklists, Treinamentos, Incidentes, Conformidade, CSV Export' },
    { nome: 'Enterprise', descricao: 'Para empresas grandes', preco: 297, periodo: 'mensal', limiteEmpresas: 999, limiteInspecoes: 9999, limiteUsuarios: 999, features: 'Tudo do Pro + API pública, Multi-tenant, Dashboard admin, Suporte prioritário, Backup automático, Assinatura digital' },
  ];

  for (const p of planos) {
    const existing = await prisma.plano.findFirst({ where: { nome: p.nome } });
    if (!existing) {
      await prisma.plano.create({ data: p });
      console.log(`Plano ${p.nome} criado`);
    }
  }

  console.log('Seed concluído!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

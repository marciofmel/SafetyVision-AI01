import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SafetyVision AI...');

  // Usuário admin
  const senhaHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@safetyvision.com' },
    update: {},
    create: { nome: 'Administrador', email: 'admin@safetyvision.com', senhaHash, cargo: 'Administrador' },
  });
  console.log(`Admin: ${admin.email}`);

  // Empresas de exemplo
  const emp1 = await prisma.empresa.create({ data: { nome: 'Construtora ABC', cnpj: '12.345.678/0001-90', endereco: 'Rua das Obras, 100', telefone: '(11) 3333-4444', email: 'contato@abc.com' } });
  const emp2 = await prisma.empresa.create({ data: { nome: 'Indústria XYZ', cnpj: '98.765.432/0001-10', endereco: 'Av. Industrial, 500', telefone: '(11) 5555-6666', email: 'seguranca@xyz.com' } });

  // Setores
  await prisma.setor.createMany({ data: [
    { nome: 'Canteiro de Obras', empresaId: emp1.id },
    { nome: 'Andar 5 - Estruturas', empresaId: emp1.id },
    { nome: 'Estacionamento', empresaId: emp1.id },
    { nome: 'Linha de Produção', empresaId: emp2.id },
    { nome: 'Depósito', empresaId: emp2.id },
    { nome: 'Escritório', empresaId: emp2.id },
  ]});

  console.log('Seed concluído!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

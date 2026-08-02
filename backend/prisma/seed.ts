import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SafetyVision AI...');

  // Usuário admin
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@safetyvision.com' },
    update: {},
    create: { nome: 'Administrador', email: 'admin@safetyvision.com', senhaHash: adminHash, cargo: 'Admin' },
  });
  console.log(`Admin: ${admin.email} (cargo: ${admin.cargo})`);

  // Usuário técnico
  const techHash = await bcrypt.hash('Tecnico@123', 10);
  const tecnico = await prisma.user.upsert({
    where: { email: 'tecnico@safetyvision.com' },
    update: {},
    create: { nome: 'João Técnico', email: 'tecnico@safetyvision.com', senhaHash: techHash, cargo: 'Tecnico' },
  });
  console.log(`Técnico: ${tecnico.email} (cargo: ${tecnico.cargo})`);

  // Empresas
  const emp1 = await prisma.empresa.create({ data: { nome: 'Construtora ABC Ltda', cnpj: '12345678000190', endereco: 'Rua das Obras, 100 - São Paulo - SP', telefone: '(11) 3333-4444', email: 'contato@abc.com' } });
  const emp2 = await prisma.empresa.create({ data: { nome: 'Indústria XYZ S.A.', cnpj: '98765432000110', endereco: 'Av. Industrial, 500 - Campinas - SP', telefone: '(11) 5555-6666', email: 'seguranca@xyz.com' } });

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

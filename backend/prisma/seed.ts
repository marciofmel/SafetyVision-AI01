import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SafetyVision AI...');

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@safetyvision.com' },
    update: {},
    create: { nome: 'Administrador', email: 'admin@safetyvision.com', senhaHash: adminHash, cargo: 'Admin' },
  });
  console.log(`Admin: ${admin.email}`);

  const techHash = await bcrypt.hash('Tecnico@123', 10);
  const tecnico = await prisma.user.upsert({
    where: { email: 'tecnico@safetyvision.com' },
    update: {},
    create: { nome: 'João Técnico', email: 'tecnico@safetyvision.com', senhaHash: techHash, cargo: 'Tecnico' },
  });
  console.log(`Técnico: ${tecnico.email}`);

  const emp1 = await prisma.empresa.upsert({
    where: { id: 'emp_construtora_abc' },
    update: {},
    create: {
      id: 'emp_construtora_abc',
      nome: 'Construtora ABC Ltda',
      cnpj: '12345678000190',
      endereco: 'Rua das Obras, 100 - São Paulo - SP',
      telefone: '(11) 3333-4444',
      email: 'contato@abc.com',
    },
  });

  const emp2 = await prisma.empresa.upsert({
    where: { id: 'emp_industria_xyz' },
    update: {},
    create: {
      id: 'emp_industria_xyz',
      nome: 'Indústria XYZ S.A.',
      cnpj: '98765432000110',
      endereco: 'Av. Industrial, 500 - Campinas - SP',
      telefone: '(11) 5555-6666',
      email: 'seguranca@xyz.com',
    },
  });

  console.log(`Empresas: ${emp1.nome}, ${emp2.nome}`);

  const setores = [
    { id: 'set_canteiro', nome: 'Canteiro de Obras', empresaId: emp1.id },
    { id: 'set_andar5', nome: 'Andar 5 - Estruturas', empresaId: emp1.id },
    { id: 'set_estacionamento', nome: 'Estacionamento', empresaId: emp1.id },
    { id: 'set_linha_prod', nome: 'Linha de Produção', empresaId: emp2.id },
    { id: 'set_deposito', nome: 'Depósito', empresaId: emp2.id },
    { id: 'set_escritorio', nome: 'Escritório', empresaId: emp2.id },
  ];

  for (const s of setores) {
    await prisma.setor.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  console.log('Seed concluído!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

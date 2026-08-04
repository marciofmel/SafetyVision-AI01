import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SafetyVision AI...');

  const adminHash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@safetyvision.com' },
    update: {},
    create: { nome: 'Administrador', email: 'admin@safetyvision.com', senhaHash: adminHash, cargo: 'Admin' },
  });

  const techHash = await bcrypt.hash('Tecnico@123', 10);
  await prisma.user.upsert({
    where: { email: 'tecnico@safetyvision.com' },
    update: {},
    create: { nome: 'João Técnico', email: 'tecnico@safetyvision.com', senhaHash: techHash, cargo: 'Tecnico' },
  });

  console.log('Seed concluído! Usuários criados.');
}

main().catch(console.error).finally(() => prisma.$disconnect());

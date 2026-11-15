import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function seedAdminAndMod() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@yatraguard.in';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'YatraAdmin@2025';

  const modEmail = process.env.MODERATOR_SEED_EMAIL || 'moderator@yatraguard.in';
  const modPassword = process.env.MODERATOR_SEED_PASSWORD || 'YatraMod@2025';

  console.log('🌱 Seeding initial privileged accounts...');

  // 1. Seed or Update Admin
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN', isActive: true },
      });
      console.log(`✅ Existing user ${adminEmail} updated to ADMIN role`);
    } else {
      console.log(`ℹ️ Admin user ${adminEmail} already exists with ADMIN role`);
    }
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'YatraGuard Master Admin',
        passwordHash,
        role: 'ADMIN',
        authProvider: 'LOCAL',
        isEmailVerified: true,
        isActive: true,
        aboutMe: 'Chief System Administrator for YatraGuard Platform',
        location: 'New Delhi, India',
      },
    });
    console.log(`✅ Admin account created: ${adminEmail}`);
  }

  // 2. Seed or Update Moderator
  const existingMod = await prisma.user.findUnique({ where: { email: modEmail } });
  if (existingMod) {
    if (existingMod.role !== 'MODERATOR') {
      await prisma.user.update({
        where: { email: modEmail },
        data: { role: 'MODERATOR', isActive: true },
      });
      console.log(`✅ Existing user ${modEmail} updated to MODERATOR role`);
    } else {
      console.log(`ℹ️ Moderator user ${modEmail} already exists with MODERATOR role`);
    }
  } else {
    const passwordHash = await bcrypt.hash(modPassword, 12);
    await prisma.user.create({
      data: {
        email: modEmail,
        name: 'Senior Safety Moderator',
        passwordHash,
        role: 'MODERATOR',
        authProvider: 'LOCAL',
        isEmailVerified: true,
        isActive: true,
        aboutMe: 'Lead Incident & Safety Verification Moderator',
        location: 'Shimla, India',
      },
    });
    console.log(`✅ Moderator account created: ${modEmail}`);
  }

  await prisma.$disconnect();
}

seedAdminAndMod().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});

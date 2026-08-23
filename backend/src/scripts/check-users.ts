import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const users = await prisma.user.findMany();
    console.log('--- USERS IN DB ---');
    users.forEach(u => console.log(`Username: ${u.username}, Role: ${u.role}, Hash: ${u.passwordHash.substring(0, 10)}...`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

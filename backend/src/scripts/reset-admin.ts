import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be defined in the environment variables');
    }

    // Delete if exists
    await prisma.user.deleteMany({
        where: { username },
    });

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.create({
        data: {
            username,
            passwordHash,
            role: 'admin',
        },
    });

    console.log('Admin user re-created successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

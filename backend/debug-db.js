const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { shop: { include: { subscription: true } } }
  });
  users.forEach(user => {
    if (user.shop) {
        const expiry = user.shop.subscription?.expiryDate;
        const status = user.shop.status;
        console.log(`User: ${user.username}`);
        console.log(`  Status: ${status} (suspended? ${status && status !== 'active'})`);
        console.log(`  Expiry: ${expiry}`);
        console.log(`  Is Expired?: ${expiry && new Date(expiry) < new Date()}`);
    }
  });
}
main().finally(() => prisma.$disconnect());

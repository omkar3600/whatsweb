const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const shop = await prisma.shop.findFirst();
    if (!shop) {
      console.log('No shop found');
      return;
    }
    console.log('Using shop:', shop.id);
    const workflow = await prisma.workflow.create({
      data: {
        shopId: shop.id,
        name: 'Test Workflow',
        status: 'draft',
        versions: {
          create: {
            versionNumber: 1,
            status: 'draft',
            graph: { nodes: [], edges: [] }
          }
        }
      },
      include: {
        versions: true
      }
    });
    console.log('Workflow created:', workflow);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();

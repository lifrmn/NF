const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        nfcCards: true,
        sentTransactions: true,
        receivedTransactions: true
      }
    });
    
    console.log('\n📊 Users in database:\n');
    users.forEach(u => {
      console.log(`  ID: ${u.id} | Username: ${u.username} | Name: ${u.name}`);
      console.log(`    NFC Cards: ${u.nfcCards.length}`);
      console.log(`    Transactions: ${u.sentTransactions.length + u.receivedTransactions.length}\n`);
    });
    
    console.log(`Total users: ${users.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

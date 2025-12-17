const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncCardBalances() {
  console.log('🔄 Syncing card balances with user balances...\n');

  try {
    // Ambil semua kartu yang punya userId
    const cards = await prisma.nFCCard.findMany({
      where: {
        userId: { not: null }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            balance: true
          }
        }
      }
    });

    if (cards.length === 0) {
      console.log('⚠️  No cards found with userId');
      return;
    }

    console.log(`📋 Found ${cards.length} card(s) to sync\n`);

    for (const card of cards) {
      if (card.user) {
        const oldBalance = card.balance;
        const newBalance = card.user.balance;

        await prisma.nFCCard.update({
          where: { id: card.id },
          data: { balance: newBalance }
        });

        console.log(`✅ Card ${card.cardId.slice(0, 8)}... (User: ${card.user.username})`);
        console.log(`   Old: Rp ${oldBalance.toLocaleString('id-ID')}`);
        console.log(`   New: Rp ${newBalance.toLocaleString('id-ID')}\n`);
      }
    }

    console.log('✅ All cards synced successfully!\n');

  } catch (error) {
    console.error('❌ Error syncing cards:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncCardBalances();

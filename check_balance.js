const { PrismaClient } = require('@prisma/client');

async function checkBalances() {
    const prisma = new PrismaClient();
    
    try {
        console.log('=== Checking Database Users ===');
        const users = await prisma.user.findMany();
        
        users.forEach(user => {
            console.log(`User: ${user.username}`);
            console.log(`Balance: ${user.balance}`);
            console.log(`Active: ${user.isActive}`);
            console.log(`Created: ${user.createdAt}`);
            console.log('-------------------');
        });
        
        console.log(`Total users: ${users.length}`);
        
    } catch (error) {
        console.error('Error checking balances:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBalances();
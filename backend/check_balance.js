// ============================================================================
// CHECK_BALANCE.JS - UTILITY SCRIPT UNTUK INSPECT USER BALANCES
// ============================================================================
// Script ini digunakan untuk monitoring balance semua user di database.
// Berguna untuk verifikasi setelah transaksi atau troubleshooting.
//
// USE CASES:
// 1. Verify balance after payment transaction
// 2. Check balance consistency across users
// 3. Monitor account status (active/inactive)
// 4. Audit trail untuk financial reporting
// 5. Debug balance-related bugs
//
// CARA PAKAI:
// node backend/check_balance.js
//
// OUTPUT:
// Menampilkan semua user dengan informasi:
// - Username
// - Current balance (dalam rupiah)
// - Account status (active/inactive)
// - Created date
//
// NOTES:
// Balance adalah data sensitif, jangan run script ini di production
// tanpa proper security measures (log sanitization, access control)
// ============================================================================

const { PrismaClient } = require('@prisma/client'); // Prisma ORM untuk database access

// ============================================================================
// FUNCTION: checkBalances
// ============================================================================
// Main function untuk query dan display balance semua user
//
// FLOW:
// 1. Query semua user dari database
// 2. Loop dan display info setiap user
// 3. Display summary statistics
//
// RETURN: void (exit via normal completion atau error)
// ============================================================================
async function checkBalances() {
    const prisma = new PrismaClient(); // Instance Prisma client
    
    try {
        // ====================================================================
        // STEP 1: QUERY SEMUA USER
        // ====================================================================
        console.log('=== Checking Database Users ===\n');
        const users = await prisma.user.findMany();
        
        // ====================================================================
        // STEP 2: DISPLAY SETIAP USER DENGAN DETAIL
        // ====================================================================
        // Variabel untuk calculate summary statistics
        let totalBalance = 0;
        let activeUsers = 0;
        
        users.forEach(user => {
            // Display user information
            console.log(`User: ${user.username}`);
            console.log(`Balance: Rp ${user.balance.toLocaleString('id-ID')}`);
            console.log(`Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
            console.log(`Created: ${new Date(user.createdAt).toLocaleString('id-ID')}`);
            console.log('-------------------');
            
            // Accumulate statistics
            totalBalance += user.balance;
            if (user.isActive) activeUsers++;
        });
        
        // ====================================================================
        // STEP 3: DISPLAY SUMMARY STATISTICS
        // ====================================================================
        console.log(`\n📊 SUMMARY:`);
        console.log(`Total users: ${users.length}`);
        console.log(`Active users: ${activeUsers}`);
        console.log(`Inactive users: ${users.length - activeUsers}`);
        console.log(`Total balance in system: Rp ${totalBalance.toLocaleString('id-ID')}`);
        
        // Calculate average balance
        if (users.length > 0) {
            const avgBalance = totalBalance / users.length;
            console.log(`Average balance per user: Rp ${avgBalance.toLocaleString('id-ID')}`);
        }
        
        console.log(`\n💡 Tip: Run 'node backend/check-users.js' untuk cek user relations\n`);
        
    } catch (error) {
        // ====================================================================
        // ERROR HANDLING
        // ====================================================================
        console.error('❌ Error checking balances:', error.message);
        console.error('\n🔍 Possible causes:');
        console.error('   • Database connection failed');
        console.error('   • User table does not exist');
        console.error('   • Database migration not completed');
        console.error('   • Insufficient permissions\n');
        console.error('💡 Solutions:');
        console.error('   1. Run: npx prisma generate');
        console.error('   2. Run: npx prisma db push');
        console.error('   3. Check .env database configuration\n');
        process.exit(1);
    } finally {
        // ====================================================================
        // CLEANUP - DISCONNECT PRISMA CLIENT
        // ====================================================================
        await prisma.$disconnect();
    }
}

// ============================================================================
// EXECUTION - RUN THE CHECK FUNCTION
// ============================================================================
checkBalances();

// ============================================================================
// END OF FILE: check_balance.js
// ============================================================================
// SUMMARY:
// Script utility untuk monitoring user balances dan system financial status.
// Penting untuk audit trail dan troubleshooting.
//
// SECURITY CONSIDERATIONS:
// ⚠️ Balance adalah data sensitif - jangan expose di production logs
// ⚠️ Implementasi access control jika di-deploy ke server
// ⚠️ Consider adding role-based access (admin only)
//
// RELATED FILES:
// - check-users.js: Check user data dengan relations
// - sync-card-balance.js: Sync balance user ke cards
// - backend/routes/transactions.js: Production transaction logic
//
// ACADEMIC NOTE (UNTUK SKRIPSI):
// Script ini adalah implementasi "Financial Audit Tool" untuk monitoring
// system financial integrity. Dalam payment systems, balance monitoring
// adalah critical component untuk:
// 1. Detect anomalies (negative balance, suspicious changes)
// 2. Verify transaction correctness
// 3. Comply with financial regulations
// Reference: Financial Systems - Audit & Compliance requirements
// ============================================================================
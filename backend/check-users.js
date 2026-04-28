// ============================================================================
// CHECK-USERS.JS - UTILITY SCRIPT UNTUK INSPECT USER DATABASE
// ============================================================================
// Script ini digunakan untuk monitoring dan debugging data user
// beserta relasi NFC cards dan transactions.
//
// USE CASES:
// 1. Verify user registration berhasil
// 2. Check berapa kartu NFC yang terdaftar per user
// 3. Monitor aktivitas transaksi user
// 4. Debug masalah user data (missing fields, wrong relations)
// 5. Quick database health check
//
// CARA PAKAI:
// node backend/check-users.js
//
// OUTPUT:
// Menampilkan list semua user dengan informasi:
// - User ID, Username, Name
// - Jumlah NFC cards yang terdaftar
// - Total transaksi (sent + received)
//
// RELASI DATA:
// User 1:N NFCCard (one user can have many cards)
// User 1:N Transaction (as sender)
// User 1:N Transaction (as receiver)
// ============================================================================

const { PrismaClient } = require('@prisma/client'); // Prisma ORM untuk database access
const prisma = new PrismaClient(); // Buat instance Prisma client

// ============================================================================
// FUNCTION: checkUsers
// ============================================================================
// Main function untuk query dan display semua user data beserta relasi
//
// FLOW:
// 1. Query semua user dengan include relations (eager loading)
// 2. Loop setiap user dan display informasi lengkap
// 3. Display total count
//
// RETURN: void (exit via normal completion atau error)
// ============================================================================
async function checkUsers() {
  try {
    // ========================================================================
    // STEP 1: QUERY SEMUA USER DENGAN EAGER LOADING RELATIONS
    // ========================================================================
    // Include relations untuk mendapatkan data terkait dalam 1 query
    // (efficient daripada N+1 query problem)
    const users = await prisma.user.findMany({
      include: {
        nfcCards: true,              // Semua kartu NFC milik user ini
        sentTransactions: true,      // Transaksi dimana user sebagai sender
        receivedTransactions: true   // Transaksi dimana user sebagai receiver
      }
    });
    
    // ========================================================================
    // STEP 2: DISPLAY USER INFORMATION
    // ========================================================================
    console.log('\n📊 Users in database:\n');
    
    // Loop setiap user dan tampilkan info lengkap
    users.forEach(u => {
      // Display identitas user
      console.log(`  ID: ${u.id} | Username: ${u.username} | Name: ${u.name}`);
      
      // Display jumlah kartu NFC yang terdaftar
      console.log(`    NFC Cards: ${u.nfcCards.length}`);
      
      // Display total transaksi (kombinasi sent + received)
      const totalTransactions = u.sentTransactions.length + u.receivedTransactions.length;
      console.log(`    Transactions: ${totalTransactions}`);
      console.log(`      - Sent: ${u.sentTransactions.length}`);
      console.log(`      - Received: ${u.receivedTransactions.length}\n`);
    });
    
    // ========================================================================
    // STEP 3: DISPLAY SUMMARY
    // ========================================================================
    console.log(`Total users: ${users.length}`);
    
    // Calculate aggregate stats
    const totalCards = users.reduce((sum, u) => sum + u.nfcCards.length, 0);
    const totalTx = users.reduce((sum, u) => 
      sum + u.sentTransactions.length + u.receivedTransactions.length, 0
    );
    
    console.log(`Total NFC cards: ${totalCards}`);
    console.log(`Total transactions: ${totalTx}`);
    console.log(`\n💡 Tip: Run 'node backend/check_balance.js' untuk cek balance detail\n`);
    
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    // Kemungkinan error:
    // 1. Database connection failed
    // 2. Table User tidak ada (migration belum run)
    // 3. Permission error
    console.error('❌ Error checking users:', error.message);
    console.error('\n🔍 Possible causes:');
    console.error('   • Database not initialized (run: npx prisma db push)');
    console.error('   • Prisma client not generated (run: npx prisma generate)');
    console.error('   • Database file corrupted or missing');
    console.error('   • Network/connection issue\n');
    process.exit(1);
  } finally {
    // ========================================================================
    // CLEANUP - DISCONNECT PRISMA CLIENT
    // ========================================================================
    await prisma.$disconnect();
  }
}

// ============================================================================
// EXECUTION - RUN THE CHECK FUNCTION
// ============================================================================
checkUsers();

// ============================================================================
// END OF FILE: check-users.js
// ============================================================================
// SUMMARY:
// Script utility untuk inspect user data dengan cepat.
// Berguna untuk debugging dan monitoring sistem.
//
// RELATED FILES:
// - check_balance.js: Check balance detail semua user
// - sync-card-balance.js: Sync card balance dengan user balance
// - backend/routes/users.js: Production user API endpoints
//
// ACADEMIC NOTE (UNTUK SKRIPSI):
// Script ini adalah implementasi "Database Inspection Tool" untuk
// monitoring dan debugging. Dalam development lifecycle, utility scripts
// seperti ini penting untuk:
// 1. Rapid feedback during testing
// 2. Data validation after operations
// 3. Troubleshooting production issues
// Reference: DevOps practices - Observability & Monitoring
// ============================================================================

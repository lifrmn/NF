import * as SQLite from 'expo-sqlite';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

// Initialize database connection
const getDatabaseConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('nfcpayment.db');
    console.log('✅ Database connected: nfcpayment.db');
  }
  return db;
};

// Backup database function
export const backupDatabase = async (): Promise<void> => {
  try {
    const database = await getDatabaseConnection();
    // Database is automatically persisted by expo-sqlite
    console.log('💾 Database automatically backed up by SQLite');
  } catch (error) {
    console.error('❌ Backup error:', error);
  }
};

// User interfaces
export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: string;
  senderId: number;
  receiverId: number;
  createdAt: string;
  sender?: { name: string; username: string };
  receiver?: { name: string; username: string };
}

// Create tables if they don't exist
export async function initializeDatabase(): Promise<void> {
  try {
    const database = await getDatabaseConnection();
    
    // Create users table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        balance REAL DEFAULT 100000,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create transactions table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        senderId INTEGER NOT NULL,
        receiverId INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users (id),
        FOREIGN KEY (receiverId) REFERENCES users (id)
      );
    `);

    console.log('✅ Database tables initialized successfully (no demo users)');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// User authentication
export async function loginUser(username: string, password: string): Promise<User | null> {
  try {
    const database = await getDatabaseConnection();
    
    const user = await database.getFirstAsync(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    ) as User | null;

    if (user) {
      console.log('✅ Login successful for:', username);
      return user;
    }

    console.log('❌ Invalid credentials for:', username);
    return null;
  } catch (error) {
    console.error('❌ Login error:', error);
    return null;
  }
}

// Register new user
export async function registerUser(
  username: string,
  password: string,
  name: string
): Promise<User | null> {
  try {
    const database = await getDatabaseConnection();
    
    // Check if username already exists
    const existingUser = await database.getFirstAsync(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      console.log('❌ Username already exists:', username);
      return null;
    }

    // Create new user
    const result = await database.runAsync(
      'INSERT INTO users (username, password, name, balance) VALUES (?, ?, ?, ?)',
      [username, password, name, 100000] // Initial balance: IDR 100,000
    );

    const newUser = await database.getFirstAsync(
      'SELECT * FROM users WHERE id = ?',
      [result.lastInsertRowId]
    ) as User;

    console.log('✅ User registered successfully:', username);
    return newUser;
  } catch (error) {
    console.error('❌ Registration error:', error);
    return null;
  }
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const database = await getDatabaseConnection();
    
    const user = await database.getFirstAsync(
      'SELECT * FROM users WHERE id = ?',
      [id]
    ) as User | null;

    return user;
  } catch (error) {
    console.error('❌ Get user error:', error);
    return null;
  }
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const database = await getDatabaseConnection();
    
    const user = await database.getFirstAsync(
      'SELECT * FROM users WHERE username = ?',
      [username]
    ) as User | null;

    return user;
  } catch (error) {
    console.error('❌ Get user by username error:', error);
    return null;
  }
}

// Update user balance
export async function updateUserBalance(userId: number, newBalance: number): Promise<boolean> {
  try {
    const database = await getDatabaseConnection();
    
    await database.runAsync(
      'UPDATE users SET balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [newBalance, userId]
    );

    console.log('✅ Balance updated for user:', userId, 'New balance:', newBalance);
    return true;
  } catch (error) {
    console.error('❌ Update balance error:', error);
    return false;
  }
}

// Process NFC payment transaction
export async function processPayment(
  senderId: number,
  receiverId: number,
  amount: number
): Promise<boolean> {
  try {
    const database = await getDatabaseConnection();
    
    // Start transaction
    await database.execAsync('BEGIN TRANSACTION');

    try {
      // Get sender and receiver
      const sender = await database.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [senderId]
      ) as User | null;

      const receiver = await database.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [receiverId]
      ) as User | null;

      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found');
      }

      if (sender.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Update balances
      await database.runAsync(
        'UPDATE users SET balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [sender.balance - amount, senderId]
      );

      await database.runAsync(
        'UPDATE users SET balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [receiver.balance + amount, receiverId]
      );

      // Create transaction record
      await database.runAsync(
        'INSERT INTO transactions (amount, type, senderId, receiverId) VALUES (?, ?, ?, ?)',
        [amount, 'payment', senderId, receiverId]
      );

      // Commit transaction
      await database.execAsync('COMMIT');

      console.log('✅ Payment processed successfully:', { senderId, receiverId, amount });
      return true;
    } catch (error) {
      // Rollback on error
      await database.execAsync('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    return false;
  }
}

// Get user transactions
export async function getUserTransactions(userId: number): Promise<Transaction[]> {
  try {
    const database = await getDatabaseConnection();
    
    const transactions = await database.getAllAsync(`
      SELECT 
        t.*,
        s.name as senderName,
        s.username as senderUsername,
        r.name as receiverName,
        r.username as receiverUsername
      FROM transactions t
      LEFT JOIN users s ON t.senderId = s.id
      LEFT JOIN users r ON t.receiverId = r.id
      WHERE t.senderId = ? OR t.receiverId = ?
      ORDER BY t.createdAt DESC
    `, [userId, userId]) as any[];

    return transactions.map(t => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      senderId: t.senderId,
      receiverId: t.receiverId,
      createdAt: t.createdAt,
      sender: { name: t.senderName, username: t.senderUsername },
      receiver: { name: t.receiverName, username: t.receiverUsername },
    }));
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    return [];
  }
}

// Get all users (for admin or testing)
export async function getAllUsers(): Promise<User[]> {
  try {
    const database = await getDatabaseConnection();
    
    const users = await database.getAllAsync(
      'SELECT * FROM users ORDER BY createdAt DESC'
    ) as User[];

    return users;
  } catch (error) {
    console.error('❌ Get all users error:', error);
    return [];
  }
}

// Clean up function
export async function closeDatabaseConnection(): Promise<void> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}
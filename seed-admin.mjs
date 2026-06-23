import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const password = '8780657095';
const email = 'admin@patelelectricals.com';

// Hash the password
const hashedPassword = await bcrypt.hash(password, 10);

console.log('Hashed password:', hashedPassword);
console.log('Email:', email);

// Create connection
const connection = await mysql.createConnection({
  host: 'mysql.railway.internal',
  user: 'root',
  password: 'AFqFGvmQtEDZwyjZSbEQFimVWVmAtDeT',
  database: 'railway',
  port: 3306
});

try {
  // Insert admin credentials
  await connection.execute(
    'INSERT INTO admin_credentials (email, passwordHash, isActive) VALUES (?, ?, ?)',
    [email, hashedPassword, true]
  );
  console.log('✅ Admin user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    console.log('Admin already exists, updating password...');
    await connection.execute(
      'UPDATE admin_credentials SET passwordHash = ?, isActive = ? WHERE email = ?',
      [hashedPassword, true, email]
    );
    console.log('✅ Admin password updated!');
  } else {
    console.error('Error:', error.message);
  }
}

await connection.end();

import bcryptjs from "bcryptjs";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:AFqFGvmQtEDZwyjZSbEQFimVWVmAtDeT@mysql.railway.internal:3306/railway";

async function setupAdmin() {
  try {
    // Parse connection string
    const url = new URL(DATABASE_URL);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: parseInt(url.port || "3306"),
      ssl: false,
    });

    const email = "burhanghiya26@gmail.com";
    const password = "8780657095";
    const passwordHash = await bcryptjs.hash(password, 10);

    // Check if admin already exists
    const [existing] = await connection.execute(
      "SELECT * FROM adminCredentials WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log("Admin already exists, updating...");
      await connection.execute(
        "UPDATE adminCredentials SET passwordHash = ?, isActive = 1 WHERE email = ?",
        [passwordHash, email]
      );
    } else {
      console.log("Creating new admin...");
      await connection.execute(
        "INSERT INTO adminCredentials (email, passwordHash, isActive) VALUES (?, ?, 1)",
        [email, passwordHash]
      );
    }

    console.log("✅ Admin credentials set successfully!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    await connection.end();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

setupAdmin();

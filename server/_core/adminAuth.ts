import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { adminCredentials } from "../../drizzle/schema";
import { ENV } from "./env";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[AdminAuth] Failed to connect to database:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Hash password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcryptjs.compare(password, hash);
}

/**
 * Create JWT token for admin
 */
export function createAdminToken(adminId: number, email: string): string {
  return jwt.sign(
    { adminId, email, type: "admin" },
    ENV.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Verify JWT token
 */
export function verifyAdminToken(token: string): { adminId: number; email: string; type: string } | null {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    if (decoded.type === "admin") {
      return { adminId: decoded.adminId, email: decoded.email, type: decoded.type };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Authenticate admin with email and password
 */
export async function authenticateAdmin(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection failed" };
    }

    // Find admin by email
    const admin = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.email, email))
      .limit(1);

    if (!admin || admin.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    const adminRecord = admin[0];

    // Check if admin is active
    if (!adminRecord.isActive) {
      return { success: false, error: "Admin account is inactive" };
    }

    // Verify password
    const passwordMatch = await comparePassword(password, adminRecord.passwordHash);
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password" };
    }

    // Update last login
    await db
      .update(adminCredentials)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminCredentials.id, adminRecord.id));

    // Create token
    const token = createAdminToken(adminRecord.id, adminRecord.email);

    return { success: true, token };
  } catch (error) {
    console.error("[AdminAuth] Authentication error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Create new admin account
 */
export async function createAdminAccount(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection failed" };
    }

    // Check if admin already exists
    const existing = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.email, email))
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "Admin account already exists" };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin account
    await db.insert(adminCredentials).values({
      email,
      passwordHash,
      isActive: true,
    });

    return { success: true };
  } catch (error) {
    console.error("[AdminAuth] Error creating admin account:", error);
    return { success: false, error: "Failed to create admin account" };
  }
}

/**
 * Get admin by ID
 */
export async function getAdminById(adminId: number): Promise<any> {
  try {
    const db = await getDb();
    if (!db) return null;

    const admin = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.id, adminId))
      .limit(1);

    return admin && admin.length > 0 ? admin[0] : null;
  } catch (error) {
    console.error("[AdminAuth] Error getting admin:", error);
    return null;
  }
}

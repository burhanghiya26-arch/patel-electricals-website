import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { adminCredentials } from "../../drizzle/schema";
import bcryptjs from "bcryptjs";

/**
 * Initialize default admin account if none exists
 */
export async function initializeDefaultAdmin(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("[AdminInit] DATABASE_URL not set, skipping admin initialization");
      return;
    }

    const db = drizzle(process.env.DATABASE_URL);

    // Check if any admin exists
    const existingAdmins = await db
      .select()
      .from(adminCredentials)
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log("[AdminInit] Admin account already exists");
      return;
    }

    // Create default admin
    const defaultEmail = "admin@patelelectricals.com";
    const defaultPassword = "8780657095";

    const hashedPassword = await bcryptjs.hash(defaultPassword, 10);

    await db.insert(adminCredentials).values({
      email: defaultEmail,
      passwordHash: hashedPassword,
      isActive: true,
    });

    console.log("[AdminInit] ✅ Default admin account created successfully");
    console.log(`[AdminInit] Email: ${defaultEmail}`);
    console.log(`[AdminInit] Password: ${defaultPassword}`);
  } catch (error: any) {
    console.error("[AdminInit] Error initializing admin:", error.message);
    // Don't throw - let the server continue even if admin init fails
  }
}

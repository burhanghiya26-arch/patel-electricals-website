import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import jwt from "jsonwebtoken";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { verifyAdminToken } from "./adminAuth";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.JWT_SECRET;
    return new TextEncoder().encode(secret);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    // Try to authenticate using admin JWT token
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);

// Admin cookie nahi mili to bhi customer cookie check karne do
if (!sessionCookie && !cookies.get("customer_session")) {
  return null;
}

    try {
      // Try to verify as admin token
      const adminToken = verifyAdminToken(sessionCookie);
      if (adminToken) {
        // Try to get admin user from database first
        const admin = await db.getUserByEmail(adminToken.email);
        if (admin && admin.role === "admin") {
          return admin;
        }
        // If not in users table yet, return a synthetic admin user
        // This handles the case where users table is empty but admin credentials exist
        const syntheticAdmin: User = {
          id: adminToken.adminId,
          openId: `admin_${adminToken.adminId}`,
          name: adminToken.email.split('@')[0],
          email: adminToken.email,
          loginMethod: 'admin',
          role: 'admin',
          businessName: null,
          gstNumber: null,
          businessAddress: null,
          businessPhone: null,
          businessEmail: null,
          creditLimit: '0',
          usedCredit: '0',
          creditApproved: false,
          assignedSalesRepId: null,
          isVerified: true,
          verificationDocuments: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
        return syntheticAdmin;
      }
    } catch (error) {
      console.warn("[Auth] Token verification failed", String(error));
    }

    // Try customer_session cookie as fallback
    const customerSessionCookie = cookies.get('customer_session');
    if (customerSessionCookie) {
      try {
        const decoded = jwt.verify(customerSessionCookie, process.env.JWT_SECRET || 'secret') as any;
        if (decoded && decoded.id) {
          // Get user from database
          const user = await db.getUserById(decoded.id);
          console.log("[AUTH DEBUG]",decoded.id, decoded.email, user);
          if (user) {
console.log("[AUTH] Customer Logged In:", decoded.id, decoded.email); return user;
}
          // If not in DB yet (race condition), return synthetic user
          const syntheticCustomer: User = {
            id: decoded.id,
            openId: `customer_${decoded.id}`,
            name: decoded.email?.split('@')[0] ?? null,
            email: decoded.email ?? null,
            loginMethod: 'email_phone',
            role: 'user',
            businessName: null,
            gstNumber: null,
            businessAddress: null,
            businessPhone: null,
            businessEmail: null,
            creditLimit: '0',
            usedCredit: '0',
            creditApproved: false,
            assignedSalesRepId: null,
            isVerified: false,
            verificationDocuments: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          };
          return syntheticCustomer;
        }
      } catch (err) {
        console.warn('[Auth] Customer session verification failed', String(err));
      }
    }

    // No valid authentication
    return null;
  }
}

export const sdk = new SDKServer();

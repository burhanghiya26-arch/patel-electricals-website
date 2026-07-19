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
    const cookies = this.parseCookies(req.headers.cookie);
    
    console.log("=================================");
console.log("URL =", req.originalUrl);
console.log("CUSTOMER COOKIE =", cookies.get("customer_session"));
console.log("ADMIN COOKIE =", cookies.get(COOKIE_NAME));
console.log("=================================");

    const sessionCookie = cookies.get(COOKIE_NAME);

    if (!sessionCookie && !cookies.get("customer_session")) {
      return null;
    }

    try {
      const adminToken = verifyAdminToken(sessionCookie);
      if (adminToken) {
        const admin = await db.getUserByEmail(adminToken.email);
        if (admin && admin.role === "admin") {
          return admin;
        }

        const syntheticAdmin: User = {
          id: adminToken.adminId,
          openId: `admin_${adminToken.adminId}`,
          name: adminToken.email.split("@")[0],
          email: adminToken.email,
          loginMethod: "admin",
          role: "admin",
          businessName: null,
          gstNumber: null,
          businessAddress: null,
          businessPhone: null,
          businessEmail: null,
          creditLimit: "0",
          usedCredit: "0",
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
    const customerSessionCookie = cookies.get("customer_session");

    if (customerSessionCookie) {
      try {
const decoded = jwt.verify(
  customerSessionCookie,
  ENV.JWT_SECRET
) as any;

        if (decoded && decoded.id) {
          const user = await db.getUserById(decoded.id);

          console.log("[AUTH USER]", user);

          if (user) {
            console.log(
              "[AUTH] Customer Logged In:",
              decoded.id,
              decoded.email
            );
            return user;
          }

          console.warn(
            "[AUTH] User not found in database:",
            decoded.id
          );
          return null;
        }
      } catch (err) {
        console.warn(
          "[Auth] Customer session verification failed",
          String(err)
        );
      }
    }

    return null;
  }
}

export const sdk = new SDKServer();

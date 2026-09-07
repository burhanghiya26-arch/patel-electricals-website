import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify } from "jose";
import jwt from "jsonwebtoken";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { verifyAdminToken } from "./adminAuth";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.JWT_SECRET);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        return null;
      }
      return { openId, appId, name };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const cookies = this.parseCookies(req.headers.cookie);
    const customerSessionCookie = cookies.get("customer_session");

    // Give a signed-in customer priority over an admin cookie in the same browser.
    if (customerSessionCookie) {
      try {
        const decoded = jwt.verify(customerSessionCookie, ENV.JWT_SECRET) as { id?: number };
        if (decoded?.id) {
          const user = await db.getUserById(decoded.id);
          if (user) return user;
        }
      } catch {
        // An expired or invalid customer cookie is expected; treat it as signed out.
      }
    }

    // Check the admin session only when no valid customer session was found.
    const sessionCookie = cookies.get(COOKIE_NAME);
    if (!sessionCookie) return null;

    try {
      const adminToken = verifyAdminToken(sessionCookie);
      if (adminToken) {
        const admin = await db.getUserByEmail(adminToken.email);
        if (admin && admin.role === "admin") return admin;

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
    } catch {
      // An expired or invalid admin cookie is expected; treat it as signed out.
    }

    return null;
  }
}

export const sdk = new SDKServer();

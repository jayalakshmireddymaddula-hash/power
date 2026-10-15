import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { AppError } from "./error-handler.js";
import { OrgRole } from "@flowpilot/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface ActiveMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organizationId?: string;
      member?: ActiveMembership;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization token");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      throw new AppError(401, "UNAUTHORIZED", "Session expired or invalid token");
    }

    // Fetch user from DB
    const user = await db.queryOne<{
      id: string;
      email: string;
      full_name: string;
      avatar_url: string | null;
    }>("SELECT id, email, full_name, avatar_url FROM users WHERE id = ?", [payload.userId]);

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "User account not found");
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
    };

    // Resolve Organization
    const requestedOrgId = (req.headers["x-organization-id"] as string) || payload.organizationId;

    let member: {
      id: string;
      organization_id: string;
      user_id: string;
      role: OrgRole;
      status: string;
    } | null = null;

    if (requestedOrgId) {
      member = await db.queryOne(
        "SELECT id, organization_id, user_id, role, status FROM organization_members WHERE organization_id = ? AND user_id = ? AND status = 'active'",
        [requestedOrgId, user.id]
      );
    } else {
      // Pick first active organization membership
      member = await db.queryOne(
        "SELECT id, organization_id, user_id, role, status FROM organization_members WHERE user_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1",
        [user.id]
      );
    }

    if (member) {
      req.organizationId = member.organization_id;
      req.member = {
        id: member.id,
        organizationId: member.organization_id,
        userId: member.user_id,
        role: member.role,
        status: member.status,
      };
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireOrganization(req: Request, _res: Response, next: NextFunction) {
  if (!req.organizationId || !req.member) {
    return next(new AppError(403, "NO_ACTIVE_ORGANIZATION", "Active organization membership is required for this operation"));
  }
  next();
}

import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { hashPassword, comparePassword, signToken } from "../lib/auth.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { signupSchema, loginSchema } from "@flowpilot/shared";

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = signupSchema.parse(req.body);

      // Check if email already registered
      const existing = await db.queryOne("SELECT id FROM users WHERE email = ?", [data.email]);
      if (existing) {
        throw new AppError(409, "USER_EXISTS", "A user account with this email already exists.");
      }

      const userId = uuidv4();
      const passwordHash = await hashPassword(data.password);

      await db.execute(
        "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)",
        [userId, data.email, passwordHash, data.fullName]
      );

      // If organization name provided, create organization automatically
      let organizationId: string | undefined;
      if (data.organizationName) {
        organizationId = uuidv4();
        const slug = data.organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 50);

        await db.execute(
          "INSERT INTO organizations (id, name, slug, created_by) VALUES (?, ?, ?, ?)",
          [organizationId, data.organizationName, `${slug}-${uuidv4().slice(0, 4)}`, userId]
        );

        await db.execute(
          "INSERT INTO organization_members (id, organization_id, user_id, role, status) VALUES (?, ?, ?, 'owner', 'active')",
          [uuidv4(), organizationId, userId]
        );
      }

      const token = signToken({
        userId,
        email: data.email,
        organizationId,
      });

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: userId,
            email: data.email,
            fullName: data.fullName,
            organizationId,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);

      const user = await db.queryOne<{
        id: string;
        email: string;
        password_hash: string;
        full_name: string;
        avatar_url: string | null;
      }>("SELECT id, email, password_hash, full_name, avatar_url FROM users WHERE email = ?", [data.email]);

      if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email address or password.");
      }

      const validPassword = await comparePassword(data.password, user.password_hash);
      if (!validPassword) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email address or password.");
      }

      // Fetch user's active organizations
      const members = await db.query<{
        organization_id: string;
        name: string;
        role: string;
      }>(
        `SELECT om.organization_id, o.name, om.role 
         FROM organization_members om 
         JOIN organizations o ON o.id = om.organization_id 
         WHERE om.user_id = ? AND om.status = 'active'
         ORDER BY om.created_at ASC`,
        [user.id]
      );

      const activeOrg = members.length > 0 ? members[0] : null;

      const token = signToken({
        userId: user.id,
        email: user.email,
        organizationId: activeOrg?.organization_id,
        role: activeOrg?.role,
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
          },
          organizations: members.map((m) => ({
            id: m.organization_id,
            name: m.name,
            role: m.role,
          })),
          activeOrganization: activeOrg
            ? {
                id: activeOrg.organization_id,
                name: activeOrg.name,
                role: activeOrg.role,
              }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
      }

      const members = await db.query<{
        organization_id: string;
        name: string;
        role: string;
      }>(
        `SELECT om.organization_id, o.name, om.role 
         FROM organization_members om 
         JOIN organizations o ON o.id = om.organization_id 
         WHERE om.user_id = ? AND om.status = 'active'
         ORDER BY om.created_at ASC`,
        [req.user.id]
      );

      const activeOrg = members.find((m) => m.organization_id === req.organizationId) || members[0] || null;

      return res.json({
        success: true,
        data: {
          user: req.user,
          organizations: members.map((m) => ({
            id: m.organization_id,
            name: m.name,
            role: m.role,
          })),
          activeOrganization: activeOrg
            ? {
                id: activeOrg.organization_id,
                name: activeOrg.name,
                role: activeOrg.role,
              }
            : null,
          role: req.member?.role || activeOrg?.role || "member",
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

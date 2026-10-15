import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { createOrganizationSchema, updateOrganizationSchema, inviteMemberSchema, updateMemberRoleSchema } from "@flowpilot/shared";

export const organizationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
      const data = createOrganizationSchema.parse(req.body);

      const orgId = uuidv4();
      const slug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, "-")) + `-${uuidv4().slice(0, 4)}`;

      await db.execute(
        "INSERT INTO organizations (id, name, slug, settings, created_by) VALUES (?, ?, ?, ?, ?)",
        [orgId, data.name, slug, JSON.stringify(data.settings), req.user.id]
      );

      // Add user as owner
      await db.execute(
        "INSERT INTO organization_members (id, organization_id, user_id, role, status) VALUES (?, ?, ?, 'owner', 'active')",
        [uuidv4(), orgId, req.user.id]
      );

      const org = await db.queryOne("SELECT * FROM organizations WHERE id = ?", [orgId]);

      return res.status(201).json({
        success: true,
        data: org,
      });
    } catch (err) {
      next(err);
    }
  },

  async current(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "No active organization specified");

      const org = await db.queryOne("SELECT * FROM organizations WHERE id = ?", [req.organizationId]);
      if (!org) throw new AppError(404, "NOT_FOUND", "Organization not found");

      return res.json({
        success: true,
        data: {
          ...org,
          settings: typeof org.settings === "string" ? JSON.parse(org.settings) : org.settings,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "No active organization specified");
      const data = updateOrganizationSchema.parse(req.body);

      const updates: string[] = [];
      const args: any[] = [];

      if (data.name) {
        updates.push("name = ?");
        args.push(data.name);
      }
      if (data.settings) {
        updates.push("settings = ?");
        args.push(JSON.stringify(data.settings));
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        args.push(req.organizationId);
        await db.execute(`UPDATE organizations SET ${updates.join(", ")} WHERE id = ?`, args);
      }

      const updated = await db.queryOne("SELECT * FROM organizations WHERE id = ?", [req.organizationId]);
      return res.json({
        success: true,
        data: {
          ...updated,
          settings: typeof updated.settings === "string" ? JSON.parse(updated.settings) : updated.settings,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async members(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "No active organization specified");

      const members = await db.query<{
        id: string;
        organization_id: string;
        user_id: string;
        role: string;
        status: string;
        joined_at: string | null;
        created_at: string;
        full_name: string;
        email: string;
      }>(
        `SELECT om.id, om.organization_id, om.user_id, om.role, om.status, om.joined_at, om.created_at,
                u.full_name, u.email
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.organization_id = ?
         ORDER BY om.created_at ASC`,
        [req.organizationId]
      );

      return res.json({
        success: true,
        data: members.map((m) => ({
          id: m.id,
          organizationId: m.organization_id,
          userId: m.user_id,
          role: m.role,
          status: m.status,
          joinedAt: m.joined_at,
          createdAt: m.created_at,
          user: {
            id: m.user_id,
            fullName: m.full_name,
            email: m.email,
          },
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "No active organization specified");
      const data = inviteMemberSchema.parse(req.body);

      // Find or create user
      let user = await db.queryOne<{ id: string }>("SELECT id FROM users WHERE email = ?", [data.email]);
      if (!user) {
        const newUserId = uuidv4();
        await db.execute(
          "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, 'temp_hash', ?)",
          [newUserId, data.email, data.email.split("@")[0]]
        );
        user = { id: newUserId };
      }

      // Check if already member
      const existing = await db.queryOne(
        "SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?",
        [req.organizationId, user.id]
      );
      if (existing) {
        throw new AppError(409, "MEMBER_EXISTS", "User is already a member of this organization.");
      }

      const memberId = uuidv4();
      await db.execute(
        "INSERT INTO organization_members (id, organization_id, user_id, role, status, invited_by) VALUES (?, ?, ?, ?, 'active', ?)",
        [memberId, req.organizationId, user.id, data.role, req.user.id]
      );

      return res.status(201).json({
        success: true,
        data: {
          id: memberId,
          organizationId: req.organizationId,
          userId: user.id,
          role: data.role,
          status: "active",
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "No active organization specified");
      const { memberId } = req.params;
      const data = updateMemberRoleSchema.parse(req.body);

      // Verify member belongs to this organization
      const member = await db.queryOne(
        "SELECT id, user_id, role FROM organization_members WHERE id = ? AND organization_id = ?",
        [memberId, req.organizationId]
      );
      if (!member) throw new AppError(404, "NOT_FOUND", "Organization member not found");

      await db.execute(
        "UPDATE organization_members SET role = ?, status = COALESCE(?, status) WHERE id = ?",
        [data.role, data.status || null, memberId]
      );

      return res.json({
        success: true,
        data: {
          id: memberId,
          role: data.role,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

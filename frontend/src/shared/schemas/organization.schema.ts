import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const orgRoleEnum = z.enum(["owner", "admin", "manager", "approver", "member"]);
export type OrgRole = z.infer<typeof orgRoleEnum>;

export const memberStatusEnum = z.enum(["invited", "active", "suspended"]);
export type MemberStatus = z.infer<typeof memberStatusEnum>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
  settings: z
    .object({
      defaultCurrency: z.string().default("INR"),
      allowSelfApproval: z.boolean().default(false),
      autoRemindOverdueHours: z.number().int().min(1).max(168).default(24),
      baselineManualMinutes: z.record(z.string(), z.number()).default({
        procurement: 120,
        hr: 90,
        operations: 60,
        document_processing: 45,
        default: 60,
      }),
    })
    .default({
      defaultCurrency: "INR",
      allowSelfApproval: false,
      autoRemindOverdueHours: 24,
      baselineManualMinutes: {
        procurement: 120,
        hr: 90,
        operations: 60,
        document_processing: 45,
        default: 60,
      },
    }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = createOrganizationSchema.partial();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  role: orgRoleEnum.default("member"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: orgRoleEnum,
  status: memberStatusEnum.optional(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const organizationMemberSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  role: orgRoleEnum,
  status: memberStatusEnum,
  joinedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  user: z
    .object({
      id: uuidSchema,
      email: z.string().email(),
      fullName: z.string(),
    })
    .optional(),
});

export type OrganizationMember = z.infer<typeof organizationMemberSchema>;

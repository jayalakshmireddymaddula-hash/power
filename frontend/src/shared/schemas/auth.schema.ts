import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  organizationName: z.string().trim().min(2).max(120).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

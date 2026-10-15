import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config.js";

export interface TokenPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
}

export function signToken(payload: TokenPayload, expiresIn: string = "7d"): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

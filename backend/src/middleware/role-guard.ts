import { Request, Response, NextFunction } from "express";
import { OrgRole } from "@flowpilot/shared";
import { AppError } from "./error-handler.js";

export function requireRole(allowedRoles: OrgRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.member) {
      return next(new AppError(403, "FORBIDDEN", "Organization membership required"));
    }

    if (!allowedRoles.includes(req.member.role)) {
      return next(
        new AppError(
          403,
          "INSUFFICIENT_PERMISSIONS",
          `Role '${req.member.role}' is not authorized. Required: ${allowedRoles.join(", ")}`
        )
      );
    }

    next();
  };
}

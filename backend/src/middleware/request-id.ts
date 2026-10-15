import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      id: string;
      correlationId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers["x-request-id"] as string) || uuidv4();
  const corrId = (req.headers["x-correlation-id"] as string) || reqId;

  req.id = reqId;
  req.correlationId = corrId;

  res.setHeader("X-Request-ID", reqId);
  res.setHeader("X-Correlation-ID", corrId);

  next();
}

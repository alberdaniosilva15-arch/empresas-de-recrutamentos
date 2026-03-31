import { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "../firebase-admin";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found in database" });
    }

    const userData = userDoc.data();
    (req as any).user = { ...decodedToken, ...userData };
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

export const addCorrelationId = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers["x-correlation-id"] || `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId as string);
  next();
};

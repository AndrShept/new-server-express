import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Request, Response, NextFunction } from "express";

export const databaseErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof PrismaClientKnownRequestError) {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err.message,
    });
  }
  next(err);
};

import { ZodSchema, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next(); 
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error); // Передаємо помилку в errorHandler
      }
      return res.status(500).json({ message: "Unexpected error" });
    }
  };

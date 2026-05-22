import type { Request, Response } from "express";
export const reviewController = { list: (_req: Request, res: Response) => res.json({ data: [], module: "review" }) };

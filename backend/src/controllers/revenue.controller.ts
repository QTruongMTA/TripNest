import type { Request, Response } from "express";
import { revenueService } from "../services/revenue.service";

export const revenueController = {
  async getHostRevenue(req: Request, res: Response) {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const result = await revenueService.getHostRevenue(req.user!.id, month);
    return res.json({ data: result });
  },
};

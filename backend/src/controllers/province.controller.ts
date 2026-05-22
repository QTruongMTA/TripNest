import type { Request, Response } from "express";
import { provinceService } from "../services/province.service";

export const provinceController = {
  async list(_req: Request, res: Response) {
    const provinces = await provinceService.listAll();
    return res.json({ data: provinces });
  },

  async listAvailable(_req: Request, res: Response) {
    const provinces = await provinceService.listAvailable();
    return res.json({ data: provinces });
  },

  async get(req: Request, res: Response) {
    const province = await provinceService.findById(req.params.id as string);
    if (!province) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Province not found" } });
    return res.json({ data: province });
  },

  async create(req: Request, res: Response) {
    const { name, code, type } = req.body ?? {};
    if (!name || !code) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "name and code are required" } });
    }
    try {
      const province = await provinceService.create({ name, code, type: type ?? "TINH" });
      return res.status(201).json({ data: province });
    } catch {
      return res.status(400).json({ error: { code: "ALREADY_EXISTS", message: "Province name or code already exists" } });
    }
  },

  async update(req: Request, res: Response) {
    const province = await provinceService.update(req.params.id as string, req.body ?? {});
    return res.json({ data: province });
  },

  async delete(req: Request, res: Response) {
    try {
      await provinceService.delete(req.params.id as string);
      return res.json({ data: { success: true } });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "PROVINCE_HAS_OPERATOR") {
        return res.status(400).json({ error: { code: "PROVINCE_HAS_OPERATOR", message: "Cannot delete province with assigned operator" } });
      }
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Province not found" } });
    }
  },
};

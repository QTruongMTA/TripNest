import type { Response } from "express";
export function successResponse(res: Response, data: unknown, message = "OK") { return res.json({ success: true, data, message }); }

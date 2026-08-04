import type { Request, Response } from "express";
import { getActiveHomeBanners } from "./home-banners.service.js";

export async function listHomeBannersController(_req: Request, res: Response): Promise<void> {
  const banners = await getActiveHomeBanners();
  res.json({ data: banners });
}

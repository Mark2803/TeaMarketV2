import { apiRequest } from "./client";
import type { HomeBannersResponse } from "../types/home-banner";
export function getHomeBanners(): Promise<HomeBannersResponse> { return apiRequest<HomeBannersResponse>("/home-banners"); }

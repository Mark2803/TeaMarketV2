import { useQuery } from "@tanstack/react-query";
import { getHomeBanners } from "../api/home-banners";
export function useHomeBanners() { return useQuery({ queryKey: ["home-banners"], queryFn: getHomeBanners }); }

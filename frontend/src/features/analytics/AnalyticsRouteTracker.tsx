import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "./analytics";
export default function AnalyticsRouteTracker(){const location=useLocation();useEffect(()=>{if(!location.pathname.startsWith("/admin")){trackAnalyticsEvent("page_view",{path:location.pathname+location.search});}},[location.pathname,location.search]);return null;}

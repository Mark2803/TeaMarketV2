/** Local-only, process-memory preview. Never writes shipment/order tables. */
export const trackingSimulationEnabled = () => process.env.NODE_ENV !== "production" && process.env.TRACKING_SIMULATION_ENABLED === "true";
const steps = [
  ["CREATED", "РћС‚РїСЂР°РІР»РµРЅРёРµ РѕС„РѕСЂРјР»РµРЅРѕ"],
  ["HANDED_OVER", "РџРµСЂРµРґР°РЅРѕ РІ РџР’Р— РЇРЅРґРµРєСЃР°"],
  ["SORTING", "РќР° СЃРѕСЂС‚РёСЂРѕРІРєРµ"],
  ["IN_TRANSIT", "Р’ РїСѓС‚Рё"],
  ["AT_PICKUP_POINT", "РџСЂРёР±С‹Р»Рѕ РІ РџР’Р— РЅР°Р·РЅР°С‡РµРЅРёСЏ"],
  ["DELIVERED", "РџРѕР»СѓС‡РµРЅРѕ РїРѕРєСѓРїР°С‚РµР»РµРј"],
] as const;
type Simulation = { status: string; updatedAt: string; events: {status:string;timestamp:string}[] };
const simulations = new Map<string, Simulation>();
export function getSimulatedTracking(orderNumber:string): Simulation | null { return simulations.get(orderNumber) ?? null; }
export function setSimulatedTracking(orderNumber:string, stage:number): Simulation | null {
  if (stage === -1) { simulations.delete(orderNumber); return null; }
  if (!Number.isInteger(stage) || stage < 0 || stage >= steps.length) throw new Error("INVALID_STAGE");
  const now=Date.now();
  const events=steps.slice(0,stage+1).map(([status],i)=>({status,timestamp:new Date(now-(stage-i)*3600000).toISOString()})).reverse();
  const result={status:steps[stage]![0],updatedAt:new Date(now).toISOString(),events};
  simulations.set(orderNumber,result);
  return result;
}


import { createContext,useCallback,useContext,useEffect,useMemo,useState } from "react";
import type { PropsWithChildren } from "react";
import { useAuth } from "../auth/AuthProvider";
import { createCustomerAddress,deleteCustomerAddress,getCustomerAddresses,updateCustomerAddress } from "../../shared/api/customer-addresses";
import type { CustomerAddressApi } from "../../shared/api/customer-addresses";
import type { CourierAddress,DeliveryContextValue,DeliveryLocationType,DeliveryState } from "./delivery.types";

const EMPTY:DeliveryState={locations:[],preferredType:"courier",isLoading:false,error:null};
const C=createContext<DeliveryContextValue|null>(null);
function map(a:CustomerAddressApi):CourierAddress{return {id:a.id,type:"courier",label:a.address_name,recipient:{name:a.recipient_name,phone:a.phone},region:a.region??"",city:a.city,street:a.street,house:a.house,apartment:a.apartment??"",postalCode:a.postal_code??"",comment:a.comment??"",isDefault:a.is_default};}
export default function DeliveryProvider({children}:PropsWithChildren){
 const {session}=useAuth(); const [state,setState]=useState<DeliveryState>(EMPTY);
 const refresh=useCallback(async()=>{ if(!session.isAuthenticated){setState(EMPTY);return;} setState(s=>({...s,isLoading:true,error:null})); try{const r=await getCustomerAddresses();setState(s=>({...s,locations:r.data.map(map),isLoading:false,error:null}));}catch(e){setState(s=>({...s,isLoading:false,error:e instanceof Error?e.message:"Ошибка загрузки адресов"}));}},[session.isAuthenticated]);
 useEffect(()=>{void refresh();},[refresh,session.user?.id]);
 const addCourierAddress=useCallback(async(a:Omit<CourierAddress,"id"|"isDefault">)=>{await createCustomerAddress({addressName:a.label,recipientName:a.recipient.name,phone:a.recipient.phone,region:a.region||null,city:a.city,street:a.street,house:a.house,apartment:a.apartment||null,postalCode:a.postalCode||null,comment:a.comment||null});await refresh();},[refresh]);
 const updateCourierAddress=useCallback(async(id:string,a:Partial<Omit<CourierAddress,"id"|"type">>)=>{await updateCustomerAddress(id,{...(a.label!==undefined?{addressName:a.label}:{}),...(a.recipient!==undefined?{recipientName:a.recipient.name,phone:a.recipient.phone}:{}),...(a.region!==undefined?{region:a.region||null}:{}),...(a.city!==undefined?{city:a.city}:{}),...(a.street!==undefined?{street:a.street}:{}),...(a.house!==undefined?{house:a.house}:{}),...(a.apartment!==undefined?{apartment:a.apartment||null}:{}),...(a.postalCode!==undefined?{postalCode:a.postalCode||null}:{}),...(a.comment!==undefined?{comment:a.comment||null}:{}),...(a.isDefault!==undefined?{isDefault:a.isDefault}:{})});await refresh();},[refresh]);
 const removeLocation=useCallback(async(id:string)=>{await deleteCustomerAddress(id);await refresh();},[refresh]);
 const setDefaultLocation=useCallback(async(id:string)=>{await updateCustomerAddress(id,{isDefault:true});await refresh();},[refresh]);
 const setPreferredType=useCallback((type:DeliveryLocationType)=>setState(s=>({...s,preferredType:type})),[]);
 const value=useMemo(()=>({state,refresh,addCourierAddress,updateCourierAddress,removeLocation,setDefaultLocation,setPreferredType}),[state,refresh,addCourierAddress,updateCourierAddress,removeLocation,setDefaultLocation,setPreferredType]);
 return <C.Provider value={value}>{children}</C.Provider>;
}
export function useDelivery(){const c=useContext(C);if(!c)throw new Error("useDelivery должен использоваться внутри DeliveryProvider.");return c;}

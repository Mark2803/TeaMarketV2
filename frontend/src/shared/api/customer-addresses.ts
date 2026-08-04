import { apiRequest } from "./client";
import { getAuthHeaders } from "../../features/auth/auth.storage";

export type CustomerAddressApi = {
  id:string; address_name:string; recipient_name:string; phone:string; region:string|null;
  city:string; street:string; house:string; apartment:string|null; postal_code:string|null;
  comment:string|null; is_default:boolean; created_at:string; updated_at:string;
};
export type CustomerAddressInput = {
  addressName:string; recipientName:string; phone:string; region?:string|null; city:string; street:string; house:string; apartment?:string|null; postalCode?:string|null; comment?:string|null; isDefault?:boolean;
};
type One={data:CustomerAddressApi}; type Many={data:CustomerAddressApi[]};
export const getCustomerAddresses=()=>apiRequest<Many>("/customer-addresses",{headers:getAuthHeaders()});
export const createCustomerAddress=(body:CustomerAddressInput)=>apiRequest<One>("/customer-addresses",{method:"POST",headers:getAuthHeaders(),body:JSON.stringify(body)});
export const updateCustomerAddress=(id:string,body:Partial<CustomerAddressInput>)=>apiRequest<One>(`/customer-addresses/${encodeURIComponent(id)}`,{method:"PATCH",headers:getAuthHeaders(),body:JSON.stringify(body)});
export const deleteCustomerAddress=(id:string)=>apiRequest<void>(`/customer-addresses/${encodeURIComponent(id)}`,{method:"DELETE",headers:getAuthHeaders()});

import type {
  DeliveryLocationType
} from "./delivery.types";

export type DeliveryProviderId =
  | "cdek"
  | "fivepost"
  | "ozon"
  | string;

export interface DeliveryProvider {
  id: DeliveryProviderId;
  name: string;
  isActive: boolean;
}

export interface DeliveryTariff {
  id: string;
  providerId: DeliveryProviderId;
  providerName: string;
  locationType: DeliveryLocationType;
  name: string;
  description: string;
  price: number;
  currency: "RUB";
  minDays: number;
  maxDays: number;
}

export interface DeliveryCalculation {
  providerId: DeliveryProviderId;
  tariffId: string;
  price: number;
  currency: "RUB";
  minDays: number;
  maxDays: number;
  calculatedAt: string;
}

export interface DeliveryPickupPoint {
  id: string;
  providerId: DeliveryProviderId;
  providerPointId: string;
  name: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

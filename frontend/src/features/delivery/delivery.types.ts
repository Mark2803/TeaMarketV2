export type DeliveryLocationType = "courier" | "pickup-point";

export interface DeliveryRecipient {
  name: string;
  phone: string;
}

export interface DeliveryLocationBase {
  id: string;
  type: DeliveryLocationType;
  label: string;
  recipient: DeliveryRecipient;
  isDefault: boolean;
}

export interface CourierAddress extends DeliveryLocationBase {
  type: "courier";
  region: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  postalCode: string;
  comment: string;
}

export interface PickupPointAddress extends DeliveryLocationBase {
  type: "pickup-point";
  provider: string;
  providerPointId: string;
  city: string;
  address: string;
}

export type DeliveryLocation = CourierAddress | PickupPointAddress;

export interface DeliveryState {
  locations: DeliveryLocation[];
  preferredType: DeliveryLocationType;
  isLoading: boolean;
  error: string | null;
}

export interface DeliveryContextValue {
  state: DeliveryState;
  refresh: () => Promise<void>;
  addCourierAddress: (
    address: Omit<CourierAddress, "id" | "isDefault">
  ) => Promise<void>;
  updateCourierAddress: (
    id: string,
    address: Partial<Omit<CourierAddress, "id" | "type">>
  ) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  setDefaultLocation: (id: string) => Promise<void>;
  setPreferredType: (type: DeliveryLocationType) => void;
}

export type AuthStep =
  | "phone"
  | "code"
  | "profile-details"
  | "profile";

export type ConfirmCodeResult =
  | "profile-details"
  | "profile";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  email: string;
  username: string | null;
  profileCompleted: boolean;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

export interface ProfileDetails {
  name: string;
  email: string;
}

export interface AuthContextValue {
  session: AuthSession;
  step: AuthStep;
  pendingPhone: string;
  isInitializing: boolean;
  requestCode: (phone: string) => Promise<void>;
  confirmCode: (code: string) => Promise<ConfirmCodeResult>;
  completeProfile: (details: ProfileDetails) => Promise<void>;
  updateProfile: (details: ProfileDetails) => Promise<void>;
  logout: () => Promise<void>;
  resetAuthFlow: () => void;
}

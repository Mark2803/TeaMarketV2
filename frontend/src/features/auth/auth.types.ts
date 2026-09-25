export type AuthStep =
  | "email"
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
  emailMarketing: boolean;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

export interface ProfileDetails {
  name: string;
  email: string;
  phone: string;
  username: string;
  emailMarketing: boolean;
}

export interface AuthContextValue {
  session: AuthSession;
  step: AuthStep;
  pendingEmail: string;
  isInitializing: boolean;
  requestCode: (email: string) => Promise<void>;
  confirmCode: (code: string) => Promise<ConfirmCodeResult>;
  completeProfile: (details: ProfileDetails) => Promise<void>;
  updateProfile: (details: ProfileDetails) => Promise<void>;
  logout: () => Promise<void>;
  resetAuthFlow: () => void;
}

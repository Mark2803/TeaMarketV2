import {
  apiRequest
} from "./client";

import {
  getAuthHeaders
} from "../../features/auth/auth.storage";

export interface ApiCustomer {
  id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  username: string | null;
  emailMarketing: boolean;
  created_at?: string;
  updated_at?: string;
}

interface RequestCodeResponse {
  data: {
    expiresInSeconds: number;
  };
}

interface VerifyCodeResponse {
  data: {
    token: string;
    expiresAt: string;
    customer: ApiCustomer;
  };
}

interface ProfileResponse {
  data: ApiCustomer;
}

interface LogoutResponse {
  data: {
    success: boolean;
  };
}

export function requestAuthCode(email: string): Promise<RequestCodeResponse> {
  return apiRequest<RequestCodeResponse>("/auth/request-code", {
    method: "POST", body: JSON.stringify({ email })
  });
}

export function verifyAuthCode(email: string, code: string): Promise<VerifyCodeResponse> {
  return apiRequest<VerifyCodeResponse>("/auth/verify-code", {
    method: "POST", body: JSON.stringify({ email, code })
  });
}

export function getMyProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    "/profile/me",
    {
      headers: getAuthHeaders()
    }
  );
}

export function updateMyProfile(
  data: {
    name: string;
    email: string | null;
    phone: string | null;
    username: string | null;
    emailMarketing: boolean;
  }
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    "/profile/me",
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }
  );
}

export function logoutSession(): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>(
    "/auth/logout",
    {
      method: "POST",
      headers: getAuthHeaders()
    }
  );
}

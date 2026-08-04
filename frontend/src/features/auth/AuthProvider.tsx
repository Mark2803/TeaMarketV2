import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  PropsWithChildren
} from "react";

import {
  getMyProfile,
  logoutSession,
  requestAuthCode,
  updateMyProfile,
  verifyAuthCode
} from "../../shared/api/auth";

import type {
  ApiCustomer
} from "../../shared/api/auth";

import {
  mergeGuestCart
} from "../../shared/api/cart";

import {
  notifyCartChanged
} from "../cart/cart.events";

import {
  rotateGuestCartToken
} from "../cart/cart.token";

import {
  clearAuthToken,
  readAuthToken,
  saveAuthToken
} from "./auth.storage";

import type {
  AuthContextValue,
  AuthSession,
  AuthStep,
  ConfirmCodeResult,
  ProfileDetails,
  AuthUser
} from "./auth.types";

const EMPTY_SESSION: AuthSession = {
  isAuthenticated: false,
  user: null
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

function normalizePhone(
  phone: string
): string {
  const digits =
    phone.replace(/\D/g, "");

  return digits
    ? `+${digits}`
    : "";
}

function mapCustomer(
  customer: ApiCustomer
): AuthUser {
  const name =
    customer.name?.trim() ?? "";

  return {
    id: customer.id,
    phone: customer.phone,
    name,
    email:
      customer.email?.trim() ?? "",
    username:
      customer.username,
    profileCompleted:
      name.length >= 2
  };
}

async function mergeCurrentGuestCart(): Promise<void> {
  try {
    await mergeGuestCart();
    rotateGuestCartToken();
    notifyCartChanged();
  } catch {
    // Авторизация не должна отменяться из-за временной ошибки корзины.
    // Текущий гостевой токен сохраняется, поэтому перенос можно повторить.
  }
}

export default function AuthProvider({
  children
}: PropsWithChildren) {
  const [session, setSession] =
    useState<AuthSession>(EMPTY_SESSION);

  const [step, setStep] =
    useState<AuthStep>("phone");

  const [pendingPhone, setPendingPhone] =
    useState("");

  const [isInitializing, setIsInitializing] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = readAuthToken();

      if (!token) {
        if (active) {
          setIsInitializing(false);
        }
        return;
      }

      try {
        const response =
          await getMyProfile();

        if (!active) {
          return;
        }

        const user =
          mapCustomer(response.data);

        setSession({
          isAuthenticated: true,
          user
        });

        setStep(
          user.profileCompleted
            ? "profile"
            : "profile-details"
        );

        await mergeCurrentGuestCart();
      } catch {
        clearAuthToken();

        if (active) {
          setSession(EMPTY_SESSION);
          setStep("phone");
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const requestCode = useCallback(
    async (phone: string) => {
      const normalizedPhone =
        normalizePhone(phone);

      if (!normalizedPhone) {
        throw new Error(
          "Введите номер телефона."
        );
      }

      await requestAuthCode(
        normalizedPhone
      );

      setPendingPhone(
        normalizedPhone
      );

      setStep("code");
    },
    []
  );

  const confirmCode = useCallback(
    async (
      code: string
    ): Promise<ConfirmCodeResult> => {
      if (!pendingPhone) {
        throw new Error(
          "Сначала запросите код подтверждения."
        );
      }

      const response =
        await verifyAuthCode(
          pendingPhone,
          code
        );

      saveAuthToken(
        response.data.token,
        response.data.expiresAt
      );

      const user =
        mapCustomer(
          response.data.customer
        );

      setSession({
        isAuthenticated: true,
        user
      });

      const nextStep:
        ConfirmCodeResult =
          user.profileCompleted
            ? "profile"
            : "profile-details";

      setStep(nextStep);

      await mergeCurrentGuestCart();

      return nextStep;
    },
    [pendingPhone]
  );

  const saveProfile = useCallback(
    async (
      details: ProfileDetails
    ) => {
      const response =
        await updateMyProfile({
          name: details.name.trim(),
          email:
            details.email.trim()
            || null
        });

      const user =
        mapCustomer(response.data);

      setSession({
        isAuthenticated: true,
        user
      });

      setStep(
        user.profileCompleted
          ? "profile"
          : "profile-details"
      );
    },
    []
  );

  const logout = useCallback(
    async () => {
      try {
        if (readAuthToken()) {
          await logoutSession();
        }
      } catch {
        // Локальная сессия всё равно должна быть очищена.
      } finally {
        clearAuthToken();
        rotateGuestCartToken();
        notifyCartChanged();
        setSession(EMPTY_SESSION);
        setPendingPhone("");
        setStep("phone");
      }
    },
    []
  );

  const resetAuthFlow = useCallback(
    () => {
      setPendingPhone("");

      if (
        !session.isAuthenticated
        || !session.user
      ) {
        setStep("phone");
        return;
      }

      setStep(
        session.user.profileCompleted
          ? "profile"
          : "profile-details"
      );
    },
    [session]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      step,
      pendingPhone,
      isInitializing,
      requestCode,
      confirmCode,
      completeProfile: saveProfile,
      updateProfile: saveProfile,
      logout,
      resetAuthFlow
    }),
    [
      session,
      step,
      pendingPhone,
      isInitializing,
      requestCode,
      confirmCode,
      saveProfile,
      logout,
      resetAuthFlow
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider."
    );
  }

  return context;
}

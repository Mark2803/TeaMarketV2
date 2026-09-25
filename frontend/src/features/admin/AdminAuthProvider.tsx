import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  getAdminSession,
  loginAdmin,
  logoutAdmin
} from "../../shared/api/admin";

type AdminAuthContextValue = {
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminSession()
      .then((session) => setUsername(session.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const session = await loginAdmin(name, password);
    setUsername(session.username);
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin().catch(() => undefined);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ username, loading, login, logout }),
    [username, loading, login, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return value;
}

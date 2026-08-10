const TOKEN_KEY = "call_audit_token";
const USER_KEY = "call_audit_user";

export interface AuthUser {
  email: string;
  is_superuser: boolean;
  client_id: number | null;
  client_name: string | null;
  department: string | null;
}

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),

  getUser: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setUser: (user: AuthUser) =>
    localStorage.setItem(USER_KEY, JSON.stringify(user)),

  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

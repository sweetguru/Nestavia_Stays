import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("nestavia_token")) return setLoading(false);
    api.get("/auth/me").then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem("nestavia_token")).finally(() => setLoading(false));
  }, []);

  const finish = (data) => {
    localStorage.setItem("nestavia_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const login = async (email, password) => finish((await api.post("/auth/login", { email, password })).data);
  const register = async (body) => finish((await api.post("/auth/register", body)).data);
  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("nestavia_token");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout, isHost: user?.role === "host" }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api.js";

const AuthContext = createContext(null);
const CLAVE_SESION = "sesion-transporte";

// Fecha de expiración (ms) que viene dentro del JWT
function expiracionDelToken(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)).exp * 1000;
  } catch {
    return 0;
  }
}

function leerSesionGuardada() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
    if (sesion && expiracionDelToken(sesion.token) > Date.now()) return sesion;
  } catch {
    // sesión corrupta: se descarta
  }
  localStorage.removeItem(CLAVE_SESION);
  return null;
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);
  const [aviso, setAviso] = useState("");

  const guardarSesion = (nueva) => {
    setSesion(nueva);
    if (nueva) localStorage.setItem(CLAVE_SESION, JSON.stringify(nueva));
    else localStorage.removeItem(CLAVE_SESION);
  };

  const logout = useCallback((mensaje = "") => {
    setAviso(mensaje);
    setSesion(null);
    localStorage.removeItem(CLAVE_SESION);
  }, []);

  // Cierra la sesión automáticamente cuando el token vence (4 horas)
  useEffect(() => {
    if (!sesion) return;
    const restante = expiracionDelToken(sesion.token) - Date.now();
    const temporizador = setTimeout(() => logout("La sesión venció, vuelva a iniciar sesión"), restante);
    return () => clearTimeout(temporizador);
  }, [sesion, logout]);

  const login = async (email, contrasena) => {
    const { usuario, token } = await api("/auth/login", { method: "POST", body: { email, contrasena } });
    setAviso("");
    guardarSesion({ usuario, token });
  };

  const registro = async (nombre, email, contrasena) => {
    const { usuario, token } = await api("/auth/registro", {
      method: "POST",
      body: { nombre, email, contrasena },
    });
    setAviso("");
    guardarSesion({ usuario, token });
  };

  // fetch autenticado: agrega el token y cierra la sesión si el servidor responde 401
  const apiAuth = useCallback(
    async (ruta, opciones = {}) => {
      try {
        return await api(ruta, { ...opciones, token: sesion?.token });
      } catch (error) {
        if (error.status === 401) logout(error.message);
        throw error;
      }
    },
    [sesion, logout]
  );

  return (
    <AuthContext.Provider value={{ sesion, usuario: sesion?.usuario, aviso, login, registro, logout, apiAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Envuelve las páginas que requieren estar autenticado
export function RutaProtegida({ children }) {
  const { sesion } = useAuth();
  const location = useLocation();
  if (!sesion) return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  return children;
}

import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./Auth.jsx";
import { Campo, Mensaje } from "./Campo.jsx";
import { validarLogin, erroresDeApi } from "./validaciones.js";

export function Login() {
  const { sesion, login, aviso } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [datos, setDatos] = useState({ email: "", contrasena: "" });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const destino = location.state?.desde || "/";
  if (sesion) return <Navigate to={destino} replace />;

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    const nuevosErrores = validarLogin(datos);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await login(datos.email.trim(), datos.contrasena);
      navigate(destino, { replace: true });
    } catch (err) {
      setErrores(erroresDeApi(err));
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel panel-chico">
      <h1>Iniciar sesión</h1>
      <Mensaje tipo="aviso">{aviso}</Mensaje>
      <Mensaje>{error}</Mensaje>
      <form onSubmit={enviar} noValidate className="formulario">
        <Campo etiqueta="Email" error={errores.email} ancho>
          <input type="email" name="email" value={datos.email} onChange={cambiar} autoComplete="email" autoFocus />
        </Campo>
        <Campo etiqueta="Contraseña" error={errores.contrasena} ancho>
          <input
            type="password"
            name="contrasena"
            value={datos.contrasena}
            onChange={cambiar}
            autoComplete="current-password"
          />
        </Campo>
        <button className="boton boton-ancho" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <p className="nota">
        ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
      </p>
    </section>
  );
}

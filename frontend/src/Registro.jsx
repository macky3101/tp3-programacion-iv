import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./Auth.jsx";
import { Campo, Mensaje } from "./Campo.jsx";
import { validarRegistro, erroresDeApi } from "./validaciones.js";

export function Registro() {
  const { sesion, registro } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState({ nombre: "", email: "", contrasena: "", confirmacion: "" });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (sesion) return <Navigate to="/" replace />;

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    const nuevosErrores = validarRegistro(datos);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await registro(datos.nombre.trim(), datos.email.trim(), datos.contrasena);
      navigate("/", { replace: true });
    } catch (err) {
      setErrores(erroresDeApi(err));
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel panel-chico">
      <h1>Crear cuenta</h1>
      <Mensaje>{error}</Mensaje>
      <form onSubmit={enviar} noValidate className="formulario">
        <Campo etiqueta="Nombre" error={errores.nombre} ancho>
          <input name="nombre" value={datos.nombre} onChange={cambiar} autoComplete="name" autoFocus />
        </Campo>
        <Campo etiqueta="Email" error={errores.email} ancho>
          <input type="email" name="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        </Campo>
        <Campo etiqueta="Contraseña" error={errores.contrasena} ancho>
          <input
            type="password"
            name="contrasena"
            value={datos.contrasena}
            onChange={cambiar}
            autoComplete="new-password"
          />
        </Campo>
        <Campo etiqueta="Repetir contraseña" error={errores.confirmacion} ancho>
          <input
            type="password"
            name="confirmacion"
            value={datos.confirmacion}
            onChange={cambiar}
            autoComplete="new-password"
          />
        </Campo>
        <p className="nota">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
        <button className="boton boton-ancho" disabled={enviando}>
          {enviando ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>
      <p className="nota">
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </section>
  );
}

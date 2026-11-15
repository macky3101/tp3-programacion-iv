import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./Auth.jsx";

export function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const cerrarSesion = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="encabezado">
        <nav className="contenedor nav">
          <NavLink to="/" className="marca">
            🚚 TransGestión
          </NavLink>
          <div className="nav-enlaces">
            <NavLink to="/" end>Inicio</NavLink>
            {usuario && (
              <>
                <NavLink to="/vehiculos">Vehículos</NavLink>
                <NavLink to="/conductores">Conductores</NavLink>
                <NavLink to="/viajes">Viajes</NavLink>
              </>
            )}
          </div>
          <div className="nav-usuario">
            {usuario ? (
              <>
                <span>{usuario.nombre}</span>
                <button className="boton boton-secundario" onClick={cerrarSesion}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Iniciar sesión</NavLink>
                <NavLink to="/registro" className="boton">
                  Registrarse
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="contenedor">
        <Outlet />
      </main>
    </>
  );
}

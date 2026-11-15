import { Link } from "react-router-dom";
import { useAuth } from "./Auth.jsx";

const secciones = [
  {
    ruta: "/vehiculos",
    titulo: "Vehículos",
    texto: "Flota de la empresa: marca, modelo, patente, año y capacidad de carga.",
  },
  {
    ruta: "/conductores",
    titulo: "Conductores",
    texto: "Datos personales y vigencia de la licencia de conducir de cada chofer.",
  },
  {
    ruta: "/viajes",
    titulo: "Viajes",
    texto: "Registro de viajes, historial por vehículo o conductor y kilómetros recorridos.",
  },
];

export function Home() {
  const { usuario } = useAuth();

  return (
    <>
      <section className="portada">
        <h1>Gestión de vehículos, conductores y viajes</h1>
        <p>
          Administrá la flota de tu empresa de transporte, sus choferes y cada viaje realizado, con el total de
          kilómetros recorridos siempre a mano.
        </p>
        {usuario ? (
          <p className="portada-saludo">Hola, {usuario.nombre}. Elegí una sección para comenzar.</p>
        ) : (
          <div className="acciones">
            <Link to="/login" className="boton">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="boton boton-secundario">
              Crear cuenta
            </Link>
          </div>
        )}
      </section>

      <section className="tarjetas">
        {secciones.map((s) => (
          <Link key={s.ruta} to={s.ruta} className="tarjeta">
            <h2>{s.titulo}</h2>
            <p>{s.texto}</p>
            {!usuario && <small>Requiere iniciar sesión</small>}
          </Link>
        ))}
      </section>
    </>
  );
}

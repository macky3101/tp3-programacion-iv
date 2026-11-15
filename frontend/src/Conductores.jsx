import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./Auth.jsx";
import { Campo, Mensaje } from "./Campo.jsx";
import { formatearFecha, formatearNumero } from "./formato.js";
import { validarConductor, erroresDeApi } from "./validaciones.js";

const VACIO = {
  nombre: "",
  apellido: "",
  dni: "",
  numero_licencia: "",
  fecha_alta_licencia: "",
  fecha_vencimiento_licencia: "",
};

// Estado de la licencia según la fecha de vencimiento
function estadoLicencia(vencimiento) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (vencimiento < hoy) return { texto: "Vencida", clase: "etiqueta-peligro" };
  const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (vencimiento <= en30Dias) return { texto: "Por vencer", clase: "etiqueta-aviso" };
  return { texto: "Vigente", clase: "etiqueta-ok" };
}

export function Conductores() {
  const { apiAuth } = useAuth();
  const [conductores, setConductores] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [formulario, setFormulario] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const filtro = buscar.trim() ? `?buscar=${encodeURIComponent(buscar.trim())}` : "";
      const { data } = await apiAuth(`/conductores${filtro}`);
      setConductores(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [apiAuth, buscar]);

  useEffect(() => {
    const espera = setTimeout(cargar, 300);
    return () => clearTimeout(espera);
  }, [cargar]);

  const abrirNuevo = () => {
    setFormulario(VACIO);
    setEditandoId(null);
    setErrores({});
    setExito("");
  };

  const abrirEdicion = (c) => {
    setFormulario({
      nombre: c.nombre,
      apellido: c.apellido,
      dni: c.dni,
      numero_licencia: c.numero_licencia,
      fecha_alta_licencia: c.fecha_alta_licencia.slice(0, 10),
      fecha_vencimiento_licencia: c.fecha_vencimiento_licencia.slice(0, 10),
    });
    setEditandoId(c.id);
    setErrores({});
    setExito("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cerrar = () => {
    setFormulario(null);
    setEditandoId(null);
    setErrores({});
  };

  const cambiar = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    const nuevosErrores = validarConductor(formulario);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const cuerpo = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      apellido: formulario.apellido.trim(),
      dni: formulario.dni.trim(),
      numero_licencia: formulario.numero_licencia.trim().toUpperCase(),
    };

    setGuardando(true);
    try {
      if (editandoId) {
        await apiAuth(`/conductores/${editandoId}`, { method: "PUT", body: cuerpo });
        setExito("Conductor modificado correctamente");
      } else {
        await apiAuth("/conductores", { method: "POST", body: cuerpo });
        setExito("Conductor registrado correctamente");
      }
      cerrar();
      cargar();
    } catch (err) {
      setErrores(erroresDeApi(err));
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar al conductor ${c.apellido}, ${c.nombre}?`)) return;
    setExito("");
    try {
      await apiAuth(`/conductores/${c.id}`, { method: "DELETE" });
      setExito("Conductor eliminado");
      if (editandoId === c.id) cerrar();
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <div className="titulo-pagina">
        <h1>Conductores</h1>
        {!formulario && (
          <button className="boton" onClick={abrirNuevo}>
            + Nuevo conductor
          </button>
        )}
      </div>

      <Mensaje>{error}</Mensaje>
      <Mensaje tipo="exito">{exito}</Mensaje>

      {formulario && (
        <form className="panel formulario" onSubmit={guardar} noValidate>
          <h2>{editandoId ? "Modificar conductor" : "Nuevo conductor"}</h2>
          <div className="grilla">
            <Campo etiqueta="Nombre" error={errores.nombre}>
              <input name="nombre" value={formulario.nombre} onChange={cambiar} maxLength={60} />
            </Campo>
            <Campo etiqueta="Apellido" error={errores.apellido}>
              <input name="apellido" value={formulario.apellido} onChange={cambiar} maxLength={60} />
            </Campo>
            <Campo etiqueta="Número de documento" error={errores.dni}>
              <input name="dni" value={formulario.dni} onChange={cambiar} inputMode="numeric" maxLength={8} />
            </Campo>
            <Campo etiqueta="Número de licencia" error={errores.numero_licencia}>
              <input name="numero_licencia" value={formulario.numero_licencia} onChange={cambiar} maxLength={20} />
            </Campo>
            <Campo etiqueta="Fecha de alta de licencia" error={errores.fecha_alta_licencia}>
              <input
                type="date"
                name="fecha_alta_licencia"
                value={formulario.fecha_alta_licencia}
                onChange={cambiar}
              />
            </Campo>
            <Campo etiqueta="Vencimiento de licencia" error={errores.fecha_vencimiento_licencia}>
              <input
                type="date"
                name="fecha_vencimiento_licencia"
                value={formulario.fecha_vencimiento_licencia}
                onChange={cambiar}
              />
            </Campo>
          </div>
          <div className="acciones">
            <button className="boton" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="boton boton-secundario" onClick={cerrar}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <input
        className="buscador"
        type="search"
        placeholder="Buscar por nombre, apellido o documento..."
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />

      {cargando ? (
        <p className="nota">Cargando...</p>
      ) : conductores.length === 0 ? (
        <p className="vacio">No hay conductores registrados.</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Apellido y nombre</th>
                <th>Documento</th>
                <th>Licencia</th>
                <th>Alta</th>
                <th>Vencimiento</th>
                <th className="num">Viajes</th>
                <th className="num">Km recorridos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conductores.map((c) => {
                const estado = estadoLicencia(c.fecha_vencimiento_licencia);
                return (
                  <tr key={c.id}>
                    <td>
                      {c.apellido}, {c.nombre}
                    </td>
                    <td>{c.dni}</td>
                    <td>{c.numero_licencia}</td>
                    <td>{formatearFecha(c.fecha_alta_licencia)}</td>
                    <td>
                      {formatearFecha(c.fecha_vencimiento_licencia)}{" "}
                      <span className={`etiqueta ${estado.clase}`}>{estado.texto}</span>
                    </td>
                    <td className="num">{c.cantidad_viajes}</td>
                    <td className="num">{formatearNumero(c.kilometros_totales)}</td>
                    <td className="acciones-fila">
                      <Link to={`/viajes?conductor_id=${c.id}`} className="boton boton-chico boton-secundario">
                        Viajes
                      </Link>
                      <button className="boton boton-chico" onClick={() => abrirEdicion(c)}>
                        Editar
                      </button>
                      <button className="boton boton-chico boton-peligro" onClick={() => eliminar(c)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

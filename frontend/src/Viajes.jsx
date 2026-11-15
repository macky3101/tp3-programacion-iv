import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "./Auth.jsx";
import { Campo, Mensaje } from "./Campo.jsx";
import { aInputFechaHora, formatearFechaHora, formatearNumero } from "./formato.js";
import { validarViaje, erroresDeApi } from "./validaciones.js";

const VACIO = {
  vehiculo_id: "",
  conductor_id: "",
  fecha_salida: "",
  fecha_llegada: "",
  origen: "",
  destino: "",
  kilometros: "",
  observaciones: "",
};

const nombreConductor = (c) => `${c.apellido}, ${c.nombre}`;
const nombreVehiculo = (v) => `${v.patente} - ${v.marca} ${v.modelo}`;

export function Viajes() {
  const { apiAuth } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const vehiculoFiltro = parametros.get("vehiculo_id") || "";
  const conductorFiltro = parametros.get("conductor_id") || "";

  const [vehiculos, setVehiculos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [totalKm, setTotalKm] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [formulario, setFormulario] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Vehículos y conductores para los selects
  useEffect(() => {
    Promise.all([apiAuth("/vehiculos"), apiAuth("/conductores")])
      .then(([v, c]) => {
        setVehiculos(v.data);
        setConductores(c.data);
      })
      .catch((err) => setError(err.message));
  }, [apiAuth]);

  const cargarViajes = useCallback(async () => {
    setCargando(true);
    try {
      const filtro = new URLSearchParams();
      if (vehiculoFiltro) filtro.set("vehiculo_id", vehiculoFiltro);
      if (conductorFiltro) filtro.set("conductor_id", conductorFiltro);
      const consulta = filtro.toString() ? `?${filtro}` : "";
      const respuesta = await apiAuth(`/viajes${consulta}`);
      setViajes(respuesta.data);
      setTotalKm(respuesta.kilometros_totales);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [apiAuth, vehiculoFiltro, conductorFiltro]);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  const cambiarFiltro = (campo, valor) => {
    const nuevos = new URLSearchParams(parametros);
    if (valor) nuevos.set(campo, valor);
    else nuevos.delete(campo);
    setParametros(nuevos);
  };

  const abrirNuevo = () => {
    // Si se está viendo el historial de un vehículo o conductor, se preselecciona
    setFormulario({ ...VACIO, vehiculo_id: vehiculoFiltro, conductor_id: conductorFiltro });
    setEditandoId(null);
    setErrores({});
    setExito("");
  };

  const abrirEdicion = (v) => {
    setFormulario({
      vehiculo_id: String(v.vehiculo_id),
      conductor_id: String(v.conductor_id),
      fecha_salida: aInputFechaHora(v.fecha_salida),
      fecha_llegada: aInputFechaHora(v.fecha_llegada),
      origen: v.origen,
      destino: v.destino,
      kilometros: String(Number(v.kilometros)),
      observaciones: v.observaciones || "",
    });
    setEditandoId(v.id);
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
    const nuevosErrores = validarViaje(formulario);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const cuerpo = {
      vehiculo_id: Number(formulario.vehiculo_id),
      conductor_id: Number(formulario.conductor_id),
      fecha_salida: formulario.fecha_salida,
      fecha_llegada: formulario.fecha_llegada,
      origen: formulario.origen.trim(),
      destino: formulario.destino.trim(),
      kilometros: Number(formulario.kilometros),
      observaciones: formulario.observaciones.trim() || null,
    };

    setGuardando(true);
    try {
      if (editandoId) {
        await apiAuth(`/viajes/${editandoId}`, { method: "PUT", body: cuerpo });
        setExito("Viaje modificado correctamente");
      } else {
        await apiAuth("/viajes", { method: "POST", body: cuerpo });
        setExito("Viaje registrado correctamente");
      }
      cerrar();
      cargarViajes();
    } catch (err) {
      setErrores(erroresDeApi(err));
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (v) => {
    if (!window.confirm(`¿Eliminar el viaje ${v.origen} → ${v.destino}?`)) return;
    setExito("");
    try {
      await apiAuth(`/viajes/${v.id}`, { method: "DELETE" });
      setExito("Viaje eliminado");
      if (editandoId === v.id) cerrar();
      cargarViajes();
    } catch (err) {
      setError(err.message);
    }
  };

  const vehiculoSeleccionado = vehiculos.find((v) => String(v.id) === vehiculoFiltro);
  const conductorSeleccionado = conductores.find((c) => String(c.id) === conductorFiltro);
  const faltanDatos = vehiculos.length === 0 || conductores.length === 0;

  let tituloHistorial = "Todos los viajes";
  if (vehiculoSeleccionado && conductorSeleccionado)
    tituloHistorial = `${nombreVehiculo(vehiculoSeleccionado)} con ${nombreConductor(conductorSeleccionado)}`;
  else if (vehiculoSeleccionado) tituloHistorial = `Vehículo ${nombreVehiculo(vehiculoSeleccionado)}`;
  else if (conductorSeleccionado) tituloHistorial = `Conductor ${nombreConductor(conductorSeleccionado)}`;

  return (
    <section>
      <div className="titulo-pagina">
        <h1>Viajes</h1>
        {!formulario && (
          <button className="boton" onClick={abrirNuevo} disabled={faltanDatos}>
            + Registrar viaje
          </button>
        )}
      </div>

      {faltanDatos && (
        <Mensaje tipo="aviso">
          Para registrar viajes necesitás al menos un <Link to="/vehiculos">vehículo</Link> y un{" "}
          <Link to="/conductores">conductor</Link>.
        </Mensaje>
      )}
      <Mensaje>{error}</Mensaje>
      <Mensaje tipo="exito">{exito}</Mensaje>

      {formulario && (
        <form className="panel formulario" onSubmit={guardar} noValidate>
          <h2>{editandoId ? "Modificar viaje" : "Registrar viaje"}</h2>
          <div className="grilla">
            <Campo etiqueta="Vehículo" error={errores.vehiculo_id}>
              <select name="vehiculo_id" value={formulario.vehiculo_id} onChange={cambiar}>
                <option value="">Seleccionar...</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {nombreVehiculo(v)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Conductor" error={errores.conductor_id}>
              <select name="conductor_id" value={formulario.conductor_id} onChange={cambiar}>
                <option value="">Seleccionar...</option>
                {conductores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nombreConductor(c)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Fecha y hora de salida" error={errores.fecha_salida}>
              <input type="datetime-local" name="fecha_salida" value={formulario.fecha_salida} onChange={cambiar} />
            </Campo>
            <Campo etiqueta="Fecha y hora de llegada" error={errores.fecha_llegada}>
              <input type="datetime-local" name="fecha_llegada" value={formulario.fecha_llegada} onChange={cambiar} />
            </Campo>
            <Campo etiqueta="Origen" error={errores.origen}>
              <input name="origen" value={formulario.origen} onChange={cambiar} maxLength={100} />
            </Campo>
            <Campo etiqueta="Destino" error={errores.destino}>
              <input name="destino" value={formulario.destino} onChange={cambiar} maxLength={100} />
            </Campo>
            <Campo etiqueta="Kilómetros" error={errores.kilometros}>
              <input
                type="number"
                name="kilometros"
                value={formulario.kilometros}
                onChange={cambiar}
                min={0}
                step="0.1"
              />
            </Campo>
            <Campo etiqueta="Observaciones (opcional)" error={errores.observaciones} ancho>
              <textarea
                name="observaciones"
                value={formulario.observaciones}
                onChange={cambiar}
                rows={2}
                maxLength={500}
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

      <div className="panel filtros">
        <h2>Historial de viajes</h2>
        <div className="grilla">
          <Campo etiqueta="Filtrar por vehículo">
            <select value={vehiculoFiltro} onChange={(e) => cambiarFiltro("vehiculo_id", e.target.value)}>
              <option value="">Todos los vehículos</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {nombreVehiculo(v)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Filtrar por conductor">
            <select value={conductorFiltro} onChange={(e) => cambiarFiltro("conductor_id", e.target.value)}>
              <option value="">Todos los conductores</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreConductor(c)}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {(vehiculoFiltro || conductorFiltro) && (
          <button className="boton boton-chico boton-secundario" onClick={() => setParametros({})}>
            Quitar filtros
          </button>
        )}
      </div>

      <div className="resumen">
        <div>
          <span>Mostrando</span>
          <strong>{tituloHistorial}</strong>
        </div>
        <div>
          <span>Viajes</span>
          <strong>{viajes.length}</strong>
        </div>
        <div>
          <span>Kilómetros totales</span>
          <strong>{formatearNumero(totalKm)} km</strong>
        </div>
      </div>

      {cargando ? (
        <p className="nota">Cargando...</p>
      ) : viajes.length === 0 ? (
        <p className="vacio">No hay viajes para mostrar.</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Salida</th>
                <th>Llegada</th>
                <th>Recorrido</th>
                <th>Vehículo</th>
                <th>Conductor</th>
                <th className="num">Km</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {viajes.map((v) => (
                <tr key={v.id}>
                  <td>{formatearFechaHora(v.fecha_salida)}</td>
                  <td>{formatearFechaHora(v.fecha_llegada)}</td>
                  <td>
                    {v.origen} → {v.destino}
                  </td>
                  <td>
                    <span className="patente">{v.patente}</span> {v.marca} {v.modelo}
                  </td>
                  <td>
                    {v.conductor_apellido}, {v.conductor_nombre}
                  </td>
                  <td className="num">{formatearNumero(v.kilometros)}</td>
                  <td className="observaciones">{v.observaciones}</td>
                  <td className="acciones-fila">
                    <button className="boton boton-chico" onClick={() => abrirEdicion(v)}>
                      Editar
                    </button>
                    <button className="boton boton-chico boton-peligro" onClick={() => eliminar(v)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./Auth.jsx";
import { Campo, Mensaje } from "./Campo.jsx";
import { formatearNumero } from "./formato.js";
import { validarVehiculo, normalizarPatente, erroresDeApi } from "./validaciones.js";

const VACIO = { marca: "", modelo: "", patente: "", anio: "", capacidad_carga: "" };

export function Vehiculos() {
  const { apiAuth } = useAuth();
  const [vehiculos, setVehiculos] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [formulario, setFormulario] = useState(null); // null = cerrado
  const [editandoId, setEditandoId] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const filtro = buscar.trim() ? `?buscar=${encodeURIComponent(buscar.trim())}` : "";
      const { data } = await apiAuth(`/vehiculos${filtro}`);
      setVehiculos(data);
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

  const abrirEdicion = (v) => {
    setFormulario({
      marca: v.marca,
      modelo: v.modelo,
      patente: v.patente,
      anio: String(v.anio),
      capacidad_carga: String(Number(v.capacidad_carga)),
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
    const nuevosErrores = validarVehiculo(formulario);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const cuerpo = {
      marca: formulario.marca.trim(),
      modelo: formulario.modelo.trim(),
      patente: normalizarPatente(formulario.patente),
      anio: Number(formulario.anio),
      capacidad_carga: Number(formulario.capacidad_carga),
    };

    setGuardando(true);
    try {
      if (editandoId) {
        await apiAuth(`/vehiculos/${editandoId}`, { method: "PUT", body: cuerpo });
        setExito("Vehículo modificado correctamente");
      } else {
        await apiAuth("/vehiculos", { method: "POST", body: cuerpo });
        setExito("Vehículo registrado correctamente");
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

  const eliminar = async (v) => {
    if (!window.confirm(`¿Eliminar el vehículo ${v.marca} ${v.modelo} (${v.patente})?`)) return;
    setExito("");
    try {
      await apiAuth(`/vehiculos/${v.id}`, { method: "DELETE" });
      setExito("Vehículo eliminado");
      if (editandoId === v.id) cerrar();
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <div className="titulo-pagina">
        <h1>Vehículos</h1>
        {!formulario && (
          <button className="boton" onClick={abrirNuevo}>
            + Nuevo vehículo
          </button>
        )}
      </div>

      <Mensaje>{error}</Mensaje>
      <Mensaje tipo="exito">{exito}</Mensaje>

      {formulario && (
        <form className="panel formulario" onSubmit={guardar} noValidate>
          <h2>{editandoId ? "Modificar vehículo" : "Nuevo vehículo"}</h2>
          <div className="grilla">
            <Campo etiqueta="Marca" error={errores.marca}>
              <input name="marca" value={formulario.marca} onChange={cambiar} maxLength={50} />
            </Campo>
            <Campo etiqueta="Modelo" error={errores.modelo}>
              <input name="modelo" value={formulario.modelo} onChange={cambiar} maxLength={50} />
            </Campo>
            <Campo etiqueta="Patente" error={errores.patente}>
              <input name="patente" value={formulario.patente} onChange={cambiar} placeholder="AB123CD" maxLength={9} />
            </Campo>
            <Campo etiqueta="Año" error={errores.anio}>
              <input type="number" name="anio" value={formulario.anio} onChange={cambiar} min={1950} />
            </Campo>
            <Campo etiqueta="Capacidad de carga (kg)" error={errores.capacidad_carga}>
              <input
                type="number"
                name="capacidad_carga"
                value={formulario.capacidad_carga}
                onChange={cambiar}
                min={0}
                step="0.01"
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
        placeholder="Buscar por marca, modelo o patente..."
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />

      {cargando ? (
        <p className="nota">Cargando...</p>
      ) : vehiculos.length === 0 ? (
        <p className="vacio">No hay vehículos registrados.</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Patente</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th className="num">Capacidad (kg)</th>
                <th className="num">Viajes</th>
                <th className="num">Km recorridos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="patente">{v.patente}</span>
                  </td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{v.anio}</td>
                  <td className="num">{formatearNumero(v.capacidad_carga)}</td>
                  <td className="num">{v.cantidad_viajes}</td>
                  <td className="num">{formatearNumero(v.kilometros_totales)}</td>
                  <td className="acciones-fila">
                    <Link to={`/viajes?vehiculo_id=${v.id}`} className="boton boton-chico boton-secundario">
                      Viajes
                    </Link>
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

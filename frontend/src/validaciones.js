// Validaciones del lado del cliente. Cada función devuelve { campo: mensaje } solo con los campos con error.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PATENTE = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/;

const vacio = (valor) => String(valor ?? "").trim() === "";
const hoy = () => new Date().toISOString().slice(0, 10);

export const normalizarPatente = (patente) => patente.toUpperCase().replace(/[\s-]/g, "");

export function validarLogin({ email, contrasena }) {
  const errores = {};
  if (vacio(email)) errores.email = "El email es obligatorio";
  else if (!EMAIL.test(email.trim())) errores.email = "El email no tiene un formato válido";
  if (vacio(contrasena)) errores.contrasena = "La contraseña es obligatoria";
  return errores;
}

export function validarRegistro({ nombre, email, contrasena, confirmacion }) {
  const errores = validarLogin({ email, contrasena });
  if (vacio(nombre)) errores.nombre = "El nombre es obligatorio";
  else if (nombre.trim().length < 3) errores.nombre = "El nombre debe tener al menos 3 caracteres";

  if (!errores.contrasena) {
    if (contrasena.length < 8) errores.contrasena = "Debe tener al menos 8 caracteres";
    else if (!/[a-z]/.test(contrasena) || !/[A-Z]/.test(contrasena) || !/\d/.test(contrasena))
      errores.contrasena = "Debe incluir mayúscula, minúscula y número";
  }
  if (confirmacion !== contrasena) errores.confirmacion = "Las contraseñas no coinciden";
  return errores;
}

export function validarVehiculo({ marca, modelo, patente, anio, capacidad_carga }) {
  const errores = {};
  const anioMaximo = new Date().getFullYear() + 1;
  if (vacio(marca)) errores.marca = "La marca es obligatoria";
  if (vacio(modelo)) errores.modelo = "El modelo es obligatorio";
  if (vacio(patente)) errores.patente = "La patente es obligatoria";
  else if (!PATENTE.test(normalizarPatente(patente))) errores.patente = "Formato ABC123 o AB123CD";
  if (vacio(anio)) errores.anio = "El año es obligatorio";
  else if (!Number.isInteger(Number(anio)) || anio < 1950 || anio > anioMaximo)
    errores.anio = `Debe estar entre 1950 y ${anioMaximo}`;
  if (vacio(capacidad_carga)) errores.capacidad_carga = "La capacidad es obligatoria";
  else if (!(Number(capacidad_carga) > 0)) errores.capacidad_carga = "Debe ser mayor a 0";
  return errores;
}

export function validarConductor(c) {
  const errores = {};
  for (const [campo, etiqueta] of [["nombre", "El nombre"], ["apellido", "El apellido"]]) {
    if (vacio(c[campo])) errores[campo] = `${etiqueta} es obligatorio`;
    else if (!SOLO_LETRAS.test(c[campo].trim())) errores[campo] = "Solo se permiten letras";
  }
  if (vacio(c.dni)) errores.dni = "El documento es obligatorio";
  else if (!/^\d{7,8}$/.test(c.dni.trim())) errores.dni = "7 u 8 dígitos, sin puntos";
  if (vacio(c.numero_licencia)) errores.numero_licencia = "La licencia es obligatoria";
  else if (!/^[A-Za-z0-9]{5,20}$/.test(c.numero_licencia.trim()))
    errores.numero_licencia = "Entre 5 y 20 letras o números";
  if (vacio(c.fecha_alta_licencia)) errores.fecha_alta_licencia = "La fecha de alta es obligatoria";
  else if (c.fecha_alta_licencia > hoy()) errores.fecha_alta_licencia = "No puede ser posterior a hoy";
  if (vacio(c.fecha_vencimiento_licencia)) errores.fecha_vencimiento_licencia = "El vencimiento es obligatorio";
  else if (c.fecha_alta_licencia && c.fecha_vencimiento_licencia <= c.fecha_alta_licencia)
    errores.fecha_vencimiento_licencia = "Debe ser posterior a la fecha de alta";
  return errores;
}

export function validarViaje(v) {
  const errores = {};
  if (vacio(v.vehiculo_id)) errores.vehiculo_id = "Seleccione un vehículo";
  if (vacio(v.conductor_id)) errores.conductor_id = "Seleccione un conductor";
  if (vacio(v.fecha_salida)) errores.fecha_salida = "La fecha de salida es obligatoria";
  if (vacio(v.fecha_llegada)) errores.fecha_llegada = "La fecha de llegada es obligatoria";
  else if (v.fecha_salida && v.fecha_llegada <= v.fecha_salida)
    errores.fecha_llegada = "Debe ser posterior a la salida";
  if (vacio(v.origen)) errores.origen = "El origen es obligatorio";
  if (vacio(v.destino)) errores.destino = "El destino es obligatorio";
  else if (v.destino.trim().toLowerCase() === v.origen.trim().toLowerCase())
    errores.destino = "Debe ser distinto del origen";
  if (vacio(v.kilometros)) errores.kilometros = "Los kilómetros son obligatorios";
  else if (!(Number(v.kilometros) > 0)) errores.kilometros = "Debe ser mayor a 0";
  if ((v.observaciones || "").length > 500) errores.observaciones = "Máximo 500 caracteres";
  return errores;
}

// Convierte los errores de express-validator que devuelve la API al mismo formato { campo: mensaje }
export function erroresDeApi(error) {
  const errores = {};
  for (const { campo, mensaje } of error.errores || []) {
    if (!errores[campo]) errores[campo] = mensaje;
  }
  return errores;
}

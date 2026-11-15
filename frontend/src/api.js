const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(status, message, errores = []) {
    super(message);
    this.status = status;
    this.errores = errores;
  }
}

// Envía y recibe JSON. Lanza ApiError si la respuesta no es exitosa
export async function api(ruta, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, datos.message || "Ocurrió un error inesperado", datos.errores);
  }
  return datos;
}

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export const formatearNumero = (valor) => numero.format(Number(valor) || 0);

// "2026-11-14" -> "14/11/2026"
export const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
};

// "2026-11-14 08:30:00" -> "14/11/2026 08:30"
export const formatearFechaHora = (valor) => (valor ? `${formatearFecha(valor)} ${valor.slice(11, 16)}` : "");

// "2026-11-14 08:30:00" -> "2026-11-14T08:30" (valor para <input type="datetime-local">)
export const aInputFechaHora = (valor) => (valor ? valor.slice(0, 16).replace(" ", "T") : "");

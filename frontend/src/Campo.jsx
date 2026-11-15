// Etiqueta + control del formulario + mensaje de error
export function Campo({ etiqueta, error, children, ancho }) {
  return (
    <label className={`campo ${ancho ? "campo-ancho" : ""} ${error ? "campo-error" : ""}`}>
      <span>{etiqueta}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

export function Mensaje({ tipo = "error", children }) {
  if (!children) return null;
  return <p className={`mensaje mensaje-${tipo}`}>{children}</p>;
}

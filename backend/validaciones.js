import { param, validationResult } from "express-validator";

// :id de la ruta como entero positivo
export const validarId = param("id")
  .isInt({ min: 1 })
  .withMessage("El id debe ser un número entero positivo")
  .toInt();

// Si alguna regla falló responde 400 con el detalle por campo
export function verificarValidaciones(req, res, next) {
  const resultado = validationResult(req);
  if (!resultado.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Los datos enviados no son válidos",
      errores: resultado.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
    });
  }
  next();
}

// Errores de MySQL que corresponden a datos inválidos del cliente
export function manejarErrorDB(error, res, next, mensajes = {}) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(400).json({ success: false, message: mensajes.duplicado || "El registro ya existe" });
  }
  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res
      .status(400)
      .json({ success: false, message: mensajes.enUso || "No se puede eliminar: tiene registros asociados" });
  }
  next(error);
}

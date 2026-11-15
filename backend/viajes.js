import express from "express";
import { body, query } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion } from "./auth.js";
import { validarId, verificarValidaciones, manejarErrorDB } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

// Acepta "2026-11-14T08:30", "2026-11-14 08:30" o con segundos
const FECHA_HORA = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/;

// Lleva la fecha al formato DATETIME de MySQL: "2026-11-14 08:30:00"
const aDatetime = (valor) => {
  const [, fecha, hora, segundos] = String(valor).trim().match(FECHA_HORA);
  return `${fecha} ${hora}${segundos || ":00"}`;
};

const reglaFechaHora = (campo, etiqueta) =>
  body(campo)
    .trim()
    .notEmpty()
    .withMessage(`La ${etiqueta} es obligatoria`)
    .bail()
    .matches(FECHA_HORA)
    .withMessage(`La ${etiqueta} debe tener el formato AAAA-MM-DDTHH:MM`)
    .bail()
    .custom((valor) => !Number.isNaN(Date.parse(valor.replace(" ", "T"))))
    .withMessage(`La ${etiqueta} no es una fecha válida`)
    .bail()
    .customSanitizer(aDatetime);

// Comprueba en la base que el id referenciado exista
const existeEn = (tabla) => async (id) => {
  const [filas] = await db.execute(`SELECT id FROM ${tabla} WHERE id = ?`, [id]);
  if (filas.length === 0) throw new Error();
};

const reglasViaje = [
  body("vehiculo_id")
    .isInt({ min: 1 })
    .withMessage("Debe seleccionar un vehículo")
    .bail()
    .toInt()
    .custom(existeEn("vehiculos"))
    .withMessage("El vehículo seleccionado no existe"),
  body("conductor_id")
    .isInt({ min: 1 })
    .withMessage("Debe seleccionar un conductor")
    .bail()
    .toInt()
    .custom(existeEn("conductores"))
    .withMessage("El conductor seleccionado no existe"),
  reglaFechaHora("fecha_salida", "fecha de salida"),
  reglaFechaHora("fecha_llegada", "fecha de llegada")
    .bail()
    .custom((llegada, { req }) => !FECHA_HORA.test(req.body.fecha_salida) || llegada > aDatetime(req.body.fecha_salida))
    .withMessage("La fecha de llegada debe ser posterior a la de salida"),
  body("origen")
    .trim()
    .notEmpty()
    .withMessage("El origen es obligatorio")
    .bail()
    .isLength({ max: 100 })
    .withMessage("El origen admite como máximo 100 caracteres"),
  body("destino")
    .trim()
    .notEmpty()
    .withMessage("El destino es obligatorio")
    .bail()
    .isLength({ max: 100 })
    .withMessage("El destino admite como máximo 100 caracteres")
    .custom((destino, { req }) => destino.toLowerCase() !== String(req.body.origen ?? "").trim().toLowerCase())
    .withMessage("El destino debe ser distinto del origen"),
  body("kilometros")
    .isFloat({ gt: 0, lt: 100000000 })
    .withMessage("Los kilómetros deben ser un número mayor a 0")
    .toFloat(),
  body("observaciones")
    .optional({ values: "null" })
    .isString()
    .withMessage("Las observaciones deben ser texto")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las observaciones admiten como máximo 500 caracteres"),
];

// La licencia del conductor tiene que estar vigente el día de salida
async function verificarLicenciaVigente(req, res, next) {
  try {
    const [filas] = await db.execute(
      "SELECT fecha_alta_licencia, fecha_vencimiento_licencia FROM conductores WHERE id = ?",
      [req.body.conductor_id]
    );
    const { fecha_alta_licencia, fecha_vencimiento_licencia } = filas[0];
    const diaSalida = req.body.fecha_salida.slice(0, 10);
    if (diaSalida < fecha_alta_licencia || diaSalida > fecha_vencimiento_licencia) {
      return res.status(400).json({
        success: false,
        message: "Los datos enviados no son válidos",
        errores: [{ campo: "conductor_id", mensaje: "La licencia del conductor no está vigente en la fecha de salida" }],
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

const SELECT_VIAJES = `
  SELECT vj.*,
         v.marca, v.modelo, v.patente,
         c.nombre AS conductor_nombre, c.apellido AS conductor_apellido
  FROM viajes vj
  INNER JOIN vehiculos v ON v.id = vj.vehiculo_id
  INNER JOIN conductores c ON c.id = vj.conductor_id`;

async function buscarViaje(id) {
  const [filas] = await db.execute(`${SELECT_VIAJES} WHERE vj.id = ?`, [id]);
  return filas[0];
}

// GET /viajes?vehiculo_id=&conductor_id=  -> historial y total de kilómetros
router.get(
  "/",
  query("vehiculo_id").optional().isInt({ min: 1 }).withMessage("vehiculo_id debe ser un entero positivo").toInt(),
  query("conductor_id").optional().isInt({ min: 1 }).withMessage("conductor_id debe ser un entero positivo").toInt(),
  verificarValidaciones,
  async (req, res, next) => {
    try {
      const condiciones = [];
      const parametros = [];
      if (req.query.vehiculo_id) {
        condiciones.push("vj.vehiculo_id = ?");
        parametros.push(req.query.vehiculo_id);
      }
      if (req.query.conductor_id) {
        condiciones.push("vj.conductor_id = ?");
        parametros.push(req.query.conductor_id);
      }
      let sql = SELECT_VIAJES;
      if (condiciones.length > 0) sql += ` WHERE ${condiciones.join(" AND ")}`;
      sql += " ORDER BY vj.fecha_salida DESC";

      const [viajes] = await db.execute(sql, parametros);
      const kilometrosTotales = viajes.reduce((suma, viaje) => suma + Number(viaje.kilometros), 0);
      res.json({
        success: true,
        data: viajes,
        cantidad: viajes.length,
        kilometros_totales: Math.round(kilometrosTotales * 100) / 100,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /viajes/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const viaje = await buscarViaje(req.params.id);
    if (!viaje) {
      return res.status(404).json({ success: false, message: "Viaje no encontrado" });
    }
    res.json({ success: true, data: viaje });
  } catch (error) {
    next(error);
  }
});

// POST /viajes
router.post("/", reglasViaje, verificarValidaciones, verificarLicenciaVigente, async (req, res, next) => {
  const { vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros } = req.body;
  const observaciones = req.body.observaciones || null;
  try {
    const [resultado] = await db.execute(
      `INSERT INTO viajes (vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones]
    );
    res.status(201).json({ success: true, data: await buscarViaje(resultado.insertId) });
  } catch (error) {
    manejarErrorDB(error, res, next);
  }
});

// PUT /viajes/:id
router.put(
  "/:id",
  validarId,
  reglasViaje,
  verificarValidaciones,
  verificarLicenciaVigente,
  async (req, res, next) => {
    const { vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros } = req.body;
    const observaciones = req.body.observaciones || null;
    try {
      const [resultado] = await db.execute(
        `UPDATE viajes
         SET vehiculo_id = ?, conductor_id = ?, fecha_salida = ?, fecha_llegada = ?,
             origen = ?, destino = ?, kilometros = ?, observaciones = ?
         WHERE id = ?`,
        [vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones, req.params.id]
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Viaje no encontrado" });
      }
      res.json({ success: true, data: await buscarViaje(req.params.id) });
    } catch (error) {
      manejarErrorDB(error, res, next);
    }
  }
);

// DELETE /viajes/:id
router.delete("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [resultado] = await db.execute("DELETE FROM viajes WHERE id = ?", [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Viaje no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

export default router;

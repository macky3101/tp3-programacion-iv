import express from "express";
import { body, query } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion } from "./auth.js";
import { validarId, verificarValidaciones, manejarErrorDB } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

const ANIO_MAXIMO = new Date().getFullYear() + 1;

// Patente formato anterior (ABC123) o Mercosur (AB123CD)
const PATENTE_VALIDA = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;

const reglasVehiculo = [
  body("marca")
    .trim()
    .notEmpty()
    .withMessage("La marca es obligatoria")
    .bail()
    .isLength({ max: 50 })
    .withMessage("La marca admite como máximo 50 caracteres"),
  body("modelo")
    .trim()
    .notEmpty()
    .withMessage("El modelo es obligatorio")
    .bail()
    .isLength({ max: 50 })
    .withMessage("El modelo admite como máximo 50 caracteres"),
  body("patente")
    .isString()
    .withMessage("La patente es obligatoria")
    .bail()
    .customSanitizer((valor) => valor.toUpperCase().replace(/[\s-]/g, ""))
    .notEmpty()
    .withMessage("La patente es obligatoria")
    .bail()
    .matches(PATENTE_VALIDA)
    .withMessage("La patente debe ser del tipo ABC123 o AB123CD"),
  body("anio")
    .isInt({ min: 1950, max: ANIO_MAXIMO })
    .withMessage(`El año debe ser un número entre 1950 y ${ANIO_MAXIMO}`)
    .toInt(),
  body("capacidad_carga")
    .isFloat({ gt: 0, lt: 100000000 })
    .withMessage("La capacidad de carga debe ser un número mayor a 0 (en kg)")
    .toFloat(),
];

const mensajesDB = {
  duplicado: "Ya hay un vehículo registrado con esa patente",
  enUso: "El vehículo tiene viajes registrados y no se puede eliminar",
};

// GET /vehiculos?buscar=  -> incluye cantidad de viajes y km totales de cada vehículo
router.get(
  "/",
  query("buscar").optional().trim().isLength({ max: 50 }).withMessage("El texto de búsqueda es demasiado largo"),
  verificarValidaciones,
  async (req, res, next) => {
    try {
      const parametros = [];
      let sql = `
        SELECT v.*, COUNT(vj.id) AS cantidad_viajes, COALESCE(SUM(vj.kilometros), 0) AS kilometros_totales
        FROM vehiculos v
        LEFT JOIN viajes vj ON vj.vehiculo_id = v.id`;
      if (req.query.buscar) {
        sql += " WHERE v.marca LIKE ? OR v.modelo LIKE ? OR v.patente LIKE ?";
        const texto = `%${req.query.buscar}%`;
        parametros.push(texto, texto, texto);
      }
      sql += " GROUP BY v.id ORDER BY v.marca, v.modelo";
      const [vehiculos] = await db.execute(sql, parametros);
      res.json({ success: true, data: vehiculos });
    } catch (error) {
      next(error);
    }
  }
);

// GET /vehiculos/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [filas] = await db.execute(
      `SELECT v.*, COUNT(vj.id) AS cantidad_viajes, COALESCE(SUM(vj.kilometros), 0) AS kilometros_totales
       FROM vehiculos v
       LEFT JOIN viajes vj ON vj.vehiculo_id = v.id
       WHERE v.id = ?
       GROUP BY v.id`,
      [req.params.id]
    );
    if (filas.length === 0) {
      return res.status(404).json({ success: false, message: "Vehículo no encontrado" });
    }
    res.json({ success: true, data: filas[0] });
  } catch (error) {
    next(error);
  }
});

// POST /vehiculos
router.post("/", reglasVehiculo, verificarValidaciones, async (req, res, next) => {
  const { marca, modelo, patente, anio, capacidad_carga } = req.body;
  try {
    const [resultado] = await db.execute(
      "INSERT INTO vehiculos (marca, modelo, patente, anio, capacidad_carga) VALUES (?, ?, ?, ?, ?)",
      [marca, modelo, patente, anio, capacidad_carga]
    );
    res.status(201).json({
      success: true,
      data: { id: resultado.insertId, marca, modelo, patente, anio, capacidad_carga },
    });
  } catch (error) {
    manejarErrorDB(error, res, next, mensajesDB);
  }
});

// PUT /vehiculos/:id
router.put("/:id", validarId, reglasVehiculo, verificarValidaciones, async (req, res, next) => {
  const { marca, modelo, patente, anio, capacidad_carga } = req.body;
  try {
    const [resultado] = await db.execute(
      "UPDATE vehiculos SET marca = ?, modelo = ?, patente = ?, anio = ?, capacidad_carga = ? WHERE id = ?",
      [marca, modelo, patente, anio, capacidad_carga, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Vehículo no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id, marca, modelo, patente, anio, capacidad_carga } });
  } catch (error) {
    manejarErrorDB(error, res, next, mensajesDB);
  }
});

// DELETE /vehiculos/:id
router.delete("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [resultado] = await db.execute("DELETE FROM vehiculos WHERE id = ?", [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Vehículo no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    manejarErrorDB(error, res, next, mensajesDB);
  }
});

export default router;

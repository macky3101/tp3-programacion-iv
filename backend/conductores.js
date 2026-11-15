import express from "express";
import { body, query } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion } from "./auth.js";
import { validarId, verificarValidaciones, manejarErrorDB } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/;

const reglaTexto = (campo, etiqueta) =>
  body(campo)
    .trim()
    .notEmpty()
    .withMessage(`El ${etiqueta} es obligatorio`)
    .bail()
    .isLength({ min: 2, max: 60 })
    .withMessage(`El ${etiqueta} debe tener entre 2 y 60 caracteres`)
    .matches(SOLO_LETRAS)
    .withMessage(`El ${etiqueta} solo puede contener letras`);

const reglaFecha = (campo, etiqueta) =>
  body(campo)
    .notEmpty()
    .withMessage(`La ${etiqueta} es obligatoria`)
    .bail()
    .isDate({ format: "YYYY-MM-DD", strictMode: true })
    .withMessage(`La ${etiqueta} debe tener el formato AAAA-MM-DD`);

const reglasConductor = [
  reglaTexto("nombre", "nombre"),
  reglaTexto("apellido", "apellido"),
  body("dni")
    .trim()
    .notEmpty()
    .withMessage("El número de documento es obligatorio")
    .bail()
    .matches(/^\d{7,8}$/)
    .withMessage("El número de documento debe tener 7 u 8 dígitos, sin puntos"),
  body("numero_licencia")
    .trim()
    .notEmpty()
    .withMessage("El número de licencia es obligatorio")
    .bail()
    .isAlphanumeric()
    .withMessage("El número de licencia solo admite letras y números")
    .isLength({ min: 5, max: 20 })
    .withMessage("El número de licencia debe tener entre 5 y 20 caracteres")
    .toUpperCase(),
  reglaFecha("fecha_alta_licencia", "fecha de alta de la licencia")
    .bail()
    .custom((valor) => valor <= new Date().toISOString().slice(0, 10))
    .withMessage("La fecha de alta de la licencia no puede ser posterior a hoy"),
  reglaFecha("fecha_vencimiento_licencia", "fecha de vencimiento de la licencia")
    .bail()
    .custom((valor, { req }) => valor > req.body.fecha_alta_licencia)
    .withMessage("El vencimiento de la licencia debe ser posterior a la fecha de alta"),
];

const mensajesDB = {
  duplicado: "Ya hay un conductor con ese número de documento o de licencia",
  enUso: "El conductor tiene viajes registrados y no se puede eliminar",
};

const SELECT_CONDUCTORES = `
  SELECT c.*, COUNT(vj.id) AS cantidad_viajes, COALESCE(SUM(vj.kilometros), 0) AS kilometros_totales
  FROM conductores c
  LEFT JOIN viajes vj ON vj.conductor_id = c.id`;

// GET /conductores?buscar=  -> incluye cantidad de viajes y km totales de cada conductor
router.get(
  "/",
  query("buscar").optional().trim().isLength({ max: 60 }).withMessage("El texto de búsqueda es demasiado largo"),
  verificarValidaciones,
  async (req, res, next) => {
    try {
      const parametros = [];
      let sql = SELECT_CONDUCTORES;
      if (req.query.buscar) {
        sql += " WHERE c.nombre LIKE ? OR c.apellido LIKE ? OR c.dni LIKE ?";
        const texto = `%${req.query.buscar}%`;
        parametros.push(texto, texto, texto);
      }
      sql += " GROUP BY c.id ORDER BY c.apellido, c.nombre";
      const [conductores] = await db.execute(sql, parametros);
      res.json({ success: true, data: conductores });
    } catch (error) {
      next(error);
    }
  }
);

// GET /conductores/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [filas] = await db.execute(`${SELECT_CONDUCTORES} WHERE c.id = ? GROUP BY c.id`, [req.params.id]);
    if (filas.length === 0) {
      return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    }
    res.json({ success: true, data: filas[0] });
  } catch (error) {
    next(error);
  }
});

// POST /conductores
router.post("/", reglasConductor, verificarValidaciones, async (req, res, next) => {
  const { nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia } = req.body;
  try {
    const [resultado] = await db.execute(
      `INSERT INTO conductores (nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia]
    );
    res.status(201).json({
      success: true,
      data: { id: resultado.insertId, nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia },
    });
  } catch (error) {
    manejarErrorDB(error, res, next, mensajesDB);
  }
});

// PUT /conductores/:id
router.put("/:id", validarId, reglasConductor, verificarValidaciones, async (req, res, next) => {
  const { nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia } = req.body;
  try {
    const [resultado] = await db.execute(
      `UPDATE conductores
       SET nombre = ?, apellido = ?, dni = ?, numero_licencia = ?, fecha_alta_licencia = ?, fecha_vencimiento_licencia = ?
       WHERE id = ?`,
      [nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    }
    res.json({
      success: true,
      data: { id: req.params.id, nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia },
    });
  } catch (error) {
    manejarErrorDB(error, res, next, mensajesDB);
  }
});

// DELETE /conductores/:id
router.delete("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [resultado] = await db.execute("DELETE FROM conductores WHERE id = ?", [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    manejarErrorDB(error, res, next, mensajesDB);
  }
});

export default router;

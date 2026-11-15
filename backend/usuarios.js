import express from "express";
import { db } from "./db.js";
import { verificarAutenticacion, reglaNombre, reglaContrasena, hashearContrasena } from "./auth.js";
import { validarId, verificarValidaciones } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

// Un usuario solo puede modificar o eliminar su propia cuenta
function soloPropietario(req, res, next) {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ success: false, message: "No tiene permiso para operar sobre otra cuenta" });
  }
  next();
}

// GET /usuarios
router.get("/", async (req, res, next) => {
  try {
    const [usuarios] = await db.execute("SELECT id, nombre, email FROM usuarios ORDER BY nombre");
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
});

// GET /usuarios/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [filas] = await db.execute("SELECT id, nombre, email FROM usuarios WHERE id = ?", [req.params.id]);
    if (filas.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    res.json({ success: true, data: filas[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /usuarios/:id  (nombre obligatorio, contraseña opcional)
router.put(
  "/:id",
  validarId,
  reglaNombre,
  reglaContrasena().optional(),
  verificarValidaciones,
  soloPropietario,
  async (req, res, next) => {
    const { nombre, contrasena } = req.body;
    try {
      if (contrasena) {
        const hash = await hashearContrasena(contrasena);
        await db.execute("UPDATE usuarios SET nombre = ?, contrasena = ? WHERE id = ?", [
          nombre,
          hash,
          req.params.id,
        ]);
      } else {
        await db.execute("UPDATE usuarios SET nombre = ? WHERE id = ?", [nombre, req.params.id]);
      }
      res.json({ success: true, data: { id: req.params.id, nombre, email: req.user.email } });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /usuarios/:id
router.delete("/:id", validarId, verificarValidaciones, soloPropietario, async (req, res, next) => {
  try {
    await db.execute("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

export default router;

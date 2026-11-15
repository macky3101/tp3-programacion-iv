import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { body } from "express-validator";
import { db } from "./db.js";
import { verificarValidaciones, manejarErrorDB } from "./validaciones.js";

const RONDAS_BCRYPT = 10;
const DURACION_TOKEN = "4h";

// Configura la estrategia JWT: lee el token del header "Authorization: Bearer <token>"
export function authConfig() {
  const opciones = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(opciones, async (payload, done) => {
      try {
        const [filas] = await db.execute("SELECT id, nombre, email FROM usuarios WHERE id = ?", [
          payload.userId,
        ]);
        // Si el usuario fue eliminado, el token deja de ser válido
        done(null, filas.length > 0 ? filas[0] : false);
      } catch (error) {
        done(error);
      }
    })
  );
}

// Middleware para proteger rutas. Responde 401 en JSON si el token falta, es inválido o venció
export function verificarAutenticacion(req, res, next) {
  passport.authenticate("jwt", { session: false }, (error, usuario, info) => {
    if (error) return next(error);
    if (!usuario) {
      const vencido = info && info.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        message: vencido ? "La sesión venció, vuelva a iniciar sesión" : "Debe iniciar sesión para continuar",
      });
    }
    req.user = usuario;
    next();
  })(req, res, next);
}

export const hashearContrasena = (contrasena) => bcrypt.hash(contrasena, RONDAS_BCRYPT);

const crearToken = (usuario) =>
  jwt.sign({ userId: usuario.id }, process.env.JWT_SECRET, { expiresIn: DURACION_TOKEN });

// Reglas reutilizadas por el registro y la edición de usuarios
export const reglaNombre = body("nombre")
  .trim()
  .notEmpty()
  .withMessage("El nombre es obligatorio")
  .bail()
  .isLength({ min: 3, max: 100 })
  .withMessage("El nombre debe tener entre 3 y 100 caracteres");

export const reglaContrasena = (campo = "contrasena") =>
  body(campo)
    .isString()
    .withMessage("La contraseña es obligatoria")
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage("La contraseña debe tener entre 8 y 72 caracteres")
    .bail()
    .matches(/[a-z]/)
    .withMessage("La contraseña debe incluir al menos una minúscula")
    .matches(/[A-Z]/)
    .withMessage("La contraseña debe incluir al menos una mayúscula")
    .matches(/\d/)
    .withMessage("La contraseña debe incluir al menos un número");

const reglaEmail = body("email")
  .trim()
  .notEmpty()
  .withMessage("El email es obligatorio")
  .bail()
  .isEmail()
  .withMessage("El email no tiene un formato válido")
  .bail()
  .isLength({ max: 150 })
  .withMessage("El email no puede superar los 150 caracteres")
  .toLowerCase();

const router = express.Router();

// POST /auth/registro
router.post(
  "/registro",
  reglaNombre,
  reglaEmail,
  reglaContrasena(),
  verificarValidaciones,
  async (req, res, next) => {
    const { nombre, email, contrasena } = req.body;
    try {
      const hash = await hashearContrasena(contrasena);
      const [resultado] = await db.execute(
        "INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)",
        [nombre, email, hash]
      );
      const usuario = { id: resultado.insertId, nombre, email };
      res.status(201).json({ success: true, usuario, token: crearToken(usuario) });
    } catch (error) {
      manejarErrorDB(error, res, next, { duplicado: "Ya existe una cuenta con ese email" });
    }
  }
);

// POST /auth/login
router.post(
  "/login",
  reglaEmail,
  body("contrasena").isString().notEmpty().withMessage("La contraseña es obligatoria"),
  verificarValidaciones,
  async (req, res, next) => {
    const { email, contrasena } = req.body;
    try {
      const [filas] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [email]);
      const encontrado = filas[0];
      const valida = encontrado ? await bcrypt.compare(contrasena, encontrado.contrasena) : false;

      // Mismo mensaje en ambos casos para no revelar qué emails están registrados
      if (!valida) {
        return res.status(401).json({ success: false, message: "Email o contraseña incorrectos" });
      }

      const usuario = { id: encontrado.id, nombre: encontrado.nombre, email: encontrado.email };
      res.json({ success: true, usuario, token: crearToken(usuario) });
    } catch (error) {
      next(error);
    }
  }
);

// GET /auth/perfil
router.get("/perfil", verificarAutenticacion, (req, res) => {
  res.json({ success: true, usuario: req.user });
});

export default router;

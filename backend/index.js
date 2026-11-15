import "dotenv/config";
import express from "express";
import cors from "cors";
import passport from "passport";
import { verificarConexion } from "./db.js";
import authRouter, { authConfig } from "./auth.js";
import usuariosRouter from "./usuarios.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

authConfig();
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({ success: true, message: "API TP3 - Gestión de transporte" });
});

app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);

// Rutas inexistentes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});

// Errores no controlados
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "El cuerpo de la petición no es un JSON válido" });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Error interno del servidor" });
});

try {
  await verificarConexion();
  app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
} catch (error) {
  console.error("No se pudo conectar a la base de datos:", error.message);
  process.exit(1);
}

import mysql from "mysql2/promise";

// Pool de conexiones compartido por todos los routers
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  // Las fechas vuelven como texto ("2026-11-14 08:30:00") y no se corren por zona horaria
  dateStrings: true,
});

export async function verificarConexion() {
  const conexion = await db.getConnection();
  conexion.release();
}

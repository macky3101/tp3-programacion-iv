# TP3 - Gestión de vehículos, conductores y viajes

Programación IV - Tecnicatura Universitaria en Programación - UTN Facultad Regional La Rioja

Trabajo práctico realizado por Quispe Macarena.

Aplicación para registrar los vehículos de una empresa de transporte, sus conductores y los viajes realizados.

## Estructura

```
backend/
  index.js            servidor Express, CORS, Passport y manejo de errores
  db.js               pool de conexiones MySQL (mysql2)
  db.sql              definición de la base y las tablas
  auth.js             registro, login, estrategia Passport JWT y middleware de rutas protegidas
  validaciones.js     middlewares comunes de express-validator
  usuarios.js         rutas /usuarios
  vehiculos.js        rutas /vehiculos
  conductores.js      rutas /conductores
  viajes.js           rutas /viajes
  http/               archivos .http para probar la API (extensión REST Client)
frontend/
  src/
    main.jsx, App.jsx rutas de la aplicación
    api.js            cliente fetch para la API REST JSON
    Auth.jsx          contexto de sesión (JWT) y rutas protegidas
    validaciones.js   validaciones de los formularios
    Layout.jsx, Home.jsx, Login.jsx, Registro.jsx
    Vehiculos.jsx, Conductores.jsx, Viajes.jsx
    index.css         estilos en CSS puro
```

## Puesta en marcha

### Base de datos

Ejecutar `backend/db.sql` en MySQL (crea la base `transporte_tp3` y sus tablas).

### Backend

```bash
cd backend
cp .env.example .env    # completar usuario, contraseña de MySQL y JWT_SECRET
npm install
npm run dev
```

La API queda en `http://localhost:3000`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`.

## API

Todas las rutas, salvo `/auth/registro` y `/auth/login`, requieren el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/registro` | Crea un usuario y devuelve un token |
| POST | `/auth/login` | Inicia sesión y devuelve un token |
| GET | `/auth/perfil` | Datos del usuario autenticado |
| GET | `/usuarios`, `/usuarios/:id` | Listado y detalle de usuarios |
| PUT / DELETE | `/usuarios/:id` | Modificar o eliminar la propia cuenta (403 si es otra) |
| GET | `/vehiculos?buscar=` | Listado con cantidad de viajes y km totales |
| GET / PUT / DELETE | `/vehiculos/:id` | Detalle, modificación y baja |
| POST | `/vehiculos` | Alta de vehículo |
| GET | `/conductores?buscar=` | Listado con cantidad de viajes y km totales |
| GET / PUT / DELETE | `/conductores/:id` | Detalle, modificación y baja |
| POST | `/conductores` | Alta de conductor |
| GET | `/viajes?vehiculo_id=&conductor_id=` | Historial de viajes con total de kilómetros |
| GET / PUT / DELETE | `/viajes/:id` | Detalle, modificación y baja |
| POST | `/viajes` | Registro de viaje |

### Códigos de respuesta

- `400` datos inválidos (express-validator), registros duplicados o eliminación de registros con viajes asociados.
- `401` token ausente, inválido o vencido; credenciales incorrectas.
- `403` intento de modificar o eliminar la cuenta de otro usuario.
- `404` recurso o ruta inexistente.
- `500` error interno del servidor.

## Seguridad

- Contraseñas almacenadas con hash bcrypt; nunca se devuelven en las respuestas.
- Tokens JWT con vencimiento de 4 horas, verificados con Passport (`passport-jwt`).
- El frontend cierra la sesión automáticamente cuando el token vence o la API responde 401.

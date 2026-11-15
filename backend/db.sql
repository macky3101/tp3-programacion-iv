-- TP3 Programación IV - Gestión de vehículos, conductores y viajes

CREATE DATABASE IF NOT EXISTS transporte_tp3
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_spanish_ci;

USE transporte_tp3;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  contrasena VARCHAR(60) NOT NULL -- hash bcrypt, nunca texto plano
);

CREATE TABLE vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  patente VARCHAR(7) NOT NULL UNIQUE,
  anio SMALLINT NOT NULL,
  capacidad_carga DECIMAL(10, 2) NOT NULL -- en kilogramos
);

CREATE TABLE conductores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  apellido VARCHAR(60) NOT NULL,
  dni VARCHAR(8) NOT NULL UNIQUE,
  numero_licencia VARCHAR(20) NOT NULL UNIQUE,
  fecha_alta_licencia DATE NOT NULL,
  fecha_vencimiento_licencia DATE NOT NULL
);

CREATE TABLE viajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  conductor_id INT NOT NULL,
  fecha_salida DATETIME NOT NULL,
  fecha_llegada DATETIME NOT NULL,
  origen VARCHAR(100) NOT NULL,
  destino VARCHAR(100) NOT NULL,
  kilometros DECIMAL(10, 2) NOT NULL,
  observaciones VARCHAR(500) NULL,
  CONSTRAINT fk_viaje_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id),
  CONSTRAINT fk_viaje_conductor FOREIGN KEY (conductor_id) REFERENCES conductores (id)
);

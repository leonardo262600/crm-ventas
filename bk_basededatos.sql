-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         8.4.3 - MySQL Community Server - GPL
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para ventas_crm
CREATE DATABASE IF NOT EXISTS `ventas_crm` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ventas_crm`;

-- Volcando estructura para tabla ventas_crm.activities
CREATE TABLE IF NOT EXISTS `activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('tarea','reunion','llamada','email','recordatorio') COLLATE utf8mb4_unicode_ci DEFAULT 'tarea',
  `description` text COLLATE utf8mb4_unicode_ci,
  `scheduled_at` datetime DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `status` enum('pendiente','completada','cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `contact_id` int DEFAULT NULL,
  `opportunity_id` int DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `contact_id` (`contact_id`),
  KEY `opportunity_id` (`opportunity_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `activities_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_ibfk_3` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_ibfk_4` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.activities: ~20 rows (aproximadamente)
DELETE FROM `activities`;
INSERT INTO `activities` (`id`, `tenant_id`, `title`, `type`, `description`, `scheduled_at`, `due_at`, `status`, `contact_id`, `opportunity_id`, `assigned_to`, `created_by`, `created_at`, `updated_at`) VALUES
	(21, 1, 'Llamada de presentación', 'llamada', NULL, '2026-04-26 10:00:00', NULL, 'pendiente', 31, 22, 1, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(22, 1, 'Reunión demostración', 'reunion', NULL, '2026-04-27 15:30:00', NULL, 'pendiente', 32, 23, 2, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(23, 1, 'Enviar propuesta final', 'tarea', NULL, '2026-04-25 18:00:00', NULL, 'pendiente', 33, 24, 3, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(24, 1, 'Seguimiento licencias', 'email', NULL, '2026-04-28 09:00:00', NULL, 'pendiente', 34, 25, 1, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(25, 1, 'Cierre de proyecto', 'reunion', NULL, '2026-04-10 11:00:00', NULL, 'completada', 35, 26, 2, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(26, 1, 'Analizar motivos pérdida', 'tarea', NULL, '2026-04-13 14:00:00', NULL, 'completada', 36, 27, 3, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(27, 1, 'Visita técnica', 'reunion', NULL, '2026-05-02 10:00:00', NULL, 'pendiente', 37, 28, 1, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(28, 1, 'Cotizar seguridad', 'tarea', NULL, '2026-04-29 16:00:00', NULL, 'pendiente', 38, 29, 2, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(29, 1, 'Onboarding de cliente', 'reunion', NULL, '2026-03-26 09:00:00', NULL, 'completada', 39, 30, 1, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(30, 1, 'Negociar descuentos', 'llamada', NULL, '2026-04-26 14:30:00', NULL, 'pendiente', 40, 31, 3, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(31, 1, 'Actividad 1', 'llamada', NULL, '2026-01-28 10:00:00', NULL, 'pendiente', 41, 32, 1, NULL, '2026-01-28 15:00:00', '2026-04-25 12:07:08'),
	(32, 1, 'Actividad 2', 'reunion', NULL, '2026-02-05 10:00:00', NULL, 'pendiente', 42, 33, 1, NULL, '2026-02-05 15:00:00', '2026-04-25 12:07:08'),
	(33, 1, 'Actividad 3', 'email', NULL, '2026-03-15 10:00:00', NULL, 'pendiente', 43, 34, 1, NULL, '2026-03-15 15:00:00', '2026-04-25 12:07:08'),
	(34, 1, 'Actividad 4', 'tarea', NULL, '2026-04-30 10:00:00', NULL, 'pendiente', 44, 35, 1, NULL, '2026-04-30 15:00:00', '2026-04-25 12:07:08'),
	(35, 1, 'Actividad 5', 'llamada', NULL, '2026-01-01 10:00:00', NULL, 'pendiente', 45, 36, 1, NULL, '2026-01-01 15:00:00', '2026-04-25 12:07:08'),
	(36, 1, 'Actividad 6', 'reunion', NULL, '2026-02-24 10:00:00', NULL, 'pendiente', 46, 37, 1, NULL, '2026-02-24 15:00:00', '2026-04-25 12:07:08'),
	(37, 1, 'Actividad 7', 'email', NULL, '2026-03-25 10:00:00', NULL, 'pendiente', 47, 38, 1, NULL, '2026-03-25 15:00:00', '2026-04-25 12:07:08'),
	(38, 1, 'Actividad 8', 'tarea', NULL, '2026-04-18 10:00:00', NULL, 'pendiente', 48, 39, 1, NULL, '2026-04-18 15:00:00', '2026-04-25 12:07:08'),
	(39, 1, 'Actividad 9', 'llamada', NULL, '2026-01-01 10:00:00', NULL, 'pendiente', 49, 40, 1, NULL, '2026-01-01 15:00:00', '2026-04-25 12:07:08'),
	(40, 1, 'Actividad 10', 'reunion', NULL, '2026-02-05 10:00:00', NULL, 'pendiente', 50, 41, 1, NULL, '2026-02-05 15:00:00', '2026-04-25 12:07:08');

-- Volcando estructura para tabla ventas_crm.audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.audit_logs: ~13 rows (aproximadamente)
DELETE FROM `audit_logs`;
INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `action`, `table_name`, `record_id`, `details`, `ip`, `created_at`) VALUES
	(14, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 11:56:40'),
	(15, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:01:31'),
	(16, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:04:47'),
	(17, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:05:13'),
	(18, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:08:23'),
	(19, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:09:07'),
	(20, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:19:32'),
	(21, 1, 1, 'login', NULL, NULL, '{"email": "admin@crm.com"}', NULL, '2026-04-25 12:45:57');

-- Volcando estructura para tabla ventas_crm.automations
CREATE TABLE IF NOT EXISTS `automations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_type` enum('opportunity_created','opportunity_stage_changed','contact_created','activity_due','quote_approved') COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_config` json DEFAULT NULL,
  `action_type` enum('create_activity','send_email','assign_user','change_stage') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_config` json DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `automations_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `automations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.automations: ~0 rows (aproximadamente)
DELETE FROM `automations`;

-- Volcando estructura para tabla ventas_crm.chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `user_id` int NOT NULL,
  `room` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.chat_messages: ~0 rows (aproximadamente)
DELETE FROM `chat_messages`;

-- Volcando estructura para tabla ventas_crm.comm_calls
CREATE TABLE IF NOT EXISTS `comm_calls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `contact_id` int DEFAULT NULL,
  `direction` enum('inbound','outbound') COLLATE utf8mb4_unicode_ci DEFAULT 'outbound',
  `duration` int DEFAULT NULL COMMENT 'minutos',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `called_at` datetime DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `contact_id` (`contact_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comm_calls_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `comm_calls_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `comm_calls_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.comm_calls: ~0 rows (aproximadamente)
DELETE FROM `comm_calls`;

-- Volcando estructura para tabla ventas_crm.comm_emails
CREATE TABLE IF NOT EXISTS `comm_emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `contact_id` int DEFAULT NULL,
  `subject` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `contact_id` (`contact_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comm_emails_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `comm_emails_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `comm_emails_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.comm_emails: ~0 rows (aproximadamente)
DELETE FROM `comm_emails`;

-- Volcando estructura para tabla ventas_crm.comm_templates
CREATE TABLE IF NOT EXISTS `comm_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `comm_templates_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `comm_templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.comm_templates: ~3 rows (aproximadamente)
DELETE FROM `comm_templates`;
INSERT INTO `comm_templates` (`id`, `tenant_id`, `name`, `subject`, `body`, `created_by`, `created_at`) VALUES
	(1, 1, 'Bienvenida cliente', 'Bienvenido a nuestros servicios', 'Estimado {{nombre}},\n\nGracias por confiar en nosotros. Estamos listos para apoyarte.\n\nSaludos,\nEl equipo de ventas', 1, '2026-04-25 06:24:59'),
	(2, 1, 'Seguimiento propuesta', 'Seguimiento de nuestra propuesta', 'Estimado {{nombre}},\n\nQuer├¡a hacer seguimiento a la propuesta que enviamos para {{empresa}}.\n\n┬┐Tiene alguna consulta?\n\nQuedamos a su disposici├│n.', 1, '2026-04-25 06:24:59'),
	(3, 1, 'Cotizaci├│n enviada', 'Cotizaci├│n {{numero}} adjunta', 'Estimado {{nombre}},\n\nAdjunto encontrar├í la cotizaci├│n solicitada. El documento es v├ílido por 30 d├¡as.\n\nPara aprobarla o realizar consultas, no dude en contactarnos.', 1, '2026-04-25 06:24:59');

-- Volcando estructura para tabla ventas_crm.contacts
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `tags` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `assigned_to` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `contacts_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contacts_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.contacts: ~20 rows (aproximadamente)
DELETE FROM `contacts`;
INSERT INTO `contacts` (`id`, `tenant_id`, `name`, `email`, `phone`, `company`, `position`, `address`, `tags`, `notes`, `assigned_to`, `created_by`, `created_at`, `updated_at`) VALUES
	(31, 1, 'Juan Pérez', 'juan@alpha.com', '555-0001', 'Empresa Alpha', 'CEO', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(32, 1, 'María Silva', 'maria@tech.com', '555-0002', 'Tech Solutions', 'CTO', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(33, 1, 'Carlos Ruiz', 'carlos@global.com', '555-0003', 'Global Import', 'Director', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(34, 1, 'Ana Torres', 'ana@express.com', '555-0004', 'Servicios Express', 'Gerente', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(35, 1, 'Pedro Díaz', 'pedro@sur.com', '555-0005', 'Inversiones Sur', 'CFO', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(36, 1, 'Lucía Vega', 'lucia@base.com', '555-0006', 'Constructora Base', 'Arquitecta', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(37, 1, 'Diego López', 'diego@creativa.com', '555-0007', 'Agencia Creativa', 'Diseñador', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(38, 1, 'Sofía Castro', 'sofia@consultores.com', '555-0008', 'Consultores X', 'Analista', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(39, 1, 'Andrés Ríos', 'andres@logistica.com', '555-0009', 'Logística Rápida', 'Operaciones', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(40, 1, 'Elena Ortiz', 'elena@salud.com', '555-0010', 'Farmacias Salud', 'Compras', NULL, NULL, NULL, NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(41, 1, 'Cliente Mensual 1', 'cliente0@empresa.com', '999888770', 'Empresa 1', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-23 15:00:00', '2026-04-25 12:07:08'),
	(42, 1, 'Cliente Mensual 2', 'cliente1@empresa.com', '999888771', 'Empresa 2', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-04 15:00:00', '2026-04-25 12:07:08'),
	(43, 1, 'Cliente Mensual 3', 'cliente2@empresa.com', '999888772', 'Empresa 3', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-12 15:00:00', '2026-04-25 12:07:08'),
	(44, 1, 'Cliente Mensual 4', 'cliente3@empresa.com', '999888773', 'Empresa 4', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-12 15:00:00', '2026-04-25 12:07:08'),
	(45, 1, 'Cliente Mensual 5', 'cliente4@empresa.com', '999888774', 'Empresa 5', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-25 15:00:00', '2026-04-25 12:07:08'),
	(46, 1, 'Cliente Mensual 6', 'cliente5@empresa.com', '999888775', 'Empresa 6', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-14 15:00:00', '2026-04-25 12:07:08'),
	(47, 1, 'Cliente Mensual 7', 'cliente6@empresa.com', '999888776', 'Empresa 7', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-14 15:00:00', '2026-04-25 12:07:08'),
	(48, 1, 'Cliente Mensual 8', 'cliente7@empresa.com', '999888777', 'Empresa 8', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-22 15:00:00', '2026-04-25 12:07:08'),
	(49, 1, 'Cliente Mensual 9', 'cliente8@empresa.com', '999888778', 'Empresa 9', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-20 15:00:00', '2026-04-25 12:07:08'),
	(50, 1, 'Cliente Mensual 10', 'cliente9@empresa.com', '999888779', 'Empresa 10', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-15 15:00:00', '2026-04-25 12:07:08');

-- Volcando estructura para tabla ventas_crm.invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `quote_id` int DEFAULT NULL,
  `contact_id` int NOT NULL,
  `number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `tax` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) DEFAULT '0.00',
  `status` enum('borrador','emitida','pagada','cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `issue_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.invoices: ~10 rows (aproximadamente)
DELETE FROM `invoices`;
INSERT INTO `invoices` (`id`, `tenant_id`, `quote_id`, `contact_id`, `number`, `subtotal`, `tax`, `total`, `status`, `issue_date`, `due_date`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
	(11, 1, 31, 41, 'FAC-200', 1271.19, 228.81, 1500.00, 'emitida', '2026-01-21', '2026-01-21', NULL, 1, '2026-01-21 15:00:00', '2026-04-25 12:07:08'),
	(12, 1, 32, 42, 'FAC-201', 2542.37, 457.63, 3000.00, 'emitida', '2026-02-09', '2026-02-09', NULL, 1, '2026-02-09 15:00:00', '2026-04-25 12:07:08'),
	(13, 1, 33, 43, 'FAC-202', 3813.56, 686.44, 4500.00, 'emitida', '2026-03-10', '2026-03-10', NULL, 1, '2026-03-10 15:00:00', '2026-04-25 12:07:08'),
	(14, 1, 34, 44, 'FAC-203', 5084.75, 915.25, 6000.00, 'emitida', '2026-04-11', '2026-04-11', NULL, 1, '2026-04-11 15:00:00', '2026-04-25 12:07:08'),
	(15, 1, 35, 45, 'FAC-204', 6355.93, 1144.07, 7500.00, 'emitida', '2026-01-15', '2026-01-15', NULL, 1, '2026-01-15 15:00:00', '2026-04-25 12:07:08'),
	(16, 1, 36, 46, 'FAC-205', 7627.12, 1372.88, 9000.00, 'emitida', '2026-02-16', '2026-02-16', NULL, 1, '2026-02-16 15:00:00', '2026-04-25 12:07:08'),
	(17, 1, 37, 47, 'FAC-206', 8898.31, 1601.69, 10500.00, 'emitida', '2026-03-23', '2026-03-23', NULL, 1, '2026-03-23 15:00:00', '2026-04-25 12:07:08'),
	(18, 1, 38, 48, 'FAC-207', 10169.49, 1830.51, 12000.00, 'emitida', '2026-04-24', '2026-04-24', NULL, 1, '2026-04-24 15:00:00', '2026-04-25 12:07:08'),
	(19, 1, 39, 49, 'FAC-208', 11440.68, 2059.32, 13500.00, 'emitida', '2026-01-23', '2026-01-23', NULL, 1, '2026-01-23 15:00:00', '2026-04-25 12:07:08'),
	(20, 1, 40, 50, 'FAC-209', 12711.86, 2288.14, 15000.00, 'emitida', '2026-02-25', '2026-02-25', NULL, 1, '2026-02-25 15:00:00', '2026-04-25 12:07:08');

-- Volcando estructura para tabla ventas_crm.invoice_items
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `unit_price` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.invoice_items: ~0 rows (aproximadamente)
DELETE FROM `invoice_items`;

-- Volcando estructura para tabla ventas_crm.opportunities
CREATE TABLE IF NOT EXISTS `opportunities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_id` int DEFAULT NULL,
  `stage_id` int DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT '0.00',
  `probability` int DEFAULT '0',
  `close_date` date DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('open','won','lost') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `contact_id` (`contact_id`),
  KEY `stage_id` (`stage_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `opportunities_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `opportunities_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `opportunities_ibfk_3` FOREIGN KEY (`stage_id`) REFERENCES `pipeline_stages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `opportunities_ibfk_4` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `opportunities_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.opportunities: ~20 rows (aproximadamente)
DELETE FROM `opportunities`;
INSERT INTO `opportunities` (`id`, `tenant_id`, `title`, `contact_id`, `stage_id`, `amount`, `probability`, `close_date`, `assigned_to`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
	(22, 1, 'Implementación ERP', 31, 7, 15000.00, 10, '2026-05-15', 1, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(23, 1, 'Migración a Cloud', 32, 8, 8500.00, 30, '2026-05-20', 2, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(24, 1, 'Auditoría Anual', 33, 9, 4000.00, 60, '2026-04-30', 3, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(25, 1, 'Renovación Licencias', 34, 10, 12000.00, 90, '2026-04-28', 1, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(26, 1, 'Desarrollo App Móvil', 35, 11, 25000.00, 100, '2026-04-10', 2, NULL, 'won', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(27, 1, 'Consultoría Estratégica', 36, 12, 6000.00, 0, '2026-04-12', 3, NULL, 'lost', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(28, 1, 'Mantenimiento Servidores', 37, 7, 3500.00, 15, '2026-06-01', 1, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(29, 1, 'Paquete de Seguridad', 38, 8, 9200.00, 40, '2026-05-10', 2, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(30, 1, 'Soporte Corporativo', 39, 11, 18000.00, 100, '2026-03-25', 1, NULL, 'won', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(31, 1, 'Capacitación Equipo', 40, 10, 7500.00, 80, '2026-05-05', 3, NULL, 'open', NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(32, 1, 'Proyecto 1', 41, 12, 1500.00, 0, NULL, 1, NULL, 'won', NULL, '2026-01-15 15:00:00', '2026-04-25 12:07:08'),
	(33, 1, 'Proyecto 2', 42, 11, 3000.00, 0, NULL, 1, NULL, 'won', NULL, '2026-02-04 15:00:00', '2026-04-25 12:07:08'),
	(34, 1, 'Proyecto 3', 43, 8, 4500.00, 0, NULL, 1, NULL, 'open', NULL, '2026-03-28 15:00:00', '2026-04-25 12:07:08'),
	(35, 1, 'Proyecto 4', 44, 9, 6000.00, 0, NULL, 1, NULL, 'open', NULL, '2026-04-01 15:00:00', '2026-04-25 12:07:08'),
	(36, 1, 'Proyecto 5', 45, 11, 7500.00, 0, NULL, 1, NULL, 'won', NULL, '2026-01-01 15:00:00', '2026-04-25 12:07:08'),
	(37, 1, 'Proyecto 6', 46, 7, 9000.00, 0, NULL, 1, NULL, 'won', NULL, '2026-02-15 15:00:00', '2026-04-25 12:07:08'),
	(38, 1, 'Proyecto 7', 47, 8, 10500.00, 0, NULL, 1, NULL, 'open', NULL, '2026-03-22 15:00:00', '2026-04-25 12:07:08'),
	(39, 1, 'Proyecto 8', 48, 9, 12000.00, 0, NULL, 1, NULL, 'open', NULL, '2026-04-02 15:00:00', '2026-04-25 12:07:08'),
	(40, 1, 'Proyecto 9', 49, 7, 13500.00, 0, NULL, 1, NULL, 'won', NULL, '2026-01-03 15:00:00', '2026-04-25 12:07:08'),
	(41, 1, 'Proyecto 10', 50, 10, 15000.00, 0, NULL, 1, NULL, 'won', NULL, '2026-02-03 15:00:00', '2026-04-25 12:07:08');

-- Volcando estructura para tabla ventas_crm.pipeline_stages
CREATE TABLE IF NOT EXISTS `pipeline_stages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#3B82F6',
  `order_index` int DEFAULT '0',
  `is_default` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `pipeline_stages_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.pipeline_stages: ~6 rows (aproximadamente)
DELETE FROM `pipeline_stages`;
INSERT INTO `pipeline_stages` (`id`, `tenant_id`, `name`, `color`, `order_index`, `is_default`) VALUES
	(7, 1, 'Prospecto', '#6B7280', 1, 0),
	(8, 1, 'Calificado', '#3B82F6', 2, 0),
	(9, 1, 'Propuesta', '#F59E0B', 3, 0),
	(10, 1, 'Negociación', '#8B5CF6', 4, 0),
	(11, 1, 'Ganado', '#10B981', 5, 1),
	(12, 1, 'Perdido', '#EF4444', 6, 0);

-- Volcando estructura para tabla ventas_crm.price_lists
CREATE TABLE IF NOT EXISTS `price_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_pct` decimal(5,2) DEFAULT '0.00',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `price_lists_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.price_lists: ~3 rows (aproximadamente)
DELETE FROM `price_lists`;

-- Volcando estructura para tabla ventas_crm.price_list_items
CREATE TABLE IF NOT EXISTS `price_list_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `price_list_id` int NOT NULL,
  `product_id` int NOT NULL,
  `price` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `price_list_id` (`price_list_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `price_list_items_ibfk_1` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `price_list_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.price_list_items: ~0 rows (aproximadamente)
DELETE FROM `price_list_items`;

-- Volcando estructura para tabla ventas_crm.products
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(15,2) DEFAULT '0.00',
  `cost` decimal(15,2) DEFAULT '0.00',
  `stock` int DEFAULT '0',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unidad',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.products: ~10 rows (aproximadamente)
DELETE FROM `products`;
INSERT INTO `products` (`id`, `tenant_id`, `sku`, `name`, `description`, `category`, `price`, `cost`, `stock`, `unit`, `active`, `created_at`, `updated_at`) VALUES
	(26, 1, 'SKU-001', 'Licencia Software Pro', 'Licencia anual para software', 'Software', 500.00, 200.00, 100, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(27, 1, 'SKU-002', 'Consultoría Básica', 'Paquete de 10 horas', 'Servicios', 1000.00, 500.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(28, 1, 'SKU-003', 'Servidor Cloud M', 'Servidor virtual mediano', 'Infraestructura', 150.00, 100.00, 50, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(29, 1, 'SKU-004', 'Servidor Cloud L', 'Servidor virtual grande', 'Infraestructura', 300.00, 200.00, 50, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(30, 1, 'SKU-005', 'Auditoría de Seguridad', 'Revisión completa de sistemas', 'Servicios', 2500.00, 1000.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(31, 1, 'SKU-006', 'Soporte Premium 24/7', 'Soporte técnico mensual', 'Servicios', 800.00, 300.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(32, 1, 'SKU-007', 'Desarrollo Web E-commerce', 'Desarrollo de tienda online', 'Desarrollo', 4500.00, 2000.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(33, 1, 'SKU-008', 'Mantenimiento Mensual', 'Mantenimiento preventivo', 'Servicios', 250.00, 100.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(34, 1, 'SKU-009', 'Migración de Datos', 'Migración a la nube', 'Servicios', 1200.00, 600.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(35, 1, 'SKU-010', 'Capacitación Personal', 'Curso de 40 horas', 'Educación', 1800.00, 800.00, 0, 'unidad', 1, '2026-04-25 12:06:59', '2026-04-25 12:06:59');

-- Volcando estructura para tabla ventas_crm.push_subscriptions
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `p256dh` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `auth` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.push_subscriptions: ~0 rows (aproximadamente)
DELETE FROM `push_subscriptions`;

-- Volcando estructura para tabla ventas_crm.quotes
CREATE TABLE IF NOT EXISTS `quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_id` int DEFAULT NULL,
  `opportunity_id` int DEFAULT NULL,
  `status` enum('borrador','enviada','aprobada','rechazada','convertida') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `discount` decimal(15,2) DEFAULT '0.00',
  `tax` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `valid_until` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `contact_id` (`contact_id`),
  KEY `opportunity_id` (`opportunity_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `quotes_ibfk_2` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quotes_ibfk_3` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quotes_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quotes_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.quotes: ~20 rows (aproximadamente)
DELETE FROM `quotes`;
INSERT INTO `quotes` (`id`, `tenant_id`, `number`, `contact_id`, `opportunity_id`, `status`, `subtotal`, `discount`, `tax`, `total`, `notes`, `valid_until`, `created_by`, `approved_by`, `created_at`, `updated_at`) VALUES
	(21, 1, 'COT-2026-001', 31, 22, 'borrador', 8987.76, 0.00, 1438.04, 10425.80, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(22, 1, 'COT-2026-002', 32, 23, 'enviada', 3949.38, 0.00, 631.90, 4581.28, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(23, 1, 'COT-2026-003', 33, 24, 'aprobada', 9428.60, 0.00, 1508.58, 10937.18, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(24, 1, 'COT-2026-004', 34, 25, 'rechazada', 7821.11, 0.00, 1251.38, 9072.49, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(25, 1, 'COT-2026-005', 35, 26, 'convertida', 8742.36, 0.00, 1398.78, 10141.13, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(26, 1, 'COT-2026-006', 36, 27, 'borrador', 10258.67, 0.00, 1641.39, 11900.05, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(27, 1, 'COT-2026-007', 37, 28, 'enviada', 9147.31, 0.00, 1463.57, 10610.88, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(28, 1, 'COT-2026-008', 38, 29, 'aprobada', 10588.16, 0.00, 1694.11, 12282.27, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(29, 1, 'COT-2026-009', 39, 30, 'rechazada', 2548.44, 0.00, 407.75, 2956.19, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(30, 1, 'COT-2026-010', 40, 31, 'convertida', 5616.82, 0.00, 898.69, 6515.51, NULL, '2026-05-30', NULL, NULL, '2026-04-25 12:06:59', '2026-04-25 12:06:59'),
	(31, 1, 'COT-200', 41, 32, 'aprobada', 1271.19, 0.00, 228.81, 1500.00, NULL, NULL, NULL, NULL, '2026-01-21 15:00:00', '2026-04-25 12:07:08'),
	(32, 1, 'COT-201', 42, 33, 'aprobada', 2542.37, 0.00, 457.63, 3000.00, NULL, NULL, NULL, NULL, '2026-02-09 15:00:00', '2026-04-25 12:07:08'),
	(33, 1, 'COT-202', 43, 34, 'aprobada', 3813.56, 0.00, 686.44, 4500.00, NULL, NULL, NULL, NULL, '2026-03-10 15:00:00', '2026-04-25 12:07:08'),
	(34, 1, 'COT-203', 44, 35, 'aprobada', 5084.75, 0.00, 915.25, 6000.00, NULL, NULL, NULL, NULL, '2026-04-11 15:00:00', '2026-04-25 12:07:08'),
	(35, 1, 'COT-204', 45, 36, 'aprobada', 6355.93, 0.00, 1144.07, 7500.00, NULL, NULL, NULL, NULL, '2026-01-15 15:00:00', '2026-04-25 12:07:08'),
	(36, 1, 'COT-205', 46, 37, 'aprobada', 7627.12, 0.00, 1372.88, 9000.00, NULL, NULL, NULL, NULL, '2026-02-16 15:00:00', '2026-04-25 12:07:08'),
	(37, 1, 'COT-206', 47, 38, 'aprobada', 8898.31, 0.00, 1601.69, 10500.00, NULL, NULL, NULL, NULL, '2026-03-23 15:00:00', '2026-04-25 12:07:08'),
	(38, 1, 'COT-207', 48, 39, 'aprobada', 10169.49, 0.00, 1830.51, 12000.00, NULL, NULL, NULL, NULL, '2026-04-24 15:00:00', '2026-04-25 12:07:08'),
	(39, 1, 'COT-208', 49, 40, 'aprobada', 11440.68, 0.00, 2059.32, 13500.00, NULL, NULL, NULL, NULL, '2026-01-23 15:00:00', '2026-04-25 12:07:08'),
	(40, 1, 'COT-209', 50, 41, 'aprobada', 12711.86, 0.00, 2288.14, 15000.00, NULL, NULL, NULL, NULL, '2026-02-25 15:00:00', '2026-04-25 12:07:08');

-- Volcando estructura para tabla ventas_crm.quote_items
CREATE TABLE IF NOT EXISTS `quote_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `description` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `unit_price` decimal(15,2) DEFAULT '0.00',
  `discount_pct` decimal(5,2) DEFAULT '0.00',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `quote_id` (`quote_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `quote_items_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.quote_items: ~0 rows (aproximadamente)
DELETE FROM `quote_items`;

-- Volcando estructura para tabla ventas_crm.tenants
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.tenants: ~1 rows (aproximadamente)
DELETE FROM `tenants`;
INSERT INTO `tenants` (`id`, `name`, `created_at`) VALUES
	(1, 'Mi Empresa CRM', '2026-04-25 06:24:50');

-- Volcando estructura para tabla ventas_crm.tenant_settings
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `company_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_email` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_address` text COLLATE utf8mb4_unicode_ci,
  `company_website` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_ruc` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` text COLLATE utf8mb4_unicode_ci,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'PEN',
  `currency_symbol` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'S/',
  `currency_position` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'before',
  `tax_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'IGV',
  `tax_rate` decimal(5,2) DEFAULT '18.00',
  `tax_enabled` tinyint(1) DEFAULT '1',
  `decimal_separator` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT '.',
  `thousands_separator` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT ',',
  `date_format` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'DD/MM/YYYY',
  `smtp_host` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_port` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '587',
  `smtp_secure` tinyint(1) DEFAULT '0',
  `smtp_user` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_pass` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_from` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_footer` text COLLATE utf8mb4_unicode_ci,
  `quote_notes` text COLLATE utf8mb4_unicode_ci,
  `quote_validity_days` int DEFAULT '30',
  `invoice_prefix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'FAC-',
  `quote_prefix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'COT-',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.tenant_settings: ~0 rows (aproximadamente)
DELETE FROM `tenant_settings`;
INSERT INTO `tenant_settings` (`id`, `tenant_id`, `company_name`, `company_email`, `company_phone`, `company_address`, `company_website`, `company_ruc`, `company_industry`, `company_country`, `company_city`, `logo_url`, `currency`, `currency_symbol`, `currency_position`, `tax_name`, `tax_rate`, `tax_enabled`, `decimal_separator`, `thousands_separator`, `date_format`, `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `smtp_from`, `quote_footer`, `quote_notes`, `quote_validity_days`, `invoice_prefix`, `quote_prefix`, `updated_at`) VALUES
	(1, 1, '', '', '', '', '', '', '', '', '', '', 'PEN', 'S/', 'before', 'IGV', 18.00, 1, '.', ',', 'DD/MM/YYYY', '', '587', 0, '', NULL, '', '', '', 30, 'FAC-', 'COT-', '2026-04-25 12:20:49');

-- Volcando estructura para tabla ventas_crm.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','gerente','vendedor') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vendedor',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.users: ~3 rows (aproximadamente)
DELETE FROM `users`;
INSERT INTO `users` (`id`, `tenant_id`, `name`, `email`, `password`, `role`, `avatar`, `active`, `created_at`) VALUES
	(1, 1, 'Administrador', 'admin@crm.com', '$2a$10$g12569FdYFfgsrK2wap1MuKFMPH3OEZjZCsAQIWVavwuomKy7fSkC', 'admin', NULL, 1, '2026-04-25 06:24:50'),
	(2, 1, 'Carlos Mendoza', 'carlos@crm.com', '$2a$10$RUas8dn8yxmpeAVgpglm0.BrvkGe6AkSTPp8Zpj57BDn1y2C.EE4i', 'vendedor', NULL, 1, '2026-04-25 06:43:57'),
	(3, 1, 'Laura Gómez', 'laura@crm.com', '$2a$10$RUas8dn8yxmpeAVgpglm0.BrvkGe6AkSTPp8Zpj57BDn1y2C.EE4i', 'vendedor', NULL, 1, '2026-04-25 06:43:57');

-- Volcando estructura para tabla ventas_crm.workflows
CREATE TABLE IF NOT EXISTS `workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nodes_json` json DEFAULT NULL,
  `edges_json` json DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.workflows: ~0 rows (aproximadamente)
DELETE FROM `workflows`;

-- Volcando estructura para tabla ventas_crm.workflow_jobs
CREATE TABLE IF NOT EXISTS `workflow_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `workflow_id` int NOT NULL,
  `record_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `current_node_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_data` json DEFAULT NULL,
  `execute_after` datetime DEFAULT NULL,
  `status` enum('pending','sleeping','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla ventas_crm.workflow_jobs: ~0 rows (aproximadamente)
DELETE FROM `workflow_jobs`;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

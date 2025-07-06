-- Limpieza previa
DROP TABLE IF EXISTS user_keys;
DROP TABLE IF EXISTS users;

-- Crear tabla users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','profesor','owner') DEFAULT 'profesor',
  active_key_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Crear tabla user_keys
CREATE TABLE user_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  private_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiration_date DATETIME NOT NULL,
  encryption_type VARCHAR(32) DEFAULT 'aes-256-cbc',
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar usuarios admin y owner (contraseña: 123)
INSERT INTO users (nombre, usuario, password, rol) VALUES
('Administrador', 'admin', '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe', 'admin'),
('Owner', 'owner', '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe', 'owner');

-- Asignar la llave válida como activa para cada usuario
UPDATE users SET active_key_id = (
    SELECT id FROM user_keys WHERE user_id = users.id AND expiration_date = '2026-05-01 00:00:00' LIMIT 1
);

COMMIT;
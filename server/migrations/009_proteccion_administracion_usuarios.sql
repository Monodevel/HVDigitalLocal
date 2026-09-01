-- HVDigital: endurecimiento de las tablas de identidad frente al puente SQL heredado.
-- El usuario inicial (id=1) es la cuenta ADMIN de la instalación.

DROP TRIGGER IF EXISTS trg_usuarios_update_guard;
CREATE TRIGGER trg_usuarios_update_guard
BEFORE UPDATE ON usuarios
FOR EACH ROW
BEGIN
  IF COALESCE(@hvdigital_usuario_id, 0) <> OLD.id
     AND COALESCE(@hvdigital_usuario_id, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'HVDigital: solo ADMIN puede modificar otras cuentas';
  END IF;
END;

DROP TRIGGER IF EXISTS trg_usuarios_delete_guard;
CREATE TRIGGER trg_usuarios_delete_guard
BEFORE DELETE ON usuarios
FOR EACH ROW
BEGIN
  IF COALESCE(@hvdigital_usuario_id, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'HVDigital: solo ADMIN puede eliminar cuentas';
  END IF;
END;

DROP TRIGGER IF EXISTS trg_calificador_directo_update_guard;
CREATE TRIGGER trg_calificador_directo_update_guard
BEFORE UPDATE ON calificadores_directos
FOR EACH ROW
BEGIN
  IF COALESCE(@hvdigital_usuario_id, 0) <> 1
     AND NOT EXISTS (
       SELECT 1 FROM usuarios u
       WHERE u.id = COALESCE(@hvdigital_usuario_id, 0)
         AND u.calificador_directo_id = OLD.id
     ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'HVDigital: perfil de calificador fuera del espacio autorizado';
  END IF;
END;

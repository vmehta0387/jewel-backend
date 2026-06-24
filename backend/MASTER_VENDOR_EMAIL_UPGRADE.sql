DELIMITER $$

DROP PROCEDURE IF EXISTS upgrade_design_masters_vendor_email $$

CREATE PROCEDURE upgrade_design_masters_vendor_email()
BEGIN
  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'vendor_email'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN vendor_email VARCHAR(255) NULL AFTER description;
  END IF;
END $$

CALL upgrade_design_masters_vendor_email() $$

DROP PROCEDURE IF EXISTS upgrade_design_masters_vendor_email $$

DELIMITER ;

-- 1. Add 'last_exit_date' column to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS last_exit_date TIMESTAMPTZ;

-- 2. Backfill existing data (Find max created_at of SEPARATED items for each material)
WITH max_dates AS (
    SELECT 
        sri.material_id, 
        MAX(sr.created_at) as last_exit
    FROM stock_request_items sri
    JOIN stock_requests sr ON sri.request_id = sr.id
    WHERE sr.status IN ('SEPARATED', 'DELIVERED')
    GROUP BY sri.material_id
)
UPDATE materials m
SET last_exit_date = md.last_exit
FROM max_dates md
WHERE m.id = md.material_id;

-- Legg til bot_instructions-kolonne for per-klinikk AI-personlighet
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS bot_instructions text;

-- Legg til admin-passord på klinikker
-- Kjør i Supabase SQL Editor: https://app.supabase.com → SQL Editor

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS admin_password text;

-- Sett passord for demo-klinikken (valgfritt – demo bruker fortsatt env var ADMIN_PASSWORD)
-- UPDATE clinics SET admin_password = 'ditt-passord-her' WHERE id = 'demo';

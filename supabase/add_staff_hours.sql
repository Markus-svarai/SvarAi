-- Arbeidsplan per ansatt
CREATE TABLE IF NOT EXISTS clinic_staff_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL,
  day         text NOT NULL, -- 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'
  open        text,          -- '08:00' — null hvis stengt
  close       text,          -- '16:00' — null hvis stengt
  closed      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clinic_staff_hours_staff_day
  ON clinic_staff_hours(staff_id, day);

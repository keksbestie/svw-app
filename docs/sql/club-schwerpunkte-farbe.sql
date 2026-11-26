-- Vereinsfarbe und Vereins-Schwerpunkte (idempotent: kann beliebig oft ausgeführt werden).
-- primary_color: Kennung aus der Farbpalette der App (NULL = Standard-Grün)
-- focus_points : Liste der Schwerpunkte, z. B. [{"title":"Defensivverhalten","text":"..."}]
-- Wer ändern darf, regeln die bestehenden Rechte (RLS) der Tabelle "clubs" – in der App speichert nur die Vereins-Leitung (club_admin).
-- Alle Mitglieder eines Vereins lesen die Spalten über dieselbe Lese-Regel wie bisher Name und Logo.

alter table public.clubs add column if not exists primary_color text;
alter table public.clubs add column if not exists focus_points jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_primary_color_check') then
    alter table public.clubs add constraint clubs_primary_color_check
      check (primary_color is null or primary_color in ('rot','blau','lila','orange','gelb','tuerkis','pink','schwarz'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clubs_focus_points_check') then
    alter table public.clubs add constraint clubs_focus_points_check
      check (jsonb_typeof(focus_points) = 'array' and jsonb_array_length(focus_points) <= 8);
  end if;
end $$;

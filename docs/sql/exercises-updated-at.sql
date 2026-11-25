-- Änderungszeitpunkt für den Übungskatalog
-- Einmal im Supabase SQL-Editor ausführen. Danach lädt die App im Hintergrund
-- nur noch neue oder geänderte Übungen nach statt jede Minute den ganzen Katalog.
-- Das Skript kann gefahrlos mehrfach ausgeführt werden.

alter table public.exercises
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- Beschleunigt die Abfrage „id + updated_at der freigegebenen Übungen“
create index if not exists exercises_status_updated_at_idx
  on public.exercises (status, updated_at);

-- Sportarten pro Nutzer: Primärsportart (bei der Anmeldung gewählt) und Liste freigeschalteter Sportarten.
-- Spätere Pakete hängen an primary_sport. Einmal im Supabase SQL-Editor ausführen, mehrfach ausführbar.
-- Bestehende Nutzer: Primärsportart = erste Reviewer-Sportart, sonst Fußball.

alter table public.profiles
  add column if not exists primary_sport text,
  add column if not exists unlocked_sports text[] not null default '{}';

update public.profiles
set primary_sport = coalesce(reviewer_sports[1], 'fussball'),
    unlocked_sports = (
      select array_agg(distinct s)
      from unnest(array_append(coalesce(reviewer_sports, '{}'), coalesce(reviewer_sports[1], 'fussball'))) as s
    )
where primary_sport is null;

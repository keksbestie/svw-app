-- Spieler gehören zu einer Sportart (Kader wird nur in der jeweiligen Sportart angezeigt).
-- Bestehende Spieler gelten als Fußball.
alter table public.players add column if not exists sport text not null default 'fussball';

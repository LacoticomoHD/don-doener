-- ============================================================================
-- Don Döner v2 – Datenbank-Update auf dem bestehenden Live-Stand
--
-- Voraussetzung: Tabellen shops, ratings, reports, favorites,
-- shop_feature_votes, app_admins, price_history, hours_votes, shop_edits
-- existieren bereits (Stand Juli 2026). Es werden keine Daten gelöscht.
-- Sicherung vor dem Update: Schema backup_20260926.
--
-- Was sich ändert:
--   * Datenschutz: Einzelbewertungen und Abstimmungen sind nur noch für die
--     eigene Person lesbar (vorher konnte jede:r – auch ohne Login – alle
--     Bewertungen samt Nutzer-ID abrufen). Öffentlich sind nur noch
--     anonyme Schnitte, gepflegt per Trigger in Statistik-Tabellen.
--   * Performance: Die Karte fragt keine Aggregat-Views über alle
--     Bewertungen mehr ab, sondern fertige Statistik-Zeilen.
--   * Läden bleiben Community-editierbar (Wiki-Prinzip mit shop_edits-Log),
--     aber created_by, created_at und ausgeblendet kann nur noch der
--     Server ändern.
--   * Öffnungszeiten-Feedback wird serverseitig zurückgesetzt, sobald sich
--     die Zeiten ändern (vorher musste das die App tun).
--   * Admins dürfen Läden löschen und Meldungen entfernen.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Statistik-Tabellen (per Trigger gepflegt, öffentlich lesbar)
-- ---------------------------------------------------------------------------
create table if not exists public.shop_stats (
  shop_id              uuid primary key references public.shops (id) on delete cascade,
  rating_count         int not null default 0,
  verified_count       int not null default 0,
  avg_geschmack        float8,
  avg_fleischqualitaet float8,
  avg_sossenqualitaet  float8,
  avg_freundlichkeit   float8,
  avg_sauberkeit       float8,
  avg_preis_leistung   float8,
  avg_wartezeit        float8,
  avg_gesamt           float8
);

create table if not exists public.shop_feature_stats (
  shop_id       uuid not null references public.shops (id) on delete cascade,
  feature       text not null,
  bestaetigt    int not null default 0,
  widersprochen int not null default 0,
  score         int not null default 0,
  primary key (shop_id, feature)
);

create index if not exists shop_feature_stats_positive_idx
  on public.shop_feature_stats (shop_id) where score > 0;

create table if not exists public.shop_hours_stats (
  shop_id    uuid primary key references public.shops (id) on delete cascade,
  bestaetigt int not null default 0,
  veraltet   int not null default 0,
  score      int not null default 0
);

create or replace function public.refresh_shop_stats(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shop_stats where shop_id = p_shop_id;
  insert into public.shop_stats (
    shop_id, rating_count, verified_count, avg_geschmack, avg_fleischqualitaet,
    avg_sossenqualitaet, avg_freundlichkeit, avg_sauberkeit, avg_preis_leistung,
    avg_wartezeit, avg_gesamt
  )
  select
    r.shop_id,
    count(*)::int,
    (count(*) filter (where r.verified))::int,
    round(avg(r.geschmack), 2)::float8,
    round(avg(r.fleischqualitaet), 2)::float8,
    round(avg(r.sossenqualitaet), 2)::float8,
    round(avg(r.freundlichkeit), 2)::float8,
    round(avg(r.sauberkeit), 2)::float8,
    round(avg(r.preis_leistung), 2)::float8,
    round(avg(r.wartezeit), 2)::float8,
    -- Fleischqualität ist optional (z. B. bei vegetarischer Bestellung)
    round(avg(
      case
        when r.fleischqualitaet is null then
          (r.geschmack + r.sossenqualitaet + r.freundlichkeit + r.sauberkeit
            + r.preis_leistung + r.wartezeit)::numeric / 6.0
        else
          (r.geschmack + r.fleischqualitaet + r.sossenqualitaet + r.freundlichkeit
            + r.sauberkeit + r.preis_leistung + r.wartezeit)::numeric / 7.0
      end
    ), 2)::float8
  from public.ratings r
  where r.shop_id = p_shop_id
  group by r.shop_id;
end;
$$;

create or replace function public.refresh_shop_feature_stats(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shop_feature_stats where shop_id = p_shop_id;
  insert into public.shop_feature_stats (shop_id, feature, bestaetigt, widersprochen, score)
  select
    v.shop_id,
    v.feature,
    (count(*) filter (where v.vote = 1))::int,
    (count(*) filter (where v.vote = -1))::int,
    coalesce(sum(v.vote), 0)::int
  from public.shop_feature_votes v
  where v.shop_id = p_shop_id
  group by v.shop_id, v.feature;
end;
$$;

create or replace function public.refresh_shop_hours_stats(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shop_hours_stats where shop_id = p_shop_id;
  insert into public.shop_hours_stats (shop_id, bestaetigt, veraltet, score)
  select
    v.shop_id,
    (count(*) filter (where v.vote = 1))::int,
    (count(*) filter (where v.vote = -1))::int,
    coalesce(sum(v.vote), 0)::int
  from public.hours_votes v
  where v.shop_id = p_shop_id
  group by v.shop_id;
end;
$$;

-- Ein gemeinsamer Trigger je Tabelle: alte und neue shop_id neu berechnen.
create or replace function public.on_stats_source_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids uuid[];
  sid uuid;
begin
  ids := array_remove(array[
    case when tg_op in ('UPDATE', 'DELETE') then old.shop_id end,
    case when tg_op in ('INSERT', 'UPDATE') then new.shop_id end
  ], null);
  foreach sid in array (select array_agg(distinct x) from unnest(ids) x) loop
    if tg_table_name = 'ratings' then
      perform public.refresh_shop_stats(sid);
    elsif tg_table_name = 'shop_feature_votes' then
      perform public.refresh_shop_feature_stats(sid);
    elsif tg_table_name = 'hours_votes' then
      perform public.refresh_shop_hours_stats(sid);
    end if;
  end loop;
  return null;
end;
$$;

-- Nur Trigger rufen diese Funktionen auf, nicht die App.
revoke execute on function public.refresh_shop_stats(uuid)         from public, anon, authenticated;
revoke execute on function public.refresh_shop_feature_stats(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_shop_hours_stats(uuid)   from public, anon, authenticated;
revoke execute on function public.on_stats_source_change()         from public, anon, authenticated;

drop trigger if exists ratings_stats on public.ratings;
create trigger ratings_stats
  after insert or update or delete on public.ratings
  for each row execute function public.on_stats_source_change();

drop trigger if exists feature_votes_stats on public.shop_feature_votes;
create trigger feature_votes_stats
  after insert or update or delete on public.shop_feature_votes
  for each row execute function public.on_stats_source_change();

drop trigger if exists hours_votes_stats on public.hours_votes;
create trigger hours_votes_stats
  after insert or update or delete on public.hours_votes
  for each row execute function public.on_stats_source_change();

-- ---------------------------------------------------------------------------
-- 2) Laden-Trigger
-- ---------------------------------------------------------------------------
-- Öffnungszeiten geändert → bisheriges Feedback („stimmt noch?") verwerfen
create or replace function public.reset_hours_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.opening_hours is distinct from old.opening_hours then
    delete from public.hours_votes where shop_id = new.id;
  end if;
  return null;
end;
$$;

revoke execute on function public.reset_hours_votes() from public, anon, authenticated;

drop trigger if exists shops_hours_reset on public.shops;
create trigger shops_hours_reset
  after update of opening_hours on public.shops
  for each row execute function public.reset_hours_votes();

-- Verwaltungsfelder kann die App nicht überschreiben – nur Server-Funktionen
-- (die als Tabelleneigentümer laufen, z. B. refresh_shop_hidden).
create or replace function public.protect_shop_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.created_by   := old.created_by;
    new.created_at   := old.created_at;
    new.ausgeblendet := old.ausgeblendet;
  end if;
  return new;
end;
$$;

drop trigger if exists shops_protect_columns on public.shops;
create trigger shops_protect_columns
  before update on public.shops
  for each row execute function public.protect_shop_columns();

-- ---------------------------------------------------------------------------
-- 3) Views – Namen und Spalten bleiben wie bisher, damit die installierte
--    App v1.x bis zum Update weiterläuft. Die Schnitte kommen jetzt aus
--    den Statistik-Tabellen.
-- ---------------------------------------------------------------------------
drop view if exists public.shops_overview;
drop view if exists public.shop_rating_summary;
drop view if exists public.shop_feature_summary;
drop view if exists public.hours_vote_summary;

create view public.shop_rating_summary
with (security_invoker = true) as
select
  shop_id, rating_count, verified_count as verifiziert_count,
  avg_geschmack, avg_fleischqualitaet, avg_sossenqualitaet, avg_freundlichkeit,
  avg_sauberkeit, avg_preis_leistung, avg_wartezeit, avg_gesamt
from public.shop_stats;

create view public.shop_feature_summary
with (security_invoker = true) as
select shop_id, feature, bestaetigt, widersprochen, score
from public.shop_feature_stats;

create view public.hours_vote_summary
with (security_invoker = true) as
select shop_id, bestaetigt, veraltet, score
from public.shop_hours_stats;

create view public.shops_overview
with (security_invoker = true) as
select
  s.id, s.name, s.address, s.latitude, s.longitude, s.opening_hours, s.features,
  s.doener_preis, s.created_by, s.created_at, s.city, s.dueruem_preis,
  s.preis_bestaetigt_am, s.kartenzahlung, s.ausgeblendet, s.doener_gross_preis,
  s.menue_preis,
  coalesce(st.rating_count, 0)   as rating_count,
  coalesce(st.verified_count, 0) as verifiziert_count,
  st.avg_geschmack,
  st.avg_fleischqualitaet,
  st.avg_sossenqualitaet,
  st.avg_freundlichkeit,
  st.avg_sauberkeit,
  st.avg_preis_leistung,
  st.avg_wartezeit,
  st.avg_gesamt,
  case
    when s.doener_preis > 0 and st.avg_gesamt is not null
    then round((st.avg_gesamt / s.doener_preis)::numeric, 3)::float8
  end as value_score,
  coalesce(
    (select array_agg(fs.feature order by fs.feature)
       from public.shop_feature_stats fs
      where fs.shop_id = s.id and fs.score > 0),
    '{}'::text[]
  ) as features_confirmed
from public.shops s
left join public.shop_stats st on st.shop_id = s.id
where not s.ausgeblendet;

-- city_stats bleibt unverändert bestehen (liest nur shops).

-- ---------------------------------------------------------------------------
-- 4) Funktionen für die App
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Row-Level-Security
-- ---------------------------------------------------------------------------
alter table public.shop_stats         enable row level security;
alter table public.shop_feature_stats enable row level security;
alter table public.shop_hours_stats   enable row level security;

-- Alle bisherigen Regeln ersetzen (Sicherung: backup_20260926.policies)
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('shops', 'ratings', 'reports', 'favorites', 'shop_feature_votes',
        'app_admins', 'price_history', 'hours_votes', 'shop_edits', 'shop_stats',
        'shop_feature_stats', 'shop_hours_stats')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

-- Läden: alle lesen; Angemeldete anlegen und korrigieren (Wiki, geloggt in
-- shop_edits); löschen nur Ersteller:in oder Admin
create policy "shops_select" on public.shops
  for select to anon, authenticated using (true);
create policy "shops_insert" on public.shops
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "shops_update" on public.shops
  for update to authenticated using (true) with check (true);
create policy "shops_delete" on public.shops
  for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

-- Öffentliche, anonyme Daten
create policy "shop_stats_select" on public.shop_stats
  for select to anon, authenticated using (true);
create policy "shop_feature_stats_select" on public.shop_feature_stats
  for select to anon, authenticated using (true);
create policy "shop_hours_stats_select" on public.shop_hours_stats
  for select to anon, authenticated using (true);
create policy "price_history_select" on public.price_history
  for select to anon, authenticated using (true);

-- Bewertungen: nur die eigenen
create policy "ratings_select_own" on public.ratings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ratings_insert_own" on public.ratings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "ratings_update_own" on public.ratings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ratings_delete_own" on public.ratings
  for delete to authenticated using (user_id = (select auth.uid()));

-- Besonderheiten: nur eigene Stimmen; abstimmen darf, wer bewertet oder den
-- Laden angelegt hat
create policy "feature_votes_select_own" on public.shop_feature_votes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "feature_votes_insert_own" on public.shop_feature_votes
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.ratings r
              where r.shop_id = shop_feature_votes.shop_id and r.user_id = (select auth.uid()))
      or exists (select 1 from public.shops sh
                 where sh.id = shop_feature_votes.shop_id and sh.created_by = (select auth.uid()))
    )
  );
create policy "feature_votes_update_own" on public.shop_feature_votes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "feature_votes_delete_own" on public.shop_feature_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Öffnungszeiten-Feedback: nur eigene Stimme
create policy "hours_votes_select_own" on public.hours_votes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "hours_votes_insert_own" on public.hours_votes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "hours_votes_update_own" on public.hours_votes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "hours_votes_delete_own" on public.hours_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Favoriten: nur eigene
create policy "favorites_select_own" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites_insert_own" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favorites_delete_own" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

-- Meldungen: eigene anlegen/sehen; Admins sehen, bearbeiten und löschen alle
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reports_select" on public.reports
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "reports_update_admin" on public.reports
  for update to authenticated using ((select public.is_admin()));
create policy "reports_delete_admin" on public.reports
  for delete to authenticated using ((select public.is_admin()));

-- Änderungsprotokoll: nur Admins
create policy "shop_edits_select_admin" on public.shop_edits
  for select to authenticated using ((select public.is_admin()));

-- Admins: jede:r sieht nur den eigenen Eintrag
create policy "admins_select_self" on public.app_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6) Fehlende Indizes für Fremdschlüssel
-- ---------------------------------------------------------------------------
create index if not exists ratings_user_id_idx       on public.ratings (user_id);
create index if not exists reports_user_id_idx       on public.reports (user_id);
create index if not exists favorites_shop_id_idx     on public.favorites (shop_id);
create index if not exists feature_votes_user_id_idx on public.shop_feature_votes (user_id);
create index if not exists hours_votes_user_id_idx   on public.hours_votes (user_id);
create index if not exists shop_edits_shop_id_idx    on public.shop_edits (shop_id);
create index if not exists shop_edits_user_id_idx    on public.shop_edits (user_id);

-- ---------------------------------------------------------------------------
-- 7) Statistiken initial aufbauen (mengenbasiert statt Laden für Laden)
-- ---------------------------------------------------------------------------
truncate public.shop_stats, public.shop_feature_stats, public.shop_hours_stats;

insert into public.shop_stats (
  shop_id, rating_count, verified_count, avg_geschmack, avg_fleischqualitaet,
  avg_sossenqualitaet, avg_freundlichkeit, avg_sauberkeit, avg_preis_leistung,
  avg_wartezeit, avg_gesamt
)
select
  r.shop_id,
  count(*)::int,
  (count(*) filter (where r.verified))::int,
  round(avg(r.geschmack), 2)::float8,
  round(avg(r.fleischqualitaet), 2)::float8,
  round(avg(r.sossenqualitaet), 2)::float8,
  round(avg(r.freundlichkeit), 2)::float8,
  round(avg(r.sauberkeit), 2)::float8,
  round(avg(r.preis_leistung), 2)::float8,
  round(avg(r.wartezeit), 2)::float8,
  round(avg(
    case
      when r.fleischqualitaet is null then
        (r.geschmack + r.sossenqualitaet + r.freundlichkeit + r.sauberkeit
          + r.preis_leistung + r.wartezeit)::numeric / 6.0
      else
        (r.geschmack + r.fleischqualitaet + r.sossenqualitaet + r.freundlichkeit
          + r.sauberkeit + r.preis_leistung + r.wartezeit)::numeric / 7.0
    end
  ), 2)::float8
from public.ratings r
group by r.shop_id;

insert into public.shop_feature_stats (shop_id, feature, bestaetigt, widersprochen, score)
select
  shop_id,
  feature,
  (count(*) filter (where vote = 1))::int,
  (count(*) filter (where vote = -1))::int,
  coalesce(sum(vote), 0)::int
from public.shop_feature_votes
group by shop_id, feature;

insert into public.shop_hours_stats (shop_id, bestaetigt, veraltet, score)
select
  shop_id,
  (count(*) filter (where vote = 1))::int,
  (count(*) filter (where vote = -1))::int,
  coalesce(sum(vote), 0)::int
from public.hours_votes
group by shop_id;

notify pgrst, 'reload schema';

-- ── milestone_events: add source + event_type for auto-population ────────────

alter table project_milestones
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'auto'));

alter table project_milestones
  add column if not exists event_type text;

-- unique per site so droid can upsert without duplicating
create unique index if not exists milestones_site_event_idx
  on project_milestones(site_id, event_type)
  where event_type is not null;

alter table public.participant_selections enable row level security;

revoke all on table public.participant_selections from anon, authenticated;

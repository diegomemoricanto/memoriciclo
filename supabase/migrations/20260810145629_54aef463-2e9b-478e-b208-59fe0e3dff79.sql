alter table public.subject_topics add column if not exists position integer not null default 0;

with ranked as (
  select id, user_id, row_number() over (partition by user_id, subject_id order by created_at) - 1 as rn
  from public.subject_topics
)
update public.subject_topics t
set position = r.rn
from ranked r
where t.id = r.id and t.user_id = r.user_id;
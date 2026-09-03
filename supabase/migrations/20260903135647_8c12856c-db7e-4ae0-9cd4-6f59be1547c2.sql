insert into public.user_activity_days (user_id, day)
select p.id, d.day
from public.profiles p
cross join (values ('2026-08-08'::date), ('2026-09-01'::date)) as d(day)
where p.email = 'cryptop16@gmail.com'
on conflict (user_id, day) do nothing;
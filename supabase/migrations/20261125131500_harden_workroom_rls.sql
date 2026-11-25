-- Tighten existing WorkRoom row-level policies.
drop policy if exists "Members upload files" on public.workroom_files;
create policy "Members upload files"
on public.workroom_files for insert to authenticated
with check (
  auth.uid() = uploaded_by
  and exists (
    select 1 from public.workroom_members m
    where m.workroom_id = workroom_files.workroom_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members create comments" on public.workroom_comments;
create policy "Members create comments"
on public.workroom_comments for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.workroom_members m
    where m.workroom_id = workroom_comments.workroom_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Users join workrooms as themselves" on public.workroom_members;
-- Membership is granted by a WorkRoom owner or trusted SECURITY DEFINER workflow only.

drop policy if exists "Members update tasks" on public.workroom_tasks;
create policy "Members update tasks"
on public.workroom_tasks for update to authenticated
using (
  exists (
    select 1 from public.workroom_members m
    where m.workroom_id = workroom_tasks.workroom_id and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workroom_members m
    where m.workroom_id = workroom_tasks.workroom_id and m.user_id = auth.uid()
  )
);

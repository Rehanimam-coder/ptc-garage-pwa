drop policy if exists profiles_read_team_directory on public.profiles;
create policy profiles_read_team_directory on public.profiles for select to authenticated using (true);
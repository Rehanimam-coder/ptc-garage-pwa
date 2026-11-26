do $$
declare t text;
begin
 foreach t in array array['breakdown_jobs','preventive_maintenance','ptc_assets','general_store_items','tasks_projects','app_settings'] loop
  execute format('drop trigger if exists %I on public.%I', t||'_set_updated_at', t);
  execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t||'_set_updated_at', t);
 end loop;
end $$;
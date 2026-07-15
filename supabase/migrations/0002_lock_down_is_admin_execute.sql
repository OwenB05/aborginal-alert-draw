-- anon never evaluates is_admin() (no anon policy references it); only
-- authenticated policies do, and RLS evaluates functions with the caller's
-- privileges, so authenticated keeps EXECUTE.
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

create or replace function public.mark_quote_sent(p_quote_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select b.id into v_business_id
  from public.businesses b
  where b.user_id = v_user_id;

  if v_business_id is null then
    raise exception 'business not found' using errcode = 'P0002';
  end if;

  update public.quotes q
  set status = 'sent',
      sent_at = now(),
      updated_at = now()
  where q.id = p_quote_id
    and q.business_id = v_business_id
    and q.status in ('draft', 'viewed')
    and q.sent_at is null;

  if found then
    return true;
  end if;

  select q.status into v_status
  from public.quotes q
  where q.id = p_quote_id
    and q.business_id = v_business_id;

  return found and v_status in ('draft', 'sent', 'viewed');
end;
$$;

revoke all on function public.mark_quote_sent(uuid) from public, anon;
grant execute on function public.mark_quote_sent(uuid) to authenticated;

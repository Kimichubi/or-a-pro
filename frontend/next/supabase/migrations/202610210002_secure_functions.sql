create or replace function public.save_quote(
  p_quote_id uuid,
  p_customer_id uuid,
  p_title text,
  p_discount_amount numeric,
  p_execution_days integer,
  p_validity_days integer,
  p_notes text,
  p_payment_conditions text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_plan text;
  v_usage integer;
  v_quote_id uuid := p_quote_id;
  v_slug text;
  v_item jsonb;
  v_catalog_id uuid;
  v_name text;
  v_description text;
  v_unit text;
  v_quantity numeric;
  v_unit_price numeric;
  v_item_total numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_item_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_customer_id is null or length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'invalid quote details' using errcode = '22023';
  end if;
  if coalesce(p_discount_amount, -1) < 0 or p_discount_amount > 9999999999.99
     or coalesce(p_execution_days, -1) < 0 or p_execution_days > 3650
     or coalesce(p_validity_days, 0) not between 1 and 365 then
    raise exception 'invalid quote amounts or dates' using errcode = '22023';
  end if;
  if length(coalesce(p_notes, '')) > 5000 or length(coalesce(p_payment_conditions, '')) > 2000 then
    raise exception 'quote text is too long' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be an array' using errcode = '22023';
  end if;

  select b.id into v_business_id
  from public.businesses b
  where b.user_id = v_user_id
  for update;
  if v_business_id is null then
    raise exception 'business not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.business_id = v_business_id
  ) then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then
    raise exception 'quote must contain between 1 and 100 items' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    where nullif(item.value ->> 'catalogItemId', '') is not null
  ) and not public.current_user_has_professional_plan() then
    raise exception 'catalog feature requires professional plan' using errcode = '42501';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as item(value)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid quote item' using errcode = '22023';
    end if;
    v_catalog_id := nullif(v_item ->> 'catalogItemId', '')::uuid;
    v_name := left(btrim(coalesce(v_item ->> 'name', '')), 200);
    v_description := left(coalesce(v_item ->> 'description', ''), 2000);
    v_unit := left(btrim(coalesce(v_item ->> 'unit', 'un')), 40);
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unitPrice')::numeric;

    if v_name = '' or v_quantity is null or v_unit_price is null or v_quantity <= 0 or v_unit_price < 0
       or v_quantity > 1000000 or v_unit_price > 100000000 then
      raise exception 'invalid quote item' using errcode = '22023';
    end if;
    if v_catalog_id is not null and not exists (
      select 1 from public.catalog_items ci
      where ci.id = v_catalog_id and ci.business_id = v_business_id
    ) then
      raise exception 'catalog item not found' using errcode = 'P0002';
    end if;
    v_item_total := round(v_quantity * v_unit_price, 2);
    v_subtotal := v_subtotal + v_item_total;
    if v_item_total > 9999999999.99 or v_subtotal > 9999999999.99 then
      raise exception 'quote total exceeds the supported amount' using errcode = '22003';
    end if;
  end loop;

  if p_discount_amount > v_subtotal then
    raise exception 'discount exceeds subtotal' using errcode = '22023';
  end if;
  v_total := round(v_subtotal - p_discount_amount, 2);

  if v_quote_id is null then
    select ba.plan into v_plan
    from public.billing_accounts ba
    where ba.user_id = v_user_id
    for update;
    if v_plan is null then
      raise exception 'billing account not found' using errcode = 'P0002';
    end if;

    if v_plan = 'free' then
      insert into public.monthly_quote_usage (user_id, month_start, quotes_created)
      values (v_user_id, date_trunc('month', now())::date, 0)
      on conflict (user_id, month_start) do nothing;
      select usage.quotes_created into v_usage
      from public.monthly_quote_usage usage
      where usage.user_id = v_user_id and usage.month_start = date_trunc('month', now())::date
      for update;
      if v_usage >= 5 then
        raise exception 'free plan monthly quote limit reached' using errcode = 'P0001';
      end if;
      update public.monthly_quote_usage
      set quotes_created = quotes_created + 1
      where user_id = v_user_id and month_start = date_trunc('month', now())::date;
    end if;

    v_slug := replace(gen_random_uuid()::text, '-', '');
    insert into public.quotes (
      business_id, customer_id, slug, title, discount_amount, execution_days,
      validity_days, notes, payment_conditions, subtotal, total
    ) values (
      v_business_id, p_customer_id, v_slug, btrim(p_title), p_discount_amount,
      p_execution_days, p_validity_days, coalesce(p_notes, ''),
      coalesce(p_payment_conditions, ''), v_subtotal, v_total
    ) returning id into v_quote_id;
  else
    update public.quotes q
    set customer_id = p_customer_id,
        title = btrim(p_title),
        discount_amount = p_discount_amount,
        execution_days = p_execution_days,
        validity_days = p_validity_days,
        notes = coalesce(p_notes, ''),
        payment_conditions = coalesce(p_payment_conditions, ''),
        subtotal = v_subtotal,
        total = v_total,
        updated_at = now()
    where q.id = v_quote_id and q.business_id = v_business_id;
    if not found then
      raise exception 'quote not found' using errcode = 'P0002';
    end if;
    delete from public.quote_items where quote_id = v_quote_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as item(value)
  loop
    v_catalog_id := nullif(v_item ->> 'catalogItemId', '')::uuid;
    v_name := left(btrim(coalesce(v_item ->> 'name', '')), 200);
    v_description := left(coalesce(v_item ->> 'description', ''), 2000);
    v_unit := left(btrim(coalesce(v_item ->> 'unit', 'un')), 40);
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unitPrice')::numeric;
    v_item_total := round(v_quantity * v_unit_price, 2);

    insert into public.quote_items (
      quote_id, catalog_item_id, name, description, unit, quantity, unit_price, total
    ) values (
      v_quote_id, v_catalog_id, v_name, v_description, v_unit, v_quantity, v_unit_price, v_item_total
    );
  end loop;

  return v_quote_id;
end;
$$;
revoke all on function public.save_quote(uuid, uuid, text, numeric, integer, integer, text, text, jsonb)
  from public, anon;
grant execute on function public.save_quote(uuid, uuid, text, numeric, integer, integer, text, text, jsonb)
  to authenticated;

create or replace function public.set_quote_status(p_quote_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_status not in ('sent', 'viewed', 'approved', 'declined', 'expired') then
    raise exception 'invalid quote status' using errcode = '22023';
  end if;
  select b.id into v_business_id from public.businesses b where b.user_id = v_user_id;
  if v_business_id is null then
    raise exception 'business not found' using errcode = 'P0002';
  end if;

  update public.quotes q
  set status = p_status,
      sent_at = case when p_status = 'sent' then coalesce(q.sent_at, now()) else q.sent_at end,
      viewed_at = case when p_status = 'viewed' then coalesce(q.viewed_at, now()) else q.viewed_at end,
      approved_at = case when p_status = 'approved' then now() else null end,
      declined_at = case when p_status = 'declined' then now() else null end,
      updated_at = now()
  where q.id = p_quote_id and q.business_id = v_business_id;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  return true;
end;
$$;
revoke all on function public.set_quote_status(uuid, text) from public, anon;
grant execute on function public.set_quote_status(uuid, text) to authenticated;

create or replace function public.mark_quote_viewed(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.quotes
  set status = 'viewed', viewed_at = coalesce(viewed_at, now()), updated_at = now()
  where slug = p_slug and status in ('sent', 'viewed');
$$;
revoke all on function public.mark_quote_viewed(text) from public, anon, authenticated;
grant execute on function public.mark_quote_viewed(text) to service_role;

create or replace function public.decide_public_quote(p_slug text, p_approved boolean, p_comment text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes%rowtype;
begin
  if length(coalesce(p_comment, '')) > 2000 then
    raise exception 'comment is too long' using errcode = '22023';
  end if;
  select * into v_quote from public.quotes where slug = p_slug for update;
  if not found then
    return 'not_found';
  end if;
  if v_quote.status in ('approved', 'declined') then
    return 'already_decided';
  end if;
  if v_quote.status not in ('sent', 'viewed') or v_quote.sent_at is null
     or now() >= v_quote.sent_at + v_quote.validity_days * interval '1 day' then
    return 'not_open';
  end if;

  update public.quotes
  set status = case when p_approved then 'approved' else 'declined' end,
      approved_at = case when p_approved then now() else null end,
      declined_at = case when p_approved then null else now() end,
      client_comment = coalesce(p_comment, ''),
      updated_at = now()
  where id = v_quote.id;
  return 'ok';
end;
$$;
revoke all on function public.decide_public_quote(text, boolean, text) from public, anon, authenticated;
grant execute on function public.decide_public_quote(text, boolean, text) to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_scope !~ '^[a-z0-9:_-]{1,64}$'
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.rate_limit_windows as current_window (
    scope, key_hash, window_started_at, request_count
  ) values (p_scope, p_key_hash, v_now, 1)
  on conflict (scope, key_hash) do update set
    window_started_at = case
      when current_window.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
      else current_window.window_started_at
    end,
    request_count = case
      when current_window.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
      else current_window.request_count + 1
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_status text,
  p_plan text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted text;
begin
  if length(p_event_id) not between 1 and 255
     or length(p_event_type) not between 1 and 255
     or p_event_created < 0
     or p_plan not in ('free', 'professional') then
    raise exception 'invalid Stripe event' using errcode = '22023';
  end if;

  insert into public.stripe_webhook_events (event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do nothing
  returning event_id into v_inserted;

  if v_inserted is null then
    return false;
  end if;

  if p_user_id is not null then
    update public.billing_accounts
    set plan = p_plan,
        stripe_customer_id = coalesce(nullif(p_customer_id, ''), stripe_customer_id),
        stripe_subscription_id = nullif(p_subscription_id, ''),
        stripe_price_id = nullif(p_price_id, ''),
        subscription_status = coalesce(nullif(p_status, ''), 'inactive'),
        stripe_subscription_event_created = p_event_created,
        updated_at = now()
    where user_id = p_user_id
      and p_event_created >= stripe_subscription_event_created;
  end if;

  return true;
end;
$$;

revoke all on function public.apply_stripe_subscription_event(text, text, bigint, uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription_event(text, text, bigint, uuid, text, text, text, text, text)
  to service_role;

create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'accounts', (select count(*) from public.profiles),
    'businesses', (select count(*) from public.businesses),
    'customers', (select count(*) from public.customers),
    'quotes', (select count(*) from public.quotes),
    'approvedSum', coalesce((select sum(total) from public.quotes where status = 'approved'), 0)
  );
$$;
revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;

create or replace function public.owner_dashboard(p_business_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_stats jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.businesses
    where id = p_business_id and user_id = auth.uid()
  ) then
    raise exception 'business not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'quotesSent', count(*) filter (where status in ('sent', 'viewed', 'approved', 'declined', 'expired')),
    'quotesApproved', count(*) filter (where status = 'approved'),
    'totalApproved', coalesce(sum(total) filter (where status = 'approved'), 0),
    'awaitingResponse', count(*) filter (where status in ('sent', 'viewed')),
    'approvalRate', case
      when count(*) filter (where status in ('sent', 'viewed', 'approved', 'declined', 'expired')) = 0 then 0
      else round(
        count(*) filter (where status = 'approved')::numeric * 100 /
        count(*) filter (where status in ('sent', 'viewed', 'approved', 'declined', 'expired')),
        2
      )
    end
  ) into v_stats
  from public.quotes
  where business_id = p_business_id;

  return v_stats || jsonb_build_object(
    'recentQuotes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'status', recent.status,
        'customer', recent.customer_name,
        'title', recent.title,
        'total', recent.total,
        'createdAt', recent.created_at
      ) order by recent.created_at desc)
      from (
        select q.id, q.status, c.name as customer_name, q.title, q.total, q.created_at
        from public.quotes q
        join public.customers c on c.id = q.customer_id
        where q.business_id = p_business_id
        order by q.created_at desc
        limit 8
      ) recent
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.owner_dashboard(uuid) from public, anon;
grant execute on function public.owner_dashboard(uuid) to authenticated;

create or replace function public.claim_billing_checkout(p_user_id uuid, p_force boolean default false, p_expected_session_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_key uuid;
  v_session_id text;
  v_checkout_url text;
  v_expires_at timestamptz;
  v_lease_expires_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'user is required' using errcode = '22023';
  end if;

  insert into public.billing_checkout_sessions (user_id, request_key, lease_expires_at)
  values (p_user_id, gen_random_uuid(), now() + interval '60 seconds')
  on conflict (user_id) do nothing
  returning request_key into v_request_key;
  if found then
    return jsonb_build_object('state', 'claimed', 'requestKey', v_request_key);
  end if;

  select request_key, session_id, checkout_url, expires_at, lease_expires_at
    into v_request_key, v_session_id, v_checkout_url, v_expires_at, v_lease_expires_at
  from public.billing_checkout_sessions
  where user_id = p_user_id
  for update;

  if coalesce(v_checkout_url, '') <> '' and v_expires_at > now()
     and (not coalesce(p_force, false) or coalesce(v_session_id, '') <> coalesce(p_expected_session_id, '')) then
    return jsonb_build_object('state', 'ready', 'requestKey', v_request_key, 'sessionId', v_session_id, 'url', v_checkout_url);
  end if;
  if v_lease_expires_at > now() and coalesce(v_session_id, '') = '' then
    return jsonb_build_object('state', 'busy');
  end if;

  v_request_key := gen_random_uuid();
  update public.billing_checkout_sessions
  set request_key = v_request_key,
      session_id = '',
      checkout_url = '',
      expires_at = null,
      lease_expires_at = now() + interval '60 seconds'
  where user_id = p_user_id;
  return jsonb_build_object('state', 'claimed', 'requestKey', v_request_key);
end;
$$;

create or replace function public.complete_billing_checkout(
  p_user_id uuid,
  p_request_key uuid,
  p_session_id text,
  p_checkout_url text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.billing_checkout_sessions
  set session_id = p_session_id,
      checkout_url = p_checkout_url,
      expires_at = p_expires_at,
      lease_expires_at = now()
  where user_id = p_user_id and request_key = p_request_key;
  return found;
end;
$$;

create or replace function public.release_billing_checkout(p_user_id uuid, p_request_key uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.billing_checkout_sessions
  set session_id = '', checkout_url = '', expires_at = null, lease_expires_at = now()
  where user_id = p_user_id and request_key = p_request_key;
$$;

revoke all on function public.claim_billing_checkout(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.complete_billing_checkout(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.release_billing_checkout(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_billing_checkout(uuid, boolean, text) to service_role;
grant execute on function public.complete_billing_checkout(uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.release_billing_checkout(uuid, uuid) to service_role;

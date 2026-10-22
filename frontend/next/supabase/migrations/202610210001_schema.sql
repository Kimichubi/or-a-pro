create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null default '',
  logo_url text not null default '',
  document text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address text not null default '',
  primary_color text not null default '#2563EB',
  secondary_color text not null default '#F97316',
  terms_conditions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  phone text not null default '',
  email text not null default '',
  document text not null default '',
  service_address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index customers_business_created_idx on public.customers (business_id, created_at desc);

create table public.billing_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'professional', 'company')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text not null default 'inactive',
  stripe_subscription_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  description text not null default '',
  unit text not null default 'un',
  price numeric(12, 2) not null default 0 check (price >= 0),
  estimated_cost numeric(12, 2) not null default 0 check (estimated_cost >= 0),
  category text not null default '',
  created_at timestamptz not null default now()
);
create index catalog_items_business_created_idx on public.catalog_items (business_id, created_at desc);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired')),
  slug text not null unique,
  title text not null default 'Orçamento',
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  execution_days integer not null default 0 check (execution_days >= 0),
  validity_days integer not null default 7 check (validity_days between 1 and 365),
  notes text not null default '',
  payment_conditions text not null default '',
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  sent_at timestamptz,
  viewed_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  client_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_business_created_idx on public.quotes (business_id, created_at desc);
create index quotes_business_status_idx on public.quotes (business_id, status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  catalog_item_id uuid references public.catalog_items (id) on delete set null,
  name text not null,
  description text not null default '',
  unit text not null default 'un',
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);
create index quote_items_quote_created_idx on public.quote_items (quote_id, created_at);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  message text not null check (length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index reminders_quote_created_idx on public.reminders (quote_id, created_at desc);

create table public.monthly_quote_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  month_start date not null,
  quotes_created integer not null default 0 check (quotes_created >= 0),
  primary key (user_id, month_start)
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table public.billing_checkout_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  request_key uuid not null,
  session_id text not null default '',
  checkout_url text not null default '',
  expires_at timestamptz,
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.rate_limit_windows (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  primary key (scope, key_hash)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_user_has_professional_plan()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.billing_accounts
    where user_id = (select auth.uid()) and plan in ('professional', 'company')
  );
$$;
revoke all on function public.current_user_has_professional_plan() from public, anon;
grant execute on function public.current_user_has_professional_plan() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 120);
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(btrim(coalesce(new.email, ''))), display_name);

  insert into public.businesses (user_id, name)
  values (new.id, coalesce(nullif(display_name, ''), 'Meu Negócio'));

  insert into public.billing_accounts (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at before update on public.businesses
  for each row execute procedure public.set_updated_at();
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.catalog_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.reminders enable row level security;
alter table public.monthly_quote_usage enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.billing_checkout_sessions enable row level security;
alter table public.rate_limit_windows enable row level security;

revoke all on public.profiles, public.businesses, public.customers, public.billing_accounts,
  public.catalog_items, public.quotes, public.quote_items, public.reminders,
  public.monthly_quote_usage, public.stripe_webhook_events, public.billing_checkout_sessions,
  public.rate_limit_windows from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;
grant select on public.businesses to authenticated;
grant update (name, document, phone, whatsapp, email, address, primary_color, secondary_color, terms_conditions)
  on public.businesses to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.catalog_items to authenticated;
grant select, delete on public.quotes to authenticated;
grant select on public.quote_items to authenticated;
grant select on public.reminders to authenticated;
grant all on public.billing_accounts, public.monthly_quote_usage, public.stripe_webhook_events,
  public.billing_checkout_sessions, public.rate_limit_windows to service_role;
grant all on public.profiles, public.businesses, public.customers, public.billing_accounts,
  public.catalog_items, public.quotes, public.quote_items, public.reminders,
  public.monthly_quote_usage, public.stripe_webhook_events, public.billing_checkout_sessions,
  public.rate_limit_windows to service_role;

create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy businesses_select_self on public.businesses
  for select to authenticated using (user_id = (select auth.uid()));
create policy businesses_update_self on public.businesses
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy customers_select_owner on public.customers
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  ));
create policy customers_insert_owner on public.customers
  for insert to authenticated with check (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  ));
create policy customers_update_owner on public.customers
  for update to authenticated using (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  ));
create policy customers_delete_owner on public.customers
  for delete to authenticated using (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  ));

create policy catalog_select_owner on public.catalog_items
  for select to authenticated using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (select public.current_user_has_professional_plan())
  );
create policy catalog_insert_owner_paid on public.catalog_items
  for insert to authenticated with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (select public.current_user_has_professional_plan())
  );
create policy catalog_update_owner_paid on public.catalog_items
  for update to authenticated using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (select public.current_user_has_professional_plan())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (select public.current_user_has_professional_plan())
  );
create policy catalog_delete_owner_paid on public.catalog_items
  for delete to authenticated using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (select public.current_user_has_professional_plan())
  );

create policy quotes_select_owner on public.quotes
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  ));
create policy quotes_delete_owner on public.quotes
  for delete to authenticated using (exists (
    select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())
  ));

create policy quote_items_select_owner on public.quote_items
  for select to authenticated using (exists (
    select 1 from public.quotes q
    join public.businesses b on b.id = q.business_id
    where q.id = quote_id and b.user_id = (select auth.uid())
  ));

create policy reminders_select_owner on public.reminders
  for select to authenticated using (exists (
    select 1 from public.quotes q
    join public.businesses b on b.id = q.business_id
    where q.id = quote_id and b.user_id = (select auth.uid())
  ));

create policy reminders_insert_owner_paid on public.reminders
  for insert to authenticated with check (
    exists (
      select 1 from public.quotes q
      join public.businesses b on b.id = q.business_id
      where q.id = quote_id and b.user_id = (select auth.uid())
    ) and (select public.current_user_has_professional_plan())
  );

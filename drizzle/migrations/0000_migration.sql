create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- first user to sign up becomes owner
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'user');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled piece',
  description text not null default '',
  category text not null default 'Outfits',
  price numeric(12,2) not null default 0,
  quantity integer not null default 0,
  images text[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public sees published" on public.products for select to anon, authenticated using (published = true);
create policy "admin reads all" on public.products for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin inserts" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin updates" on public.products for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin deletes" on public.products for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  customer_name text not null,
  phone text not null,
  location text not null default '',
  note text not null default '',
  total numeric(12,2) not null default 0,
  status text not null default 'new',
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin updates orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  image text,
  price numeric(12,2) not null,
  qty integer not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

-- atomic order placement with stock control
create or replace function public.place_order(_name text, _phone text, _location text, _note text, _items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _order uuid;
  _it jsonb;
  _p public.products%rowtype;
  _q int;
  _total numeric := 0;
begin
  if _uid is null then raise exception 'Please sign in to book'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Your bag is empty'; end if;
  insert into public.orders(user_id, customer_name, phone, location, note) values (_uid, _name, _phone, _location, _note) returning id into _order;
  for _it in select * from jsonb_array_elements(_items) loop
    _q := (_it->>'qty')::int;
    select * into _p from public.products where id = (_it->>'product_id')::uuid and published for update;
    if not found then raise exception 'An item is no longer available'; end if;
    if _q < 1 or _p.quantity < _q then raise exception 'Only % left of %', _p.quantity, _p.name; end if;
    update public.products set quantity = quantity - _q, updated_at = now() where id = _p.id;
    insert into public.order_items(order_id, product_id, name, image, price, qty) values (_order, _p.id, _p.name, _p.images[1], _p.price, _q);
    _total := _total + _p.price * _q;
  end loop;
  update public.orders set total = _total where id = _order;
  return _order;
end $$;
revoke execute on function public.place_order(text,text,text,text,jsonb) from anon, public;
grant execute on function public.place_order(text,text,text,text,jsonb) to authenticated;

alter publication supabase_realtime add table public.orders;
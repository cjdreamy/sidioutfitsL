alter table public.orders
  add column deposit_amount numeric(12,2) not null default 0,
  add column estimated_fare numeric(12,2) not null default 0,
  add column amount_due_now numeric(12,2) not null default 0,
  add column payment_status text not null default 'unpaid',
  add column checkout_request_id text unique,
  add column mpesa_receipt text,
  add column payment_phone text;

create index orders_checkout_request_id_idx on public.orders(checkout_request_id)
  where checkout_request_id is not null;

create or replace function public.prepare_order_payment(_order_id uuid, _estimated_fare numeric)
returns table(order_id uuid, total numeric, phone text)
language plpgsql security definer set search_path = public as $$
declare
  _order public.orders%rowtype;
  _deposit numeric;
begin
  if auth.uid() is null then raise exception 'Please sign in to pay'; end if;
  if _estimated_fare < 0 or _estimated_fare > 50000 or _estimated_fare <> trunc(_estimated_fare) then
    raise exception 'Enter a valid estimated fare';
  end if;
  select * into _order from public.orders
    where id = _order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if _order.payment_status in ('initiating', 'pending', 'paid') then
    raise exception 'A payment is already in progress or complete';
  end if;
  _deposit := ceil(_order.total * 0.30);
  update public.orders set
    deposit_amount = _deposit,
    estimated_fare = _estimated_fare,
    amount_due_now = _deposit + _estimated_fare,
    payment_status = 'initiating',
    payment_phone = _order.phone
  where id = _order_id;
  return query select _order.id, _order.total, _order.phone;
end $$;
revoke execute on function public.prepare_order_payment(uuid,numeric) from anon, public;
grant execute on function public.prepare_order_payment(uuid,numeric) to authenticated;

create or replace function public.finish_order_payment_request(_order_id uuid, _checkout_request_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set checkout_request_id = _checkout_request_id, payment_status = 'pending'
    where id = _order_id and user_id = auth.uid() and payment_status = 'initiating';
  if not found then raise exception 'Order payment could not be saved'; end if;
end $$;
revoke execute on function public.finish_order_payment_request(uuid,text) from anon, public;
grant execute on function public.finish_order_payment_request(uuid,text) to authenticated;

create or replace function public.fail_order_payment_request(_order_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.orders set payment_status = 'failed'
  where id = _order_id and user_id = auth.uid() and payment_status = 'initiating'
$$;
revoke execute on function public.fail_order_payment_request(uuid) from anon, public;
grant execute on function public.fail_order_payment_request(uuid) to authenticated;
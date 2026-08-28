-- Dental Lab Work Manager — core schema (unowned rows; auth can be layered later)
create table if not exists doctors (
  id          text primary key,
  name        text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists patients (
  id          text primary key,
  name        text not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists work_types (
  id             text primary key,
  name           text not null,
  default_price  integer not null default 0,
  description    text,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists colors (
  id          text primary key,
  name        text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists orders (
  id            text primary key,
  order_number  text not null,
  doctor_id     text not null references doctors(id),
  patient_id    text not null references patients(id),
  color_id      text references colors(id),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists order_items (
  id            text primary key,
  order_id      text not null references orders(id) on delete cascade,
  work_type_id  text not null references work_types(id),
  quantity      integer not null,
  unit_price    integer not null,
  created_at    timestamptz not null default now(),
  constraint order_items_qty_chk check (quantity >= 1),
  constraint order_items_price_chk check (unit_price >= 0)
);

create table if not exists app_settings (
  key    text primary key,
  value  text not null
);

create unique index if not exists doctors_name_idx on doctors (lower(name));
create index if not exists doctors_name_trgm_idx on doctors (name);

create unique index if not exists patients_name_idx on patients (lower(name));

create unique index if not exists work_types_name_idx on work_types (lower(name));
create index if not exists work_types_active_idx on work_types (is_active, sort_order);

create unique index if not exists colors_name_idx on colors (lower(name));
create index if not exists colors_active_idx on colors (is_active, sort_order);

create index if not exists orders_order_number_idx on orders (order_number);
create index if not exists orders_doctor_id_idx on orders (doctor_id);
create index if not exists orders_patient_id_idx on orders (patient_id);
create index if not exists orders_created_at_idx on orders (created_at);
create index if not exists orders_color_id_idx on orders (color_id);

create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_work_type_id_idx on order_items (work_type_id);

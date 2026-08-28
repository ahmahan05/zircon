-- Per-user ownership. Pre-auth rows are development data and are dropped.
delete from order_items;
delete from orders;
delete from patients;
delete from doctors;
delete from work_types;
delete from colors;
delete from app_settings;

alter table doctors add column if not exists user_id text not null;
alter table patients add column if not exists user_id text not null;
alter table work_types add column if not exists user_id text not null;
alter table colors add column if not exists user_id text not null;
alter table orders add column if not exists user_id text not null;
alter table order_items add column if not exists user_id text not null;

alter table app_settings drop constraint if exists app_settings_pkey;
alter table app_settings add column if not exists user_id text not null;
alter table app_settings add primary key (user_id, key);

drop index if exists doctors_name_idx;
drop index if exists doctors_name_trgm_idx;
drop index if exists patients_name_idx;
drop index if exists work_types_name_idx;
drop index if exists colors_name_idx;

create unique index if not exists doctors_user_name_idx on doctors (user_id, lower(name));
create index if not exists doctors_user_id_idx on doctors (user_id);

create unique index if not exists patients_user_name_idx on patients (user_id, lower(name));
create index if not exists patients_user_id_idx on patients (user_id);

create unique index if not exists work_types_user_name_idx on work_types (user_id, lower(name));
create index if not exists work_types_user_id_idx on work_types (user_id);

create unique index if not exists colors_user_name_idx on colors (user_id, lower(name));
create index if not exists colors_user_id_idx on colors (user_id);

create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_user_created_idx on orders (user_id, created_at desc);

create index if not exists order_items_user_id_idx on order_items (user_id);
create index if not exists order_items_user_order_idx on order_items (user_id, order_id);

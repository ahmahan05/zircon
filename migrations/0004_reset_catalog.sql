delete from order_items;
delete from orders;
delete from patients;
delete from doctors;
delete from work_types;

insert into work_types (id, name, default_price, is_active, sort_order, created_at, updated_at) values
  ('wt-pa-base', 'П/А базовый', 40000, true, 1, now(), now()),
  ('wt-pa-std', 'П/А стандарт', 60000, true, 2, now(), now()),
  ('wt-pa-vip', 'П/А вип', 80000, true, 3, now(), now()),
  ('wt-zr-base', 'Циркон базовый', 40000, true, 4, now(), now()),
  ('wt-zr-std', 'Циркон стандарт', 60000, true, 5, now(), now()),
  ('wt-zr-vip', 'Циркон вип', 80000, true, 6, now(), now()),
  ('wt-mk-stump', 'Мк культя', 25000, true, 7, now(), now()),
  ('wt-mk-impl', 'Мк имплант', 55000, true, 8, now(), now()),
  ('wt-bar', 'Балка', 300000, true, 9, now(), now()),
  ('wt-temp-std', 'Временная коронка стандарт', 40000, true, 10, now(), now()),
  ('wt-transfer', 'Трансферчек', 10000, true, 11, now(), now()),
  ('wt-bite', 'Прикусной на жесткой', 35000, true, 12, now(), now());

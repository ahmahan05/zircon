-- Orders are recorded as completed work. Status / start / completion timestamps
-- are no longer part of the model.
alter table orders drop constraint if exists orders_status_chk;
drop index if exists orders_status_idx;
drop index if exists orders_completed_at_idx;
alter table orders drop column if exists status;
alter table orders drop column if exists started_at;
alter table orders drop column if exists completed_at;

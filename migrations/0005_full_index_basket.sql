-- Expand the index and reserve ledgers to the nine starter-basket commodities.
alter table scrit_prices drop constraint if exists scrit_prices_commodity_check;
alter table scrit_prices add constraint scrit_prices_commodity_check
  check (commodity in ('Au','Ag','Pt','Pd','Nd','Dy','Tb','Sc','Li'));

alter table scrit_attestations drop constraint if exists scrit_attestations_commodity_check;
alter table scrit_attestations add constraint scrit_attestations_commodity_check
  check (commodity in ('Au','Ag','Pt','Pd','Nd','Dy','Tb','Sc','Li'));

alter table scrit_reserve_batches drop constraint if exists scrit_reserve_batches_commodity_check;
alter table scrit_reserve_batches add constraint scrit_reserve_batches_commodity_check
  check (commodity in ('Au','Ag','Pt','Pd','Nd','Dy','Tb','Sc','Li'));

-- Keep the existing demo key limited to its original scope. New custodians must be scoped explicitly.

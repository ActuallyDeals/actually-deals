-- Editorial category slug. Not a tracker or alert product.
update public.deals
  set category = 'price-mistakes'
  where category = 'price-errors';

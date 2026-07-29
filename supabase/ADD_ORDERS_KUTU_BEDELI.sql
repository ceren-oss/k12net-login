ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS kutu_bedeli numeric DEFAULT 0;

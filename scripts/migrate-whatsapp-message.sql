-- Ampliar almacenamiento de WhatsApp y guardar mensaje en texto plano
DROP VIEW IF EXISTS order_details;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;
ALTER TABLE orders ALTER COLUMN whatsapp_link TYPE TEXT;

CREATE OR REPLACE VIEW order_details AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.shipping_address,
    o.shipping_city,
    o.shipping_phone,
    o.notes,
    o.whatsapp_link,
    o.whatsapp_message,
    o.paid_at,
    o.created_at,
    u.id as user_id,
    u.first_name || ' ' || u.last_name as customer_name,
    u.email as customer_email,
    u.phone as customer_phone
FROM orders o
LEFT JOIN users u ON o.user_id = u.id;

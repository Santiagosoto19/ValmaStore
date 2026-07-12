-- Rellena paid_at en pedidos que ya fueron marcados como pagados
UPDATE orders o
SET paid_at = sub.first_paid
FROM (
    SELECT order_id, MIN(created_at) AS first_paid
    FROM order_status_history
    WHERE status = 'paid'
    GROUP BY order_id
) sub
WHERE o.id = sub.order_id
  AND o.paid_at IS NULL;

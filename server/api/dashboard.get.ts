import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {

  /* ================= KPI ================= */
  const [sales]: any = await db.query(
    `SELECT SUM(amount) as total FROM orders WHERE status='paid'`
  )

  const [orders]: any = await db.query(
    `SELECT COUNT(*) as count FROM orders`
  )

  const [today]: any = await db.query(
    `SELECT SUM(amount) as total 
     FROM orders
     WHERE DATE(created_at) = CURDATE() 
     AND status='paid'`
  )

  /* ================= TOP SPENDER ================= */
  const [topCustomers]: any = await db.query(`
    SELECT 
      c.name,
      c.phone,
      c.points,
      COALESCE(SUM(o.amount),0) as total_spent
    FROM customers c
    LEFT JOIN orders o 
      ON o.customer_phone = c.phone 
      AND o.status = 'paid'
    GROUP BY c.id
    ORDER BY total_spent DESC
    LIMIT 10
  `)

      // 🔥 แยก payment
    const [paymentStats]: any = await db.query(`
      SELECT payment_method, SUM(amount) as total
      FROM orders
      GROUP BY payment_method
    `)

  /* ================= BUY FREQUENCY ================= */
  const [frequentCustomers]: any = await db.query(`
    SELECT 
      c.name,
      c.phone,
      COUNT(o.id) as total_orders
    FROM customers c
    LEFT JOIN orders o 
      ON o.customer_phone = c.phone
      AND o.status = 'paid'
    GROUP BY c.id
    ORDER BY total_orders DESC
    LIMIT 10
  `)

  /* ================= BEST SELLER ================= */
  const [bestSellerRows]: any = await db.query(`
    SELECT 
      p.name,
      SUM(oi.qty) as sold
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    GROUP BY oi.product_id
    ORDER BY sold DESC
    LIMIT 1
  `)

  const bestSeller = bestSellerRows?.[0] || null

  /* ================= LATEST ORDERS ================= */
    const [latestOrders]: any = await db.query(`
    SELECT 
        o.id,
        o.amount,
        o.status,
        GROUP_CONCAT(p.name SEPARATOR ', ') as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    GROUP BY o.id
    ORDER BY o.id DESC
    LIMIT 10
    `)

  return {
    total: today[0]?.total || 0,
    orders: orders[0]?.count || 0,
    revenue: sales[0]?.total || 0,

    // ✅ ต้องชื่อเดียวกับ frontend
    topCustomers,
    frequentCustomers,
    bestSeller,
    latestOrders,
    paymentStats
  }
})
import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const from = query.from || '2024-01-01'
  const to = query.to || new Date().toISOString().slice(0, 10)

  /* =========================
     SUMMARY
  ========================= */
  const [summary]: any = await db.query(`
    SELECT 
      SUM(o.amount) as revenue,
      SUM(oi.qty * p.cost) as cost,
      SUM(o.amount - (oi.qty * p.cost)) as profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid'
    AND DATE(o.created_at) BETWEEN ? AND ?
  `, [from, to])

  /* =========================
     DAILY
  ========================= */
  const [daily]: any = await db.query(`
    SELECT 
      (o.created_at) as date,
      SUM(o.amount) as revenue,
      SUM(oi.qty * p.cost) as cost,
      SUM(o.amount - (oi.qty * p.cost)) as profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid'
    AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY DATE(o.created_at)
    ORDER BY date DESC
  `, [from, to])

  /* =========================
     PRODUCT DETAIL
  ========================= */
  const [products]: any = await db.query(`
    SELECT 
      p.name,
      SUM(oi.qty) as qty,
      SUM(oi.qty * oi.price) as revenue,
      SUM(oi.qty * p.cost) as cost,
      SUM((oi.price - p.cost) * oi.qty) as profit
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status='paid'
    AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY oi.product_id
    ORDER BY profit DESC
  `, [from, to])

  return {
    summary: summary[0],
    daily,
    products
  }
})
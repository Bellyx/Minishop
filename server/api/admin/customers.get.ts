import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {

  const [rows]: any = await db.query(`
    SELECT 
      c.*,
      IFNULL(SUM(o.amount), 0) as total_spent
    FROM customers c
    LEFT JOIN orders o 
      ON o.customer_phone = c.phone 
      AND o.status = 'paid'
    GROUP BY c.id
    ORDER BY total_spent DESC
  `)

  // 🔥 ใส่อันดับ
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1
  }))
})
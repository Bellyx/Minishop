import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = event.context.params.id

  console.log('🔥 ORDER API HIT ID:', id)

  const [orders]: any = await db.query(
    `SELECT 
      id,
      amount,
      status,
      customer_name,
      customer_phone,
      points,
      created_at
    FROM orders 
    WHERE id=?`,
    [id]
  )

  if (!orders.length) {
    throw createError({ statusCode: 404, message: 'not found' })
  }

  const order = orders[0]

  const [items]: any = await db.query(`
    SELECT 
      oi.qty,
      oi.price,
      p.name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id=?
  `, [id])

  console.log('🔥 ITEMS:', items)

  return {
    ...order,
    items: items || []
  }
})
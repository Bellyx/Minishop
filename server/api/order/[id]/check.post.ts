import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const [rows]: any = await db.query(
    'SELECT * FROM orders WHERE id = ?',
    [id]
  )

  const order = rows[0]

  if (!order) {
    throw createError({ statusCode: 404 })
  }

  // 🔥 SMART MATCH (กันเผื่อเศษ/ปัดเศษ)
  const isMatch =
    Math.abs(Number(order.amount) - Number(body.amount)) <= 0.01

  if (!isMatch) {
    return { status: 'unmatched' }
  }

  await db.query(
    'UPDATE orders SET status="paid" WHERE id=?',
    [id]
  )

  return { status: 'paid' }
})
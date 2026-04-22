import { db } from '../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  await db.query(
    'UPDATE orders SET status="paid" WHERE id=?',
    [body.order_id]
  )

  return { success: true }
})
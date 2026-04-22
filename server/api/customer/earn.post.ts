import { db } from '~/server/utils/db'
import { loyaltyConfig } from '~/server/config/loyalty'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { name, phone, amount } = body

  const points = Math.floor(amount / loyaltyConfig.baht_per_point)

  const [rows]: any = await db.query(
    'SELECT * FROM customers WHERE phone=?',
    [phone]
  )

  if (rows.length === 0) {
    await db.query(
      'INSERT INTO customers (name, phone, points) VALUES (?, ?, ?)',
      [name, phone, points]
    )
  } else {
    await db.query(
      'UPDATE customers SET points = points + ?, name=? WHERE phone=?',
      [points, name, phone]
    )
  }

  return {
    success: true,
    earned: points
  }
})
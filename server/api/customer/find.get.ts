import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const phone = getQuery(event).phone

  const [rows]: any = await db.query(
    'SELECT * FROM customers WHERE phone=?',
    [phone]
  )

  return rows[0] || null
})
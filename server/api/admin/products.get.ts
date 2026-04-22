import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const [rows] = await db.query('SELECT * FROM products')
  return rows
})
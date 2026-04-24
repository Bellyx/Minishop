import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const [rows]: any = await db.query(`
    SELECT id, name, stock, min_stock
    FROM products
    WHERE stock <= min_stock
    ORDER BY stock ASC
  `)

  return rows
})
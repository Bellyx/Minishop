import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const conn = await db.getConnection()

  try {
    const [[order]]: any = await conn.query(
      'SELECT * FROM orders WHERE id=?',
      [id]
    )

    const [items]: any = await conn.query(`
      SELECT oi.*, p.name 
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id=?
    `, [id])

    return { order, items }
  } finally {
    conn.release()
  }
})
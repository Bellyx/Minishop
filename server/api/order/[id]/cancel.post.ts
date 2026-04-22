export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [rows]: any = await conn.query(
      'SELECT * FROM orders WHERE id=?',
      [id]
    )

    const order = rows?.[0]

    if (!order) {
      throw createError({ statusCode: 404, message: 'ไม่พบ order' })
    }

    // 🔥 กัน cancel ซ้ำ
    if (order.status === 'cancel') {
      return { ok: true }
    }

    // 🔥 ถ้าเคย paid → ต้อง rollback แต้ม
    if (order.status === 'paid' && order.customer_phone && order.points > 0) {

      await conn.query(
        `UPDATE customers 
         SET points = GREATEST(points - ?, 0)
         WHERE phone=?`,
        [order.points, order.customer_phone]
      )

      // 🔥 log rollback
      await conn.query(
        `INSERT INTO point_logs (customer_phone, order_id, points, type)
         VALUES (?, ?, ?, 'rollback')`,
        [
          order.customer_phone,
          order.id,
          order.points
        ]
      )
    }

    // 🔥 update status
    await conn.query(
      'UPDATE orders SET status="cancel" WHERE id=?',
      [id]
    )

    await conn.commit()

    return { success: true }

  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})
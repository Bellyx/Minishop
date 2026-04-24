import { db } from '~/server/utils/db'
import { getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    /* =========================
       1. LOCK ORDER
    ========================= */
    const [rows]: any = await conn.query(
      'SELECT * FROM orders WHERE id=? FOR UPDATE',
      [id]
    )

    const order = rows?.[0]

    if (!order) throw createError({ message: 'ไม่พบ order' })

    if (order.status === 'paid') {
      await conn.rollback()
      return { ok: true }
    }

    /* =========================
       2. UPDATE STATUS
    ========================= */
    await conn.query(
      'UPDATE orders SET status="paid" WHERE id=?',
      [id]
    )

    /* =========================
       3. ตัด stock + log (🔥 FIX)
    ========================= */
    const [items]: any = await conn.query(
      'SELECT * FROM order_items WHERE order_id=?',
      [id]
    )

    for (const item of items) {

      // 🔥 LOCK product row
      const [pRows]: any = await conn.query(
        'SELECT stock FROM products WHERE id=? FOR UPDATE',
        [item.product_id]
      )

      const before = Number(pRows?.[0]?.stock || 0)
      const after = before - Number(item.qty)

      if (after < 0) {
        throw createError({ message: 'Stock ติดลบ' })
      }

      // update stock
      await conn.query(
        'UPDATE products SET stock=? WHERE id=?',
        [after, item.product_id]
      )

      // 🔥 insert log แบบครบ
      await conn.query(`
       INSERT INTO stock_logs 
      (product_id, type, qty, before_qty, after_qty, note, order_id)
      VALUES (?, 'out', ?, ?, ?, ?, ?)
      `, [
        item.product_id,
        item.qty,
        before,
        after,
        `ขาย order #${id}`
      ])
    }

    /* =========================
       4. ใช้แต้ม
    ========================= */
    if (order.use_points && order.customer_phone) {

      const [cust]: any = await conn.query(
        'SELECT points FROM customers WHERE phone=? FOR UPDATE',
        [order.customer_phone]
      )

      const current = cust?.[0]?.points || 0

      if (order.use_points > current) {
        throw createError({ message: 'แต้มไม่พอ (sync error)' })
      }

      await conn.query(
        'UPDATE customers SET points = points - ? WHERE phone=?',
        [order.use_points, order.customer_phone]
      )

      await conn.query(`
        INSERT INTO point_logs (customer_phone, order_id, points, type)
        VALUES (?, ?, ?, 'redeem')
      `, [order.customer_phone, id, order.use_points])
    }

    /* =========================
       5. เพิ่มแต้ม
    ========================= */
    if (order.customer_phone && order.points > 0) {
      await conn.query(`
        INSERT INTO customers (name, phone, points)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        points = points + VALUES(points)
      `, [
        order.customer_name || '',
        order.customer_phone,
        order.points
      ])

      await conn.query(`
        INSERT INTO point_logs (customer_phone, order_id, points, type)
        VALUES (?, ?, ?, 'earn')
      `, [order.customer_phone, id, order.points])
    }

    await conn.commit()

    return { success: true }

  } catch (err: any) {
    await conn.rollback()
    throw createError({ message: err.message })
  } finally {
    conn.release()
  }
})
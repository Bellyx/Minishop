import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.product_id || !body.qty) {
    throw createError({
      statusCode: 400,
      message: 'ข้อมูลไม่ครบ'
    })
  }

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    /* =========================
       1. LOCK PRODUCT
    ========================= */
    const [rows]: any = await conn.query(
      'SELECT * FROM products WHERE id=? FOR UPDATE',
      [body.product_id]
    )

    const p = rows?.[0]

    if (!p) throw createError({ message: 'ไม่พบสินค้า' })

    const before = Number(p.stock || 0)
    const qty = Number(body.qty)
    const after = before + qty

    if (qty <= 0) {
      throw createError({ message: 'จำนวนต้องมากกว่า 0' })
    }

    /* =========================
       2. UPDATE STOCK
    ========================= */
    await conn.query(
      'UPDATE products SET stock=? WHERE id=?',
      [after, body.product_id]
    )

    /* =========================
       3. INSERT LOG
    ========================= */
    await conn.query(`
      INSERT INTO stock_logs 
      (product_id, type, qty, before_qty, after_qty, note)
      VALUES (?, 'in', ?, ?, ?, ?)
    `, [
      body.product_id,
      qty,
      before,
      after,
      body.note || 'เติมสินค้า'
    ])

    await conn.commit()

    return {
      success: true,
      before,
      after
    }

  } catch (err: any) {
    await conn.rollback()
    throw createError({ message: err.message })
  } finally {
    conn.release()
  }
})
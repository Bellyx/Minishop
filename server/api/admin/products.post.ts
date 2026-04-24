import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.price) {
    throw createError({
      statusCode: 400,
      message: 'ข้อมูลไม่ครบ'
    })
  }

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    /* =========================
       1. CREATE PRODUCT
    ========================= */
    const [res]: any = await conn.query(
      `INSERT INTO products 
      (name, price, cost, stock, point_base, promo_point, promo_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.name,
        body.price,
        body.cost || 0,
        body.stock || 0,
        body.point_base || 0,
        body.promo_point || 0,
        body.promo_active ? 1 : 0
      ]
    )

    const productId = res.insertId

    /* =========================
       2. LOG (🔥 เพิ่มตรงนี้)
    ========================= */
    if (body.stock > 0) {
      await conn.query(`
        INSERT INTO stock_logs 
        (product_id, type, qty, before_qty, after_qty, note)
        VALUES (?, 'in', ?, ?, ?, ?)
      `, [
        productId,
        body.stock,
        0,                    // before
        body.stock,           // after
        'สร้างสินค้า (initial stock)'
      ])
    }

    await conn.commit()

    return { success: true, id: productId }

  } catch (err: any) {
    await conn.rollback()
    throw createError({ message: err.message })
  } finally {
    conn.release()
  }
})
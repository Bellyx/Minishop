import { db } from '~/server/utils/db'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { calcPoints } from '~/server/utils/point'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usePoints = Number(body.usePoints || 0)

  const conn = await db.getConnection()
 if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({
        statusCode: 400,
        message: 'ไม่มีสินค้าในตะกร้า'
    })
    }
  try {
    await conn.beginTransaction()

    // =========================
    // CONFIG
    // =========================
    const [cfgRows]: any = await conn.query(`
    SELECT * FROM settings 
    WHERE \`key\` IN ('point_value','max_point_percent')
    `)

    const cfg: any = {}
    cfgRows.forEach(r => cfg[r.key] = Number(r.value))

    const pointValue = cfg.point_value || 1
    const maxPercent = cfg.max_point_percent || 5000

    /* =========================
       1. คำนวณยอดจริง
    ========================= */
    let total = 0
    let totalPoints = 0
    const productMap: any = {}

    for (const item of body.items) {
      const [rows]: any = await conn.query(
        'SELECT * FROM products WHERE id=?',
        [item.id]
      )

      const p = rows?.[0]

      if (!p) throw createError({ message: 'ไม่พบสินค้า' })
      if (p.stock < item.qty) throw createError({ message: `สินค้าไม่พอ ${p.name}` })

      productMap[item.id] = p

      total += p.price * item.qty

      totalPoints += calcPoints(p) * item.qty
    }

    /* =========================
       2. ตรวจแต้มลูกค้า
    ========================= */
    let customerPoints = 0

    if (body.customerPhone) {
      const [rows]: any = await conn.query(
        'SELECT points FROM customers WHERE phone=?',
        [body.customerPhone]
      )

      customerPoints = rows?.[0]?.points || 0
    }

    /* =========================
       3. VALIDATE แต้ม (กันโกง)
    ========================= */
    if (usePoints > 0) {
      if (!body.customerPhone) {
        throw createError({ message: 'ไม่มีสมาชิก' })
      }

      if (usePoints > customerPoints) {
        throw createError({ message: 'แต้มไม่พอ' })
      }

      const maxDiscount = (total * maxPercent) / 100
      const maxPoints = Math.floor(maxDiscount / pointValue)

      if (usePoints > maxPoints) {
        throw createError({ message: 'ใช้แต้มเกินที่กำหนด' })
      }
    }

    /* =========================
       4. คำนวณราคาสุทธิ
    ========================= */
    const discount = usePoints * pointValue
    const finalTotal = Math.max(0, total - discount)

    /* =========================
       5. สร้าง ORDER
    ========================= */
    const [orderResult]: any = await conn.query(`
      INSERT INTO orders
      (amount, status, customer_name, customer_phone, points, payment_method, use_points)
      VALUES (?, 'pending', ?, ?, ?, ?, ?)
    `, [
      finalTotal,
      body.customerName || null,
      body.customerPhone || null,
      totalPoints,
      body.paymentMethod || 'cash',
      usePoints
    ])

    const orderId = orderResult.insertId

    /* =========================
       6. insert items
    ========================= */
    for (const item of body.items) {
      const p = productMap[item.id]

      await conn.query(`
        INSERT INTO order_items (order_id, product_id, qty, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.id, item.qty, p.price])
    }

    await conn.commit()

    /* =========================
       7. QR
    ========================= */
    const payload = generatePayload(String(cfg.promptpay_id || ''), {
      amount: finalTotal
    })

    const qr = await QRCode.toDataURL(payload)

    return {
      order_id: orderId,
      amount: finalTotal,
      points: totalPoints,
      total_points: customerPoints,
      qr_code: qr
    }

  } catch (err: any) {
    await conn.rollback()
    throw createError({ message: err.message })
  } finally {
    conn.release()
  }
})
import { db } from '~/server/utils/db'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { calcPoints } from '~/server/utils/point'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usePoints = Number(body.usePoints || 0)

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, message: 'ไม่มีสินค้าในตะกร้า' })
  }

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    /* =========================
       CONFIG (โหลดครบ!!)
    ========================= */
    const [cfgRows]: any = await conn.query(`
      SELECT * FROM settings 
      WHERE \`key\` IN ('point_value','max_point_percent','promptpay_id')
    `)

    const cfg: any = {}
    cfgRows.forEach(r => cfg[r.key] = r.value)

    const pointValue = Number(cfg.point_value || 1)
    const maxPercent = Number(cfg.max_point_percent || 50)
    const promptpayId = String(cfg.promptpay_id || '')
    console.log('CONFIG FROM DB:', cfg)
    console.log('pointValue:', pointValue)
    /* =========================
       1. CALC TOTAL
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
       2. CUSTOMER POINT
    ========================= */
    let customerPoints = 0

    if (body.customerPhone) {
      const [rows]: any = await conn.query(
        'SELECT points FROM customers WHERE phone=?',
        [body.customerPhone]
      )
      customerPoints = Number(rows?.[0]?.points || 0)
    }

    /* =========================
       3. VALIDATE (กันโกง)
    ========================= */
    if (usePoints > 0) {
      if (!body.customerPhone) throw createError({ message: 'ไม่มีสมาชิก' })

      if (usePoints > customerPoints) {
        throw createError({ message: 'แต้มไม่พอ' })
      }

      const maxDiscount = (total * maxPercent) / 100
      const maxPoints = Math.floor(maxDiscount / pointValue)

      if (usePoints > maxPoints) {
        throw createError({ message: 'ใช้แต้มเกินกำหนด' })
      }
    }

    /* =========================
       4. FINAL TOTAL
    ========================= */
    const discount = usePoints * pointValue
    const finalTotal = Math.max(0, total - discount)

    /* =========================
       5. CREATE ORDER
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
       6. INSERT ITEMS
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
       7. QR (🔥 ใช้ finalTotal)
    ========================= */
    let qr = null

    if (promptpayId && body.paymentMethod === 'qr') {
      const payload = generatePayload(promptpayId, {
        amount: finalTotal
      })
      qr = await QRCode.toDataURL(payload)
    }

    return {
      order_id: orderId,
      amount: finalTotal,
      total: total,                  // 🔥 ยอดก่อนลด
      discount: discount,           // 🔥 ส่วนลด
      use_points: usePoints,        // 🔥 ใช้กี่แต้ม
      point_value: pointValue,      // 🔥 1 แต้ม = กี่บาท
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
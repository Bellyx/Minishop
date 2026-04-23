import { db } from '~/server/utils/db'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usePoints = Number(body?.usePoints || 0)

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'ไม่มีสินค้าในตะกร้า'
    })
  }

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    /* =========================
       CONFIG
    ========================= */
    const [cfgRows]: any = await conn.query(`
      SELECT * FROM settings 
      WHERE \`key\` IN ('point_rate','point_value','max_point_percent','promptpay_id')
    `)

    const cfg: any = {}
    cfgRows.forEach(r => {
      // 🔥 promptpay_id ต้องเป็น string
      cfg[r.key] = r.key === 'promptpay_id' ? r.value : Number(r.value)
    })

    const pointRate = Number(cfg.point_rate || 10)
    const pointValue = Number(cfg.point_value || 1)
    const maxPercent = Number(cfg.max_point_percent || 50)
    const promptpayId = String(cfg.promptpay_id || '')

    /* =========================
       CALCULATE
    ========================= */
    let total = 0
    let bonusPoints = 0
    const productMap: any = {}

    for (const item of body.items) {
      const qty = Number(item.qty || 0)

      if (!item.id || qty <= 0) {
        throw createError({ message: 'ข้อมูลสินค้าไม่ถูกต้อง' })
      }

      const [rows]: any = await conn.query(
        'SELECT * FROM products WHERE id=?',
        [item.id]
      )

      const p = rows?.[0]

      if (!p) throw createError({ message: 'ไม่พบสินค้า' })
      if (p.stock < qty) throw createError({ message: `สินค้าไม่พอ ${p.name}` })

      productMap[item.id] = p

      const price = Number(p.price || 0)

      // 💰 รวมราคา
      total += price * qty

      // 🎁 แต้มพิเศษ
      bonusPoints += Number(p.promo_point || 0) * qty
    }

    // 🎯 แต้มจากยอดรวม
    const basePoints = Math.floor(total / pointRate)

    // 🎯 รวมแต้ม
    const totalPoints = basePoints + bonusPoints

    /* =========================
       CUSTOMER POINTS
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
       VALIDATE USE POINTS
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
       FINAL PRICE
    ========================= */
    const discount = usePoints * pointValue
    const finalTotal = Math.max(0, total - discount)

    /* =========================
       CREATE ORDER
    ========================= */
    const [orderResult]: any = await conn.query(`
      INSERT INTO orders
      (amount, total, discount, use_points, status, customer_name, customer_phone, points, payment_method)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `, [
      finalTotal,
      total,
      discount,
      usePoints,
      body.customerName || null,
      body.customerPhone || null,
      totalPoints,
      body.paymentMethod || 'cash'
    ])

    const orderId = orderResult.insertId

    /* =========================
       INSERT ITEMS + CUT STOCK
    ========================= */
    for (const item of body.items) {
      const p = productMap[item.id]
      const qty = Number(item.qty || 0)

      await conn.query(`
        INSERT INTO order_items (order_id, product_id, qty, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.id, qty, Number(p.price)])

      await conn.query(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `, [qty, item.id])
    }

    await conn.commit()

    /* =========================
       QR
    ========================= */
    const payload = generatePayload(promptpayId, {
      amount: finalTotal
    })

    const qr = await QRCode.toDataURL(payload)

    return {
      order_id: orderId,
      total,            // 💰 ก่อนลด
      discount,         // 🎁 ส่วนลด
      amount: finalTotal, // 💵 จ่ายจริง
      points: totalPoints,
      total_points: customerPoints,
      use_points: usePoints,
      qr_code: qr
    }

  } catch (err: any) {
    await conn.rollback()
    throw createError({
      statusCode: 500,
      message: err.message || 'เกิดข้อผิดพลาด'
    })
  } finally {
    conn.release()
  }
})
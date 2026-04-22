import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const today = new Date().toISOString().slice(0, 10)

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    // ❌ กันปิดซ้ำ
    const [exists]: any = await conn.query(
      `SELECT id FROM daily_reports WHERE report_date=?`,
      [today]
    )

    if (exists.length) {
      throw createError({
        statusCode: 400,
        message: 'วันนี้ปิดยอดไปแล้ว'
      })
    }

    // 💰 ยอดรวม
    const [sales]: any = await conn.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(amount) as total_sales
      FROM orders
      WHERE status='paid'
      AND DATE(created_at)=?
    `, [today])

    // 💸 กำไร
    const [profit]: any = await conn.query(`
      SELECT 
        SUM((oi.qty * oi.price) - (oi.qty * p.cost)) as profit
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status='paid'
      AND DATE(o.created_at)=?
    `, [today])

    // 💳 แยกช่องทางจ่าย
    const [payments]: any = await conn.query(`
      SELECT 
        payment_method,
        SUM(amount) as total
      FROM orders
      WHERE status='paid'
      AND DATE(created_at)=?
      GROUP BY payment_method
    `, [today])

    let cash = 0, promptpay = 0, transfer = 0

    payments.forEach(p => {
      if (p.payment_method === 'cash') cash = p.total
      if (p.payment_method === 'promptpay') promptpay = p.total
      if (p.payment_method === 'transfer') transfer = p.total
    })

    // 💾 SAVE REPORT
    await conn.query(`
      INSERT INTO daily_reports
      (report_date, total_sales, total_orders, total_profit, cash_total, promptpay_total, transfer_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      today,
      sales[0].total_sales || 0,
      sales[0].total_orders || 0,
      profit[0].profit || 0,
      cash,
      promptpay,
      transfer
    ])

    await conn.commit()

    return {
      message: 'ปิดยอดเรียบร้อย',
      date: today
    }

  } catch (err: any) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})
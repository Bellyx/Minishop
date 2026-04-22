import ExcelJS from 'exceljs'
import path from 'path'
import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const date = body.date || new Date().toISOString().slice(0, 10)

  /* ================= QUERY ================= */

  // ยอดรวม
  const [summary]: any = await db.query(`
    SELECT 
      SUM(amount) as total,
      SUM(CASE WHEN payment_method='cash' THEN amount ELSE 0 END) as cash,
      SUM(CASE WHEN payment_method='promptpay' THEN amount ELSE 0 END) as promptpay
    FROM orders
    WHERE status='paid' AND DATE(created_at)=?
  `, [date])

  // รายการขาย
  const [items]: any = await db.query(`
    SELECT 
      o.id,
      o.created_at,
      p.name,
      oi.qty,
      oi.price,
      (oi.qty * oi.price) as total,
      (oi.qty * (oi.price - IFNULL(p.cost,0))) as profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid' AND DATE(o.created_at)=?
  `, [date])

  // Top สินค้า
  const [top]: any = await db.query(`
    SELECT 
      p.name,
      SUM(oi.qty) as sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid' AND DATE(o.created_at)=?
    GROUP BY oi.product_id
    ORDER BY sold DESC
    LIMIT 5
  `, [date])

  /* ================= EXCEL ================= */

  const workbook = new ExcelJS.Workbook()

  /* ---------- SHEET 1: SUMMARY ---------- */
  const s1 = workbook.addWorksheet('Summary')

  s1.addRow(['📊 สรุปยอดขาย'])
  s1.addRow(['วันที่', date])
  s1.addRow([])

  s1.addRow(['ยอดรวม', summary[0].total || 0])
  s1.addRow(['เงินสด', summary[0].cash || 0])
  s1.addRow(['PromptPay', summary[0].promptpay || 0])

  /* ---------- SHEET 2: SALES ---------- */
  const s2 = workbook.addWorksheet('Sales')

  s2.columns = [
    { header: 'Order', key: 'id', width: 10 },
    { header: 'เวลา', key: 'time', width: 20 },
    { header: 'สินค้า', key: 'name', width: 25 },
    { header: 'จำนวน', key: 'qty', width: 10 },
    { header: 'ราคา', key: 'price', width: 15 },
    { header: 'รวม', key: 'total', width: 15 },
    { header: 'กำไร', key: 'profit', width: 15 }
  ]

  items.forEach(i => {
    s2.addRow({
      id: i.id,
      time: i.created_at,
      name: i.name,
      qty: i.qty,
      price: i.price,
      total: i.total,
      profit: i.profit
    })
  })

  /* ---------- SHEET 3: TOP ---------- */
  const s3 = workbook.addWorksheet('Top Products')

  s3.columns = [
    { header: 'สินค้า', key: 'name', width: 25 },
    { header: 'ขายได้', key: 'sold', width: 15 }
  ]

  top.forEach((t: any, i: number) => {
    const row = s3.addRow(t)

    // 🏆 highlight top 1
    if (i === 0) {
      row.font = { bold: true }
    }
  })

  /* ================= SAVE ================= */

  const fileName = `report-${date}.xlsx`
  const filePath = path.resolve(`public/reports/${fileName}`)

  await workbook.xlsx.writeFile(filePath)

  return {
    url: `/reports/${fileName}`
  }
})
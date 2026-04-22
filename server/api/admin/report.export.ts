import { db } from '~/server/utils/db'
import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  // =========================
  // 📅 DATE RANGE (default = วันนี้)
  // =========================
  const start = q.start || new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const end = q.end || start

  const workbook = new ExcelJS.Workbook()

  /* =========================
     1) ORDERS (มีต้นทุน + กำไร)
  ========================= */
  const orderSheet = workbook.addWorksheet('Orders')

  const [orders]: any = await db.query(`
    SELECT 
      o.id,
      o.created_at,
      o.amount,
      o.points,
      o.customer_name,
      o.customer_phone,
      p.name as product_name,
      oi.qty,
      oi.price,
      p.cost,
      (oi.qty * oi.price) as sales,
      (oi.qty * p.cost) as cost_total,
      ((oi.qty * oi.price) - (oi.qty * p.cost)) as profit
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
    ORDER BY o.created_at DESC
  `, [start, end])

  orderSheet.columns = [
    { header: 'Order ID', key: 'id', width: 10 },
    { header: 'วันที่', key: 'created_at', width: 20 },
    { header: 'ลูกค้า', key: 'customer_name', width: 20 },
    { header: 'สินค้า', key: 'product_name', width: 25 },
    { header: 'จำนวน', key: 'qty', width: 10 },
    { header: 'ราคาขาย', key: 'price', width: 12 },
    { header: 'ต้นทุน', key: 'cost', width: 12 },
    { header: 'ยอดขาย', key: 'sales', width: 15 },
    { header: 'ต้นทุนรวม', key: 'cost_total', width: 15 },
    { header: 'กำไร', key: 'profit', width: 15 },
    { header: 'แต้ม', key: 'points', width: 10 }
  ]

  orders.forEach(r => {
    orderSheet.addRow({
      ...r,
      created_at: new Date(r.created_at).toLocaleString('th-TH')
    })
  })

  orderSheet.getRow(1).font = { bold: true }
  orderSheet.autoFilter = 'A1:K1'

  // 💸 สีเขียว = กำไร, สีแดง = ขาดทุน
  orderSheet.eachRow((row, i) => {
    if (i === 1) return
    const profit = row.getCell(10).value
    if (Number(profit) > 0) {
      row.getCell(10).font = { color: { argb: 'FF16A34A' } }
    } else {
      row.getCell(10).font = { color: { argb: 'FFDC2626' } }
    }
  })

  /* =========================
     2) PRODUCTS SUMMARY + TOP 5
  ========================= */
  const productSheet = workbook.addWorksheet('Products')

  const [products]: any = await db.query(`
    SELECT 
      p.name,
      SUM(oi.qty) as total_qty,
      SUM(oi.qty * oi.price) as total_sales,
      SUM(oi.qty * p.cost) as total_cost,
      SUM((oi.qty * oi.price) - (oi.qty * p.cost)) as profit
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status='paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY p.id
    ORDER BY total_qty DESC
  `, [start, end])

  productSheet.columns = [
    { header: 'สินค้า', key: 'name', width: 25 },
    { header: 'จำนวนขาย', key: 'total_qty', width: 15 },
    { header: 'ยอดขาย', key: 'total_sales', width: 15 },
    { header: 'ต้นทุน', key: 'total_cost', width: 15 },
    { header: 'กำไร', key: 'profit', width: 15 }
  ]

  products.forEach((r, i) => {
    const row = productSheet.addRow(r)

    // 🔥 TOP 5 Highlight
    if (i < 5) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF3C7' } // เหลืองอ่อน
      }
      row.font = { bold: true }
    }
  })

  productSheet.getRow(1).font = { bold: true }

  /* =========================
     3) 📊 DAILY SUMMARY
  ========================= */
  const dailySheet = workbook.addWorksheet('Daily')

  const [daily]: any = await db.query(`
    SELECT 
      DATE(o.created_at) as day,
      SUM(o.amount) as total_sales,
      SUM((oi.qty * oi.price) - (oi.qty * p.cost)) as profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY DATE(o.created_at)
    ORDER BY day ASC
  `, [start, end])

  dailySheet.columns = [
    { header: 'วันที่', key: 'day', width: 15 },
    { header: 'ยอดขาย', key: 'total_sales', width: 15 },
    { header: 'กำไร', key: 'profit', width: 15 }
  ]

  daily.forEach(r => dailySheet.addRow(r))
  dailySheet.getRow(1).font = { bold: true }

  /* =========================
     4) 📊 MONTHLY SUMMARY
  ========================= */
  const monthlySheet = workbook.addWorksheet('Monthly')

  const [monthly]: any = await db.query(`
    SELECT 
      DATE_FORMAT(o.created_at, '%Y-%m') as month,
      SUM(o.amount) as total_sales,
      SUM((oi.qty * oi.price) - (oi.qty * p.cost)) as profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status='paid'
    GROUP BY month
    ORDER BY month ASC
  `)

  monthlySheet.columns = [
    { header: 'เดือน', key: 'month', width: 15 },
    { header: 'ยอดขาย', key: 'total_sales', width: 15 },
    { header: 'กำไร', key: 'profit', width: 15 }
  ]

  monthly.forEach(r => monthlySheet.addRow(r))
  monthlySheet.getRow(1).font = { bold: true }

  /* =========================
     EXPORT
  ========================= */
  const buffer = await workbook.xlsx.writeBuffer()

  setHeader(event, 'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )

  setHeader(event, 'Content-Disposition',
    `attachment; filename=report-${start}_to_${end}.xlsx`
  )

  return buffer
})
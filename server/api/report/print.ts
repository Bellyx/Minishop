import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const today = new Date().toISOString().slice(0, 10)

  const [r]: any = await db.query(
    `SELECT * FROM daily_reports WHERE report_date=?`,
    [today]
  )

  if (!r.length) throw new Error('ยังไม่ปิดยอด')

  const data = r[0]

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const fontBytes = fs.readFileSync(
    path.resolve('server/fonts/Sarabun-Regular.ttf')
  )

  const font = await pdfDoc.embedFont(fontBytes)

  const page = pdfDoc.addPage([300, 500])

  let y = 470
  const draw = (t, size = 12) => {
    page.drawText(t, { x: 20, y, size, font })
    y -= size + 5
  }

  draw('📊 Z-REPORT', 16)
  draw(`วันที่: ${data.report_date}`)
  draw('-------------------')

  draw(`ยอดขาย: ${data.total_sales} บาท`)
  draw(`จำนวนบิล: ${data.total_orders}`)
  draw(`กำไร: ${data.total_profit} บาท`)

  draw('-------------------')
  draw(`เงินสด: ${data.cash_total}`)
  draw(`PromptPay: ${data.promptpay_total}`)
  draw(`โอน: ${data.transfer_total}`)

  const pdfBytes = await pdfDoc.save()

  const file = `zreport-${Date.now()}.pdf`
  const filePath = path.resolve(`public/reports/${file}`)

  fs.writeFileSync(filePath, pdfBytes)

  return { url: `/reports/${file}` }
})
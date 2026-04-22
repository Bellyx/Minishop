import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 1. Setup PDF
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // 🔥 โหลดฟอนต์ไทย (สมมติว่าใช้ Sarabun)
  const fontPath = path.resolve('server/fonts/Sarabun-Regular.ttf')
  const fontBytes = fs.readFileSync(fontPath)
  const thaiFont = await pdfDoc.embedFont(fontBytes, { subset: true }) // subset ช่วยลดขนาดไฟล์

  // 2. ตั้งค่าหน้ากระดาษ (Dynamic Height)
  const baseHeight = 250 // ความสูงส่วนหัว + ท้าย
  const itemHeight = 28 // ความสูงต่อ 1 รายการ
  const totalItems = (body.items || []).length
  const pageHeight = baseHeight + (totalItems * itemHeight) + 50 // +50 margin
  
  // ความกว้าง 80mm (ประมาณ 226 pt) หรือ 3 นิ้ว (216 pt)
  const pageWidth = 240 
  const margin = 15
  const rightX = pageWidth - margin

  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Variables
  let y = pageHeight - 30
  
  // Helpers
  const format = (n: number) => Number(n || 0).toLocaleString('th-TH')
  
  const drawText = (text: string, x: number, size = 10, options: any = {}) => {
    const { align = 'left', maxWidth = 0 } = options
    let finalX = x
    
    // Handle alignment
    if (align === 'center') {
        const textWidth = thaiFont.widthOfTextAtSize(text, size)
        finalX = (pageWidth / 2) - (textWidth / 2)
    } else if (align === 'right') {
        const textWidth = thaiFont.widthOfTextAtSize(text, size)
        finalX = rightX - textWidth
    }

    page.drawText(text, {
      x: finalX,
      y,
      size,
      font: thaiFont
    })
  }

  const moveY = (val = 16) => { y -= val }
  const drawLine = () => {
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: rightX, y: y + 5 },
      thickness: 0.5,
      opacity: 0.5
    })
    moveY(10)
  }

  // ================= HEADER =================
  // ชื่อร้าน (สมมติ หรือรับจาก body)
  const shopName = body.shopName || 'Coffee Shop POS'
  drawText(shopName, 0, 14, { align: 'center' })
  moveY(18)

  drawText('สาขา: สาขาหลัก', margin, 9)
  drawText('โทร: 08x-xxx-xxxx', margin, 9)
  moveY(10)
  drawLine()

  // ================= INFO =================
  // วันที่แบบไทย
  const now = new Date()
  const dateStr = now.toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  })
  const timeStr = now.toLocaleTimeString('th-TH', { 
    hour: '2-digit', minute: '2-digit' 
  })

  drawText(`วันที่: ${dateStr} ${timeStr}`, margin, 9)
  drawText(`เลขที่บิล: ${body.orderId || '-'}`, margin, 9)
  
  if (body.customerName) {
    drawText(`สมาชิก: ${body.customerName}`, margin, 9)
  }
  
  moveY(5)
  drawLine()

  // ================= ITEMS HEADER =================
  drawText('รายการ', margin, 10)
  drawText('ยอดเงิน', 0, 10, { align: 'right' })
  moveY(14)

  // ================= ITEMS LIST =================
  let subTotal = 0

  for (const item of body.items || []) {
    const name = item.name || '-'
    const qty = item.qty || 0
    const price = item.price || 0
    const total = price * qty
    subTotal += total

    // แสดงชื่อสินค้า (ถ้าชื่อยาวไปอาจจะตัด แต่ Sarabun เล็กดีอยู่แล้ว)
    drawText(name, margin, 9)
    
    // แสดง จำนวน x ราคา แบบตัวเล็ก (ชิดซ้าย)
    // เช่น 2 x 50.00
    // drawText(`   ${qty} x ${format(price)}`, margin, 8) // ถ้าอยากแสดงรายละเอียดลึก
    
    // แสดงยอดรวมของไอเทมนั้น (ชิดขวา)
    drawText(format(total), 0, 9, { align: 'right' })
    
    moveY(14)
  }

  drawLine()

  // ================= TOTAL =================
  drawText('รวมเงิน', margin, 10)
  drawText(format(body.total || subTotal), 0, 10, { align: 'right' })
  moveY(16)

  // Payment Details (ถ้ามีข้อมูลเงินสด)
  if (body.paymentMethod === 'cash' && body.cashReceived > 0) {
    drawText('รับเงิน', margin, 10)
    drawText(format(body.cashReceived), 0, 10, { align: 'right' })
    moveY(14)

    const change = body.cashReceived - (body.total || subTotal)
    drawText('ทอนเงิน', margin, 10)
    drawText(format(change), 0, 10, { align: 'right' })
    moveY(16)
  }

  drawLine()

  // ================= POINTS =================
  if (body.points !== undefined) {
    drawText(`🎁 ได้รับแต้ม: +${format(body.points)}`, margin, 10)
    moveY(12)
  }

  if (body.totalPoints !== undefined) {
    drawText(`⭐ แต้มสะสม: ${format(body.totalPoints)}`, margin, 10)
    moveY(12)
  }

  // ================= FOOTER =================
  moveY(10)
  drawText('ขอบคุณที่ใช้บริการครับ/ค่ะ', 0, 10, { align: 'center' })
  moveY(14)
  drawText('กดกดเลย ติดต่อเรา line: @coffeeshop', 0, 8, { align: 'center' })

  // ================= SAVE =================
  const pdfBytes = await pdfDoc.save()
  const fileName = `receipt-${Date.now()}.pdf`
  const filePath = path.resolve(`public/receipts/${fileName}`)

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, pdfBytes)

  return {
    url: `/receipts/${fileName}`
  }
})
export const calcPoints = (product: any, cfg: any) => {

  // 🔥 1. โปรสินค้า (แรงสุด)
  if (product.promo_active && product.promo_point > 0) {
    return Number(product.promo_point)
  }

  // 🔥 2. กำหนดแต้มต่อชิ้นเอง
  if (product.point_base && product.point_base > 0) {
    return Number(product.point_base)
  }

  // 🔥 3. ใช้ config จาก DB (หลักของระบบ)
  const rate = Number(cfg.point_rate || 20) // 20 บาท = 1 แต้ม

  return Math.floor(product.price / rate)
}
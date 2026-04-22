import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.price) {
    throw createError({
      statusCode: 400,
      message: 'ข้อมูลไม่ครบ'
    })
  }

  const [res]: any = await db.query(
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
 

  return { success: true, id: res.insertId }
})
import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'Missing ID' })
  }

  await db.query(
    `UPDATE products SET
      cost = COALESCE(?, cost),
      stock = COALESCE(?, stock),
      point_base = COALESCE(?, point_base),
      promo_point = COALESCE(?, promo_point),
      promo_active = COALESCE(?, promo_active)
    WHERE id = ?`,
    [
      body.cost,
      body.stock,
      body.point_base,
      body.promo_point,
      body.promo_active,
      body.id
    ]
  )

  return { success: true }
})
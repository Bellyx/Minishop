export default defineEventHandler(async (event) => {
  const { phone } = getQuery(event)

  if (!phone) {
    throw createError({ statusCode: 400, message: 'no phone' })
  }

  const [rows]: any = await db.query(
    `SELECT * FROM point_logs 
     WHERE customer_phone=? 
     ORDER BY created_at DESC`,
    [phone]
  )

  return rows
})
import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const page = Number(query.page || 1)
  const limit = Number(query.limit || 10)
  const offset = (page - 1) * limit

  const search = query.search || ''
  const from = query.from || ''
  const to = query.to || ''

  const conn = await db.getConnection()

  try {
    let where = `WHERE 1=1`
    const params: any[] = []

    // 🔍 search order id / phone
    if (search) {
      where += ` AND (id LIKE ? OR customer_phone LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    // 📅 filter date
    if (from) {
      where += ` AND DATE(created_at) >= ?`
      params.push(from)
    }

    if (to) {
      where += ` AND DATE(created_at) <= ?`
      params.push(to)
    }

    const [rows]: any = await conn.query(`
      SELECT * FROM orders
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    const [[{ total }]]: any = await conn.query(`
      SELECT COUNT(*) as total FROM orders ${where}
    `, params)

    return {
      data: rows,
      total,
      page,
      limit
    }

  } finally {
    conn.release()
  }
})
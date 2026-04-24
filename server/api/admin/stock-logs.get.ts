import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  const type = q.type || ''
  const product = q.product || ''

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (type) {
    where += ' AND sl.type=?'
    params.push(type)
  }

  if (product) {
    where += ' AND p.name LIKE ?'
    params.push(`%${product}%`)
  }

  const [rows]: any = await db.query(`
    SELECT 
      sl.*,
      p.name as product_name
    FROM stock_logs sl
    LEFT JOIN products p ON p.id = sl.product_id
    ${where}
    ORDER BY sl.id DESC
    LIMIT 200
  `, params)

  return rows
})
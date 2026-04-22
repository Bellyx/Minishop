import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const today = new Date().toISOString().slice(0, 10)

  const [rows]: any = await db.query(
    `SELECT * FROM daily_reports WHERE report_date=?`,
    [today]
  )

  return rows[0] || null
})
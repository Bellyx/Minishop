import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  await db.query(
    'UPDATE customers SET points=? WHERE id=?',
    [body.points, body.id]
  )

  return { success: true }
})
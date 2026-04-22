import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  await db.query(
    'DELETE FROM customers WHERE id=?',
    [body.id]
  )

  return { success: true }
})
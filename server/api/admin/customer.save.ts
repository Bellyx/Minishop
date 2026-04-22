import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (body.id) {
    // update
    await db.query(
      'UPDATE customers SET name=?, phone=?, points=? WHERE id=?',
      [body.name, body.phone, body.points, body.id]
    )
  } else {
    // create (default 100 point)
    await db.query(
      'INSERT INTO customers (name, phone, points) VALUES (?, ?, ?)',
      [body.name, body.phone, body.points || 100]
    )
  }

  return { success: true }
})
import { db } from '../utils/db'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const [rows]: any = await db.query(
    'SELECT * FROM users WHERE username=? AND password=?',
    [body.username, body.password]
  )

  if (!rows[0]) {
    throw createError({ statusCode: 401, message: 'invalid' })
  }

  const token = jwt.sign(
    { id: rows[0].id, username: rows[0].username },
    'SECRET_KEY',
    { expiresIn: '1d' }
  )

  return { token }
})
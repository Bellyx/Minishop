import { db } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  for (const key in body) {
    await db.query(`
      INSERT INTO settings (\`key\`, value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `, [key, body[key]])
  }

  return { success: true }
})
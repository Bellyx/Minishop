import { db } from '~/server/utils/db'

export default defineEventHandler(async () => {
  const [rows]: any = await db.query(`
    SELECT \`key\`, value FROM settings
  `)

  const cfg: any = {}

  rows.forEach(r => {
  cfg[r.key] = Number(r.value) // 🔥 บังคับเป็น number
   })

  return cfg
})
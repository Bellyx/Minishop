// pseudo example
import { db } from '~/server/utils/db'

export default async () => {

  // 1. ดึง order pending
  const [orders]: any = await db.query(
    'SELECT * FROM orders WHERE status="pending"'
  )

  for (const o of orders) {

    // 2. ไปเช็คเงินเข้า (mock / api bank)
    const paid = await checkBank(o.amount)

    if (paid) {
      await db.query(
        'UPDATE orders SET status="paid", paid_at=NOW() WHERE id=?',
        [o.id]
      )
    }
  }
}
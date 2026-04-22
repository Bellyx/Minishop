import jwt from 'jsonwebtoken'

export const verify = (event) => {
  const auth = getHeader(event, 'authorization')

  if (!auth) throw createError({ statusCode: 401 })

  try {
    return jwt.verify(auth.replace('Bearer ', ''), 'SECRET_KEY')
  } catch {
    throw createError({ statusCode: 401 })
  }
}
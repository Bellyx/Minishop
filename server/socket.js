import { Server } from "socket.io"

export default function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" }
  })

  io.on("connection", (socket) => {
    console.log("POS client connected")

    socket.on("join-order", (orderId) => {
      socket.join(`order-${orderId}`)
    })

    socket.on("paid", (orderId) => {
      io.to(`order-${orderId}`).emit("paid-success", {
        orderId
      })
    })
  })

  return io
}
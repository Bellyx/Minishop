import { Server } from "socket.io"

export default defineNitroPlugin((nitroApp) => {
  const io = new Server(nitroApp.h3App.server, {
    cors: { origin: "*" }
  })

  io.on("connection", (socket) => {
    console.log("client connected")

    socket.on("join-order", (id) => {
      socket.join(`order-${id}`)
    })
  })

  nitroApp.hooks.hook("close", () => {
    io.close()
  })
})
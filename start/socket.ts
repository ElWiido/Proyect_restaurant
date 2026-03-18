import { Server as SocketServer, Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'

let io: SocketServer

export function getIO() {
  return io
}

app.ready(async () => {
  const server = await import('@adonisjs/core/services/server').then(
    (m) => m.default
  )

  console.log('🔧 Inicializando Socket.IO...')

  io = new SocketServer(server.getNodeServer()!, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  })

  console.log('✅ Socket.IO inicializado')

  io.on('connection', (socket: Socket) => {
    console.log('Cliente conectado:', socket.id)

    socket.on('join_mesas', () => {
      socket.join('mesas')
      console.log(`📌 ${socket.id} unido a canal: mesas`)
    })

    socket.on('join_pedidos', () => {
      socket.join('pedidos')
      console.log(`📌 ${socket.id} unido a canal: pedidos`)
    })

    socket.on('join_pagos', () => {
      socket.join('pagos')
      console.log(`📌 ${socket.id} unido a canal: pagos`)
    })

    socket.on('join_menu_dia', () => {
      socket.join('menu_dia')
      console.log(`📌 ${socket.id} unido a canal: menu_dia`)
    })

    socket.on('disconnect', (reason) => {
      console.log(`❌ Cliente desconectado: ${socket.id} — motivo: ${reason}`)
    })
  })
})

export { io }
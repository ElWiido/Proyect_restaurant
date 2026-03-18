import type { HttpContext } from '@adonisjs/core/http'
import { getIO } from '#start/socket'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MENU_FILE = join(process.cwd(), 'menu_dia.json')

type MenuGuardado = {
  fecha: string
  componentes: Record<string, string>
}

function fechaHoy(): string {
  const h = new Date()
  const y = h.getFullYear()
  const m = String(h.getMonth() + 1).padStart(2, '0')
  const d = String(h.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function leerArchivo(): MenuGuardado | null {
  try {
    if (!existsSync(MENU_FILE)) return null
    const raw = readFileSync(MENU_FILE, 'utf8')
    const data = JSON.parse(raw) as MenuGuardado
    if (data.fecha !== fechaHoy()) return null
    return data
  } catch {
    return null
  }
}

function escribirArchivo(menu: MenuGuardado | null) {
  try {
    writeFileSync(MENU_FILE, JSON.stringify(menu ?? null), 'utf8')
  } catch (e) {
    console.error('Error al guardar menu_dia.json:', e)
  }
}

export default class MenuDiaController {

  /** GET /menu-dia */
  public async show({ response }: HttpContext) {
    return response.json(leerArchivo())
  }

  /** POST /menu-dia — Body: { componentes: { Sopa: '...', Seco: '...', Bebida: '...' } } */
  public async save({ request, response }: HttpContext) {
    const componentes = request.input('componentes', {})
    const menu: MenuGuardado = { fecha: fechaHoy(), componentes }

    escribirArchivo(menu)
    getIO()?.to('menu_dia').emit('menu_dia_actualizado', menu)
    console.log('Menú del día guardado:', menu)

    return response.json({ ok: true, menu })
  }

  /** DELETE /menu-dia */
  public async destroy({ response }: HttpContext) {
    escribirArchivo(null)
    getIO()?.to('menu_dia').emit('menu_dia_actualizado', null)
    console.log('🍽️  Menú del día eliminado')
    return response.json({ ok: true })
  }
}
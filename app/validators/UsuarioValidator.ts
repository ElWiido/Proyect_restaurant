import vine, {SimpleMessagesProvider} from '@vinejs/vine'


vine.messagesProvider = new SimpleMessagesProvider({
    'nombre_usuario.required': 'El nombre de usuario es obligatorio',
    'nombre_usuario.database.unique': 'El nombre de usuario ya está en uso',
    'contrasena.minLength': 'La contraseña debe tener mínimo 4 caracteres',
})

export const UsuarioValidator = vine.compile(
  vine.object({
    nombre_usuario: vine.string()
      .minLength(3)
      .maxLength(30)
      .unique(async (db, value) => {
        const user = await db
          .from('usuarios')
          .where('nombre_usuario', value)
          .first()

        return !user // true = válido, false = ya existe
      }),

    contrasena: vine.string()
      .minLength(4),
  })
)

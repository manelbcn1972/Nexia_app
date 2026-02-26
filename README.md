# NEXIA - Guía de Setup

## 1. Crear proyecto en Supabase (GRATIS)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto (región: West EU / Frankfurt)
3. Guarda la **password** del proyecto
4. Ve a **SQL Editor** → pega todo el contenido de `supabase-schema.sql` → ejecutar
5. Ve a **Settings → API** y copia:
   - `Project URL` → será tu `VITE_SUPABASE_URL`
   - `anon public key` → será tu `VITE_SUPABASE_ANON_KEY`

## 2. Crear tu usuario terapeuta

1. En Supabase, ve a **Authentication → Users → Add user**
2. Crea tu usuario con tu email y contraseña
3. Copia el **User UID** que aparece
4. Ve a **SQL Editor** y ejecuta:

```sql
INSERT INTO therapists (user_id, name, email) 
VALUES ('TU-USER-UID-AQUI', 'Tu Nombre', 'tu@email.com');
```

## 3. Configurar variables en Netlify

1. Ve a [app.netlify.com/projects/nexia-adicciones](https://app.netlify.com/projects/nexia-adicciones)
2. **Site Configuration → Environment Variables**
3. Añade:
   - `VITE_SUPABASE_URL` = tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key de Supabase

## 4. Deploy

La app se despliega automáticamente. URL final:
**https://nexia-adicciones.netlify.app**

## 5. Usar la app

### Como terapeuta:
1. Entra con tu email/contraseña
2. Crea pacientes desde el panel (les asignas email + contraseña)
3. Asigna tareas personalizadas
4. Monitoriza registros diarios
5. Escribe notas clínicas

### Como paciente:
1. Entra con el email/contraseña que te dio tu terapeuta
2. Registra tu estado de ánimo y craving diario
3. Completa las tareas asignadas
4. Usa el botón rojo de crisis si lo necesitas

## Estructura de datos

- **patients**: Datos del paciente, fase, contactos emergencia
- **daily_entries**: Registro diario (ánimo + craving + notas)
- **therapy_tasks**: Tareas personalizadas por paciente
- **task_library**: Biblioteca de tareas reutilizables
- **clinical_notes**: Notas clínicas del terapeuta
- **crisis_events**: Log de activaciones del modo crisis

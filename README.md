Mi Ticketera (Kanban Board)

Bienvenido a Mi Ticketera, una aplicación de gestión de tareas estilo Kanban.

Requisitos Previos

Asegúrate de tener instalado en tu computadora:
- [Node.js](https://nodejs.org/es/) (Versión 18 o superior recomendada).
- Una cuenta y proyecto en [Supabase](https://supabase.com/).
Cómo levantar el proyecto localmente

Sigue estos pasos para instalar y ejecutar la aplicación en tu entorno local de desarrollo:

1. Clonar o descargar el repositorio
Si tienes el código, navega a la carpeta principal del proyecto usando tu terminal:
```bash
cd mi-ticketera
```

2. Instalar las dependencias
Ejecuta el siguiente comando para descargar todos los paquetes necesarios de Node:
```bash
npm install
```

3. Configurar variables de entorno (Supabase)
La aplicación utiliza Supabase como Backend as a Service. La conexión se gestiona en `src/supabase.js`, por lo que no es necesario crear un archivo `.env` manual, si las claves ya están configuradas en ese archivo.
> Nota: Por seguridad, para un entorno de producción real, asegúrate de utilizar variables de entorno (usualmente `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).

 4. Iniciar el servidor de desarrollo
Para correr la aplicación y verla en tu navegador, ejecuta:
```bash
npm run dev
```
La terminal te mostrará un link local (usualmente `http://localhost:5173/`). Abre ese link en tu navegador.

 Comandos útiles

- `npm run dev`: Inicia el servidor local con Hot Module Replacement.
- `npm run build`: Construye la versión de producción optimizada de la aplicación dentro de la carpeta `dist`.
- `npm run preview`: Previsualiza localmente la build de producción.

 Estructura Principal
- `src/pages/`: Páginas principales (Dashboard, Login).
- `src/components/`: Componentes reutilizables (TableroKanban, etc).
- `src/context/`: Manejo de estados globales, como la autenticación con Supabase (`AuthContext`).

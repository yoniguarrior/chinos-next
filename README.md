# Juego de Los Chinos (chinos-next)

Clásico juego de Los Chinos para jugar online en tiempo real. Migración a
**Next.js 16** (App Router) de la versión anterior en Nuxt 4
([chinos-nuxt](https://github.com/yoniguarrior/chinosgame)).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript estricto
- **Tailwind CSS 4** + shadcn/ui (tema con primario rojo `#b91c1c`)
- **MongoDB** con Mongoose (conexión cacheada)
- **WebSocket nativo** (`ws`) para el juego en tiempo real, servido por un
  servidor Node personalizado (`server.js`) en `/api/ws/game`
- **Zustand** (estado), **react-hook-form + zod** (formularios),
  **next-intl** (es/en/fr/it por cookie, sin prefijo de URL)
- **PWA** con Serwist (`@serwist/turbopack`), service worker en `/serwist/sw.js`
- **Nodemailer + Handlebars** para emails de verificación y recuperación

## Desarrollo

```bash
npm install
cp .env.example .env   # completar valores (MongoDB, JWT, SMTP...)
npm run dev            # compila el bundle WS y arranca server.js (puerto 5000)
```

Scripts:

| Script | Descripción |
| --- | --- |
| `npm run dev` | Compila `dist-server/` y arranca `server.js` en modo dev |
| `npm run build` | `next build` + compilación del servidor WebSocket |
| `npm start` | Arranca `server.js` (requiere build previo y `NODE_ENV=production`) |
| `npm run lint` | ESLint |

## Arquitectura

- `src/app/api/**` — Route Handlers (misma API y cookies `ksa_lch`/`ws_chgame`
  que la versión Nuxt).
- `src/ws-server.ts` — servidor WebSocket del juego; se compila a
  `dist-server/` con `tsconfig.server.json` y se adjunta en `server.js` al
  mismo puerto HTTP.
- `server.js` — punto de entrada único: handler de Next + upgrade de WebSocket.
- Fallbacks HTTP (`/api/rooms/sync`, `/api/rooms/action`) para proxys que no
  reenvían el upgrade de WebSocket.
- Auth con 3 JWT: access (memoria) + refresh y WS (cookies HttpOnly).

## Despliegue en Plesk (Ubuntu 24 + Node.js 24)

1. **Subir el código** (git pull o Plesk Git) al directorio de la app.
2. En **Websites & Domains → Node.js**:
   - *Node.js Version*: 24.x
   - *Document Root*: `/<app>/public`
   - *Application Root*: `/<app>`
   - *Application Startup File*: `server.js`
3. **Variables de entorno** (botón *Environment Variables* o fichero `.env` en
   la raíz): las de `.env.example` con valores reales. Importante:
   - `NODE_ENV=production`
   - `PORT` (Plesk lo suele inyectar; el server usa 5000 por defecto)
   - `MONGODB_URI`, secretos JWT, `COOKIE_DOMAIN_PROD`, SMTP…
   - `NEXT_PUBLIC_APP_HOST=https://<dominio>` (se inyecta en build)
4. **Instalar dependencias y compilar** (botón *NPM install* + *Run script* →
   `build`, o por SSH):

   ```bash
   npm ci
   npm run build
   ```

5. **Reiniciar la aplicación** desde el panel.

### WebSocket a través del proxy de Plesk

Plesk sirve la app Node detrás de nginx/Apache. Para que el WebSocket
funcione, en **Apache & nginx Settings → Additional nginx directives**:

```nginx
location /api/ws/game {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 300s;
}
```

Si el proxy no reenvía el upgrade, la aplicación sigue funcionando con los
fallbacks HTTP (`/api/rooms/sync` y `/api/rooms/action`), aunque las
actualizaciones en tiempo real degradan a peticiones bajo demanda.

### Notas

- El registro de peers WebSocket y el lock por sala son **en memoria**: la app
  debe ejecutarse como **una sola instancia** Node (configuración por defecto
  en Plesk). Varias partidas simultáneas funcionan sin problema; lo que no
  soporta es clustering/varias réplicas.
- El service worker se sirve en `/serwist/sw.js` (generado en build); el
  manifest en `/manifest.webmanifest`.

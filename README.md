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

## Despliegue en Plesk (Ubuntu 24 + Node.js toolkit / Passenger)

La app usa el **toolkit de Node.js de Plesk** (Phusion Passenger). Passenger
arranca `server.js` y reenvía HTTP y WebSocket al proceso Node; **no** hace falta
`proxy_pass` a un puerto fijo.

### 1. Configuración de la app

En **Websites & Domains → Node.js**:

| Campo | Valor |
| --- | --- |
| Node.js Version | 24.x |
| Document Root | `/<app>/public` |
| Application Root | `/<app>` |
| Application Startup File | `server.js` |
| Application Mode | `production` |

### 2. Variables de entorno

En *Environment Variables* (o `.env` en la raíz), completar `.env.example`:

- `NODE_ENV=production` (o usar Application Mode = production)
- `MONGODB_URI`, secretos JWT, `COOKIE_DOMAIN_PROD`, SMTP…
- `NEXT_PUBLIC_APP_HOST=https://<dominio>` (rebuild tras cambiar)
- `WS_DEBUG=1` (opcional, solo para diagnosticar WebSocket en logs)

`PORT` lo inyecta Passenger; en local el default es `5000`.

### 3. Build y arranque

```bash
npm ci
npm run build
```

Reiniciar la aplicación desde el panel (o *Restart App*).

### 4. Apache & nginx (crítico para WebSocket)

En **Websites & Domains → Apache & nginx Settings**:

1. **Desactivar "Proxy mode"** (hosting solo-nginx). Los WebSockets **no
   funcionan a través del proxy de Apache**; el upgrade devuelve HTTP 200 en
   lugar de 101.

2. **No añadir** un bloque `location /api/ws/game { proxy_pass
   http://127.0.0.1:5000; ... }`. Con Passenger la app **no** escucha en ese
   puerto: ese bloque intercepta el WebSocket y lo envía a un puerto vacío.
   Passenger reenvía el upgrade al handler de `server.js` de forma nativa.

3. **Una sola instancia** (peers WS y locks en memoria). En *Additional nginx
   directives*:

   ```nginx
   passenger_min_instances 1;
   passenger_max_pool_size 1;
   ```

### 5. Migración desde la PWA Nuxt

Tras desplegar, los visitantes que tenían la PWA antigua pueden seguir viendo
rutas Nuxt (`/_payload.json`, `/_i18n/...`). El proyecto incluye `public/sw.js`
como kill-switch que desregistra el service worker viejo en `/sw.js`. No hace
falta configuración extra en nginx para ese fichero (se sirve desde `public/`).

### 6. Fallback HTTP si el WebSocket falla

Si el upgrade no llega a Node, el cliente usa `/api/rooms/sync` y
`/api/rooms/action` para entrar en sala y jugar (sin tiempo real entre
pestañas). El hook `useGameSocket` arranca ese fallback al conectar, sin
esperar a `ws.onopen`.

### 7. Diagnóstico WebSocket

1. Poner `WS_DEBUG=1`, reiniciar la app, entrar en una sala.
2. Revisar logs de Node.js en Plesk:
   - **`[ws:upgrade] GET /api/ws/game ... cookie=yes`** → el upgrade llega a
     Node; si aún falla, revisar cookie `ws_chgame` o JWT.
   - **Sin líneas `[ws:upgrade]`** → el upgrade se bloquea antes de Node:
     revisar Proxy mode (Apache) y que no exista `proxy_pass` a `:5000` para
     `/api/ws/game`.
3. En el navegador: DevTools → Network → WS. Handshake correcto = **101**;
   **200** suele ser Apache; **502** suele ser `proxy_pass` a puerto muerto.

### 8. PWA (Serwist)

- Service worker de la app: `/serwist/sw.js` (generado en build).
- Manifest: `/manifest.webmanifest`.

### Notas

- Varias partidas simultáneas en la misma instancia funcionan; no escala
  horizontalmente (varias réplicas Node).
- Para desarrollo local: `npm run dev` (puerto 5000, WS en `ws://localhost:5000/api/ws/game`).

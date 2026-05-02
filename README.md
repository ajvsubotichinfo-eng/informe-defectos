# Informe de Daños — Vivienda

App web colaborativa para registrar daños preexistentes al ingresar a una propiedad alquilada. Dos personas (inquilino y arrendador) pueden cargar daños desde sus teléfonos y verlos en tiempo real, con fotos y videos de evidencia.

## Stack

- **Frontend**: HTML + CSS + JS vanilla (sin build)
- **Backend**: Node.js + Fastify
- **Base de datos**: MySQL (Hostinger)
- **Auth**: PIN por usuario (header `X-PIN`)
- **Almacenamiento de fotos**: disco del servidor (`server/uploads/`)

## Estructura

```
informe-daños/
├── public/                 frontend estático
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── store.js        cliente HTTP de la API
│       ├── ui.js           DOM / renders
│       └── app.js          orquestación + auth
├── server/
│   ├── index.js            Fastify (entry point)
│   ├── db.js               pool mysql2
│   ├── routes.js           endpoints + middleware PIN
│   ├── schema.sql          DDL (correr una vez)
│   └── uploads/            fotos subidas
├── .env.example
├── .gitignore
└── package.json
```

## Endpoints

| Método | Ruta                  | Auth | Descripción                                |
|--------|-----------------------|------|--------------------------------------------|
| POST   | `/api/auth`           | —    | Valida PIN, devuelve `{ name }`            |
| GET    | `/api/damages`        | PIN  | Lista todos los daños con fotos            |
| POST   | `/api/damages`        | PIN  | Alta de daño (multipart: campos + fotos)   |
| DELETE | `/api/damages/:id`    | PIN  | Borra un daño (solo si sos el autor)       |

## Desarrollo local

1. Crear la base MySQL local y correr `server/schema.sql`.
2. Copiar `.env.example` a `.env` y completar credenciales + PINs.
3. Instalar dependencias y arrancar:

```bash
npm install
npm start                 # production
npm run dev               # con --watch
```

4. Abrir http://localhost:3000

## Deploy en Hostinger (Business Web Hosting)

### 1. Crear la base de datos
Panel Hostinger → **Bases de datos MySQL** → Crear nueva. Anotar:
- Host (suele ser `localhost` si la app y la DB están en el mismo plan)
- Nombre de la base (ej: `u123456789_informe`)
- Usuario y contraseña

### 2. Cargar el schema
Panel Hostinger → **phpMyAdmin** → Importar → subir `server/schema.sql`.

### 3. Crear la app Node.js
Panel Hostinger → **Avanzado → Node.js** → Crear aplicación:
- **Versión Node**: 18 o superior
- **Application root**: ej. `informe-danos` (subir el proyecto a esa carpeta vía File Manager / Git)
- **Application URL**: el dominio o subdominio que quieras
- **Application startup file**: `server/index.js`

### 4. Variables de entorno
En la misma pantalla de la app Node.js, agregar las variables del `.env.example`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_informe
DB_PASSWORD=...
DB_NAME=u123456789_informe

USER_1_NAME=Alejandro
USER_1_PIN=1234
USER_2_NAME=Javier
USER_2_PIN=5678
```

> **No subas el `.env`** al servidor. Hostinger lo gestiona desde el panel.

### 5. Instalar dependencias y arrancar
- Click en **NPM Install** desde el panel.
- Click en **Start** (o reiniciar la app si ya estaba corriendo).

### 6. Listo
Abrir la URL → te pide el PIN → entrás → cargás daños → el otro entra desde su teléfono y los ve.

## Permisos

- Cualquier usuario logueado puede **ver** todos los daños.
- Solo el **autor** puede borrar un daño (validado en el frontend y, sobre todo, en el backend).
- No existe "borrar todo": si necesitás resetear, hacelo por phpMyAdmin.

## Backup recomendado

Antes de finalizar el contrato:
1. Click en **🖨 Imprimir / Guardar PDF** para tener una copia legal.
2. Click en **⬇ Exportar datos (JSON)** para tener los datos en bruto.
3. Hacer una copia de la carpeta `server/uploads/` (vía File Manager) para conservar las fotos originales.

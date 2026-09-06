# EduLibre

Plataforma unificada para la exploración y consulta de la oferta académica y universitaria en Venezuela.

## Arquitectura

- **Backend**: API REST en Node.js / Express con autenticación JWT, validación mediante esquemas Zod y base de datos Supabase (PostgreSQL).
- **Frontend**: Interfaz desarrollada con Astro v6 (SSR), estilizado modular mediante variables de diseño y JavaScript en módulos.

## Estructura del Proyecto

```
├── app
│   ├── api
│   │   ├── config
│   │   │   └── supabase.js
│   │   ├── controllers
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── favoriteController.js
│   │   │   ├── institutionController.js
│   │   │   └── programController.js
│   │   ├── middlewares
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   ├── schemas.js
│   │   │   └── validator.js
│   │   ├── routes
│   │   │   ├── adminRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── favoriteRoutes.js
│   │   │   ├── institutionRoutes.js
│   │   │   └── programRoutes.js
│   │   └── index.js
│   └── client
│       └── superior-singularity
│           ├── src
│           │   ├── components
│           │   ├── layouts
│           │   ├── pages
│           │   │   ├── area.astro
│           │   │   ├── curso.astro
│           │   │   ├── index.astro
│           │   │   ├── instituciones.astro
│           │   │   ├── login.astro
│           │   │   ├── registro.astro
│           │   │   ├── results.astro
│           │   │   └── institucion/
│           │   │       ├── catalogo.astro
│           │   │       └── editar-curso.astro
│           │   └── styles
│           │       └── global.css
│           ├── astro.config.mjs
│           └── package.json
├── package.json
└── schema_v2.sql
```

## Endpoints de la API

### Instituciones
- `GET /api/institutions`: Búsqueda y filtrado de instituciones y programas (`q`, `name`, `type`, `programType`, `estado`, `ciudad`, `area`, `acreditada`, `gestion`, `modality`, `isFree`, `duration`, `page`, `limit`).
- `GET /api/institutions/:id`: Detalle de una institución con su listado de programas.
- `POST /api/institutions`: Registro y creación de institución (requiere rol `ADMIN` o `INSTITUTION`).

### Programas y Carreras
- `GET /api/programs`: Listado paginado de programas educativos aprobados y públicos.
- `GET /api/programs/:id`: Detalle específico de un programa con datos de su institución correspondiente.
- `POST /api/programs`: Publicación de una nueva oferta académica (requiere autenticación).
- `PUT /api/programs/:id`: Actualización de datos de un programa existente.

### Autenticación y Favoritos
- `POST /api/auth/register`: Registro de nuevos usuarios estudiantes.
- `POST /api/auth/login`: Autenticación de usuarios y entrega de token JWT.
- `GET /api/favorites`: Listado de favoritos del usuario autenticado.
- `POST /api/favorites`: Agregar institución a la lista de favoritos.

## Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   cd app/client/superior-singularity && npm install
   ```

2. Iniciar el servidor API backend (puerto 3000):
   ```bash
   npm run dev:backend
   ```

3. Iniciar el servidor frontend de Astro (puerto 4321):
   ```bash
   npm run dev:frontend
   ```
# Edu-Libre-

# Rodchard

Editor de diagramas para planear flujos de centros de contacto (Amazon Connect): colas, flows, routing profiles, agentes y figuras de diagrama de flujo. Cada usuario guarda sus diagramas en su cuenta.

Hecho con Next.js 16, React Flow (`@xyflow/react`) y Supabase (Auth + Postgres con RLS).

## Estructura

```
frontend/   Next.js (App Router)
  app/dashboard      lista de diagramas
  app/editor/[id]    editor (guardado automático)
  components/editor  lienzo, paleta, panel de propiedades
  lib/diagram        catálogo de figuras, ejemplo, validación
backend/    Supabase local (migraciones, config)
```

## Correr en local

Requiere Docker Desktop.

```powershell
# backend/
npx supabase start
npx supabase db reset      # aplica las migraciones (borra los datos locales)

# frontend/
npm install
npm run dev                # http://localhost:3002
```

Los puertos de Supabase son 55321 (API), 55322 (Postgres) y 55323 (Studio), distintos de los de `login_sb`, para poder tener ambos proyectos a la vez. Si el login falla por llaves, copia las de `npx supabase status` a `frontend/.env`.

## Datos

La tabla `diagrams` guarda `{ nodes, edges }` en `jsonb`, con RLS: cada usuario solo ve y edita los suyos. El servidor valida y recorta el JSON antes de guardarlo (`lib/diagram/sanitize.ts`).

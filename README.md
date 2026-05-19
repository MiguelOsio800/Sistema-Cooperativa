# Fraternidad 2 Respaldo

Sistema de gestión con auditoría de acciones CRUD integrada.

## Características

- Gestión de registros y operaciones (CRUD completo).
- Auditoría integrada para seguimiento de acciones.
- Generación de reportes detallados en PDF (vía `jspdf` y `jspdf-autotable`).
- Exportación e importación de datos.
- Visualización de datos mediante gráficos (`recharts`).

## Tecnologías Utilizadas

### Frontend
- **React 19**
- **Vite** (Build tool y entorno de desarrollo)
- **Tailwind CSS** (Manejo de estilos)
- **Recharts** (Gráficos)
- **jsPDF** (Generación de PDF)

### Backend
- **Node.js** con **Express 5**
- **SQLite** (Base de datos local)
- **TSX** (Ejecución de TypeScript en el entorno Node)

## Requisitos previos

- [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
- NPM o cualquier otro gestor de paquetes de Node.

## Instalación

1. Clona el repositorio o descarga los archivos.
2. Abre una terminal en la carpeta principal del proyecto.
3. Instala las dependencias:

```bash
npm install
```

## Ejecutar en modo desarrollo

Para iniciar tanto el servidor backend (Express) como el frontend (Vite), ejecuta el siguiente comando:

```bash
npm run dev
```

El servidor estará corriendo en el puerto configurado (típicamente `3000`).

## Compilación para producción

Para construir la aplicación para entornos de producción, ejecuta:

```bash
npm run build
```

Esto generará los archivos estáticos listos para ser servidos desde la carpeta `dist`.

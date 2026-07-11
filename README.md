# 🌸 VALMA - Tienda de Maquillaje

Sistema de e-commerce completo para una tienda de maquillaje, desarrollado con Node.js, Express y PostgreSQL.

## ✨ Características

- 🛍️ **Catálogo de Productos** con filtros por marca, tipo y búsqueda
- 🛒 **Carrito de Compras** persistente (sesión y usuario)
- 👤 **Sistema de Autenticación** (registro/login)
- 📦 **Gestión de Pedidos** con notificación WhatsApp
- 👨‍💼 **Panel de Administración** completo
- 📱 **Diseño Responsivo**
- 🔔 **Notificaciones Toast**

## 🚀 Tecnologías

- **Backend:** Node.js, Express.js
- **Base de Datos:** PostgreSQL
- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Autenticación:** JWT (JSON Web Tokens)
- **Seguridad:** bcryptjs, express-validator

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## 🔧 Instalación

### 1. Clonar o descargar el proyecto

El proyecto ya está en tu carpeta `c:\user\Fiury\OneDrive\Desktop\valma`

### 2. Instalar dependencias

```bash
cd "c:\user\Fiury\OneDrive\Desktop\valma"
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
copy .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# Configuración de la base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=valma_db
DB_USER=postgres
DB_PASSWORD=tu_contraseña

# Configuración del servidor
PORT=3000
NODE_ENV=development

# JWT Secret para autenticación
JWT_SECRET=valma_secret_key_super_segura_2024
JWT_EXPIRES_IN=24h

# Configuración de WhatsApp (para notificaciones)
WHATSAPP_NUMBER=573001234567

# Configuración de archivos
UPLOAD_PATH=public/images/products
MAX_FILE_SIZE=5242880
```

### 4. Crear la base de datos

1. Abre pgAdmin o la consola de PostgreSQL
2. Crea la base de datos:

```sql
CREATE DATABASE valma_db;
```

3. Ejecuta el script SQL:

```bash
# Opción 1: Usando psql
psql -U postgres -d valma_db -f database.sql

# Opción 2: Usando el script de Node.js
npm run init-db
```

O ejecuta el script directamente en pgAdmin copiando el contenido de `database.sql`

### 5. Iniciar el servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: **http://localhost:3000**

## 🌐 Acceso a la Aplicación

### Tienda (Cliente)
- **Inicio:** http://localhost:3000/
- **Login:** http://localhost:3000/login
- **Registro:** http://localhost:3000/registro
- **Carrito:** http://localhost:3000/carrito
- **Mis Pedidos:** http://localhost:3000/mis-pedidos

### Panel de Administración
- **Dashboard:** http://localhost:3000/admin
- **Productos:** http://localhost:3000/admin/productos
- **Pedidos:** http://localhost:3000/admin/pedidos

### Credenciales de Administrador
- **Email:** admin@valma.com
- **Contraseña:** admin123

## 📁 Estructura del Proyecto

```
valma/
├── src/
│   ├── app.js                 # Punto de entrada de la aplicación
│   ├── config/
│   │   ├── database.js        # Configuración de PostgreSQL
│   │   └── init-db.js         # Script de inicialización
│   ├── controllers/
│   │   ├── authController.js  # Autenticación
│   │   ├── cartController.js  # Carrito
│   │   ├── orderController.js # Pedidos
│   │   └── productController.js # Productos
│   ├── middleware/
│   │   ├── auth.js            # Middleware de autenticación
│   │   └── validation.js      # Validaciones
│   ├── models/
│   │   ├── Brand.js           # Modelo de marcas
│   │   ├── Cart.js            # Modelo de carrito
│   │   ├── Order.js           # Modelo de pedidos
│   │   ├── Product.js         # Modelo de productos
│   │   ├── ProductType.js     # Modelo de tipos
│   │   └── User.js            # Modelo de usuarios
│   ├── routes/
│   │   ├── auth.js            # Rutas de autenticación
│   │   ├── cart.js            # Rutas de carrito
│   │   ├── index.js           # Rutas principales
│   │   ├── orders.js          # Rutas de pedidos
│   │   └── products.js        # Rutas de productos
│   └── utils/
│       └── helpers.js         # Funciones utilitarias
├── views/
│   ├── index.html             # Página principal
│   ├── login.html             # Login
│   ├── register.html          # Registro
│   ├── cart.html              # Carrito
│   ├── checkout.html          # Checkout
│   ├── orders.html            # Mis pedidos
│   ├── profile.html           # Perfil
│   └── admin/
│       ├── dashboard.html     # Dashboard admin
│       ├── products.html      # Gestión de productos
│       └── orders.html        # Gestión de pedidos
├── public/
│   ├── css/
│   │   └── style.css          # Estilos principales
│   ├── js/
│   │   └── main.js            # JavaScript principal
│   └── images/
│       └── products/          # Imágenes de productos
├── database.sql               # Script de base de datos
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener perfil
- `GET /api/auth/verify` - Verificar token

### Productos
- `GET /api/products` - Listar productos (con filtros)
- `GET /api/products/featured` - Productos destacados
- `GET /api/products/:id` - Detalle de producto
- `POST /api/products` - Crear producto (Admin)
- `PUT /api/products/:id` - Actualizar producto (Admin)
- `DELETE /api/products/:id` - Eliminar producto (Admin)

### Marcas y Tipos
- `GET /api/products/brands` - Listar marcas
- `POST /api/products/brands` - Crear marca (Admin)
- `GET /api/products/types` - Listar tipos
- `POST /api/products/types` - Crear tipo (Admin)

### Carrito
- `GET /api/cart` - Obtener carrito
- `POST /api/cart/items` - Agregar item
- `PUT /api/cart/items/:id` - Actualizar cantidad
- `DELETE /api/cart/items/:id` - Eliminar item
- `DELETE /api/cart` - Vaciar carrito

### Pedidos
- `GET /api/orders` - Listar pedidos (Admin)
- `GET /api/orders/my-orders` - Mis pedidos
- `GET /api/orders/:id` - Detalle de pedido
- `POST /api/orders` - Crear pedido
- `PUT /api/orders/:id/status` - Actualizar estado (Admin)
- `GET /api/orders/stats/dashboard` - Estadísticas (Admin)

## 💳 Flujo de Compra

1. **Cliente** navega el catálogo y agrega productos al carrito
2. **Cliente** va al carrito y procede al checkout
3. **Cliente** ingresa datos de envío y confirma el pedido
4. **Sistema** genera un link de WhatsApp con el resumen del pedido
5. **Cliente** es redirigido a WhatsApp para coordinar el pago
6. **Administrador** recibe el pedido y actualiza su estado

## 📱 Configuración de WhatsApp

Para que los pedidos redirijan a WhatsApp:

1. Edita el archivo `.env`
2. Cambia `WHATSAPP_NUMBER` por tu número de WhatsApp Business
3. Formato: `573001234567` (código de país + número sin espacios)

## 🎨 Personalización

### Colores
Edita las variables CSS en `public/css/style.css`:

```css
:root {
    --primary: #ec4899;        /* Rosa principal */
    --primary-dark: #db2777;     /* Rosa oscuro */
    --secondary: #8b5cf6;      /* Violeta */
    --success: #10b981;        /* Verde éxito */
    --warning: #f59e0b;         /* Amarillo advertencia */
    --danger: #ef4444;         /* Rojo peligro */
}
```

### Logo y Nombre
- Cambia el nombre en todas las vistas HTML
- Reemplaza el icono de sparkles por tu logo

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT con cookies httpOnly
- Validación de inputs con express-validator
- Protección contra SQL Injection (parametrized queries)
- CORS configurado

## 🐛 Solución de Problemas

### Error de conexión a PostgreSQL
```
❌ Error conectando a PostgreSQL: connection refused
```
**Solución:** Verifica que PostgreSQL esté corriendo y las credenciales en `.env` sean correctas.

### Error: database "valma_db" does not exist
**Solución:** Crea la base de datos manualmente en pgAdmin o con:
```bash
psql -U postgres -c "CREATE DATABASE valma_db;"
```

### Puerto 3000 en uso
**Solución:** Cambia el puerto en `.env` o mata el proceso:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

## 🚀 Despliegue en Vercel + Neon

Guía completa en **[DEPLOY.md](./DEPLOY.md)**.

Resumen:

1. `git init` **dentro de** `C:\Users\Fiury\valma` (no en la carpeta de usuario)
2. Subir el repo a GitHub
3. Importar en Vercel y pegar las variables de `.env` en **Settings → Environment Variables**
4. Usar `DATABASE_URL` de Neon y `BASE_URL` con tu URL de Vercel

**No subas** el archivo `.env` a GitHub. Usa `.env.example` como plantilla.

## 📝 Licencia

Este proyecto es privado y fue desarrollado para Valma Makeup Store.

## 🤝 Soporte

Para soporte o preguntas, contacta al desarrollador.

---

**Desarrollado con ❤️ para Valma**

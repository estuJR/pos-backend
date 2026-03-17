# 🍽️ Restaurant POS — Backend API

Backend REST para sistema POS de restaurante. Construido con **Node.js + Express + MySQL + Sequelize**.

---

## 🚀 Instalación y Setup

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales de MySQL:
```env
DB_HOST=localhost
DB_NAME=restaurant_pos
DB_USER=root
DB_PASSWORD=tu_password
JWT_SECRET=una_clave_secreta_larga
```

### 3. Crear la base de datos en MySQL
```sql
CREATE DATABASE restaurant_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Sincronizar tablas y cargar datos de prueba
```bash
npm run db:sync
```

### 5. Iniciar en desarrollo
```bash
npm run dev
```

El servidor correrá en: `http://localhost:5000`

---

## 📡 Endpoints de la API

### Health Check
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |

### 🍕 Menú
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/menu/categories` | Listar categorías |
| POST | `/api/menu/categories` | Crear categoría |
| PUT | `/api/menu/categories/:id` | Actualizar categoría |
| DELETE | `/api/menu/categories/:id` | Eliminar categoría |
| GET | `/api/menu/products` | Listar productos (`?category_id=&available_only=true&search=`) |
| GET | `/api/menu/products/:id` | Obtener producto |
| POST | `/api/menu/products` | Crear producto |
| PUT | `/api/menu/products/:id` | Actualizar producto |
| PATCH | `/api/menu/products/:id/availability` | Toggle disponibilidad |
| DELETE | `/api/menu/products/:id` | Eliminar producto |

### 🪑 Mesas y Órdenes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/orders/tables` | Listar mesas con estado |
| POST | `/api/orders/tables` | Crear mesa |
| PATCH | `/api/orders/tables/:id/status` | Cambiar estado de mesa |
| GET | `/api/orders` | Listar órdenes (`?status=&type=&date=`) |
| GET | `/api/orders/:id` | Obtener orden completa |
| POST | `/api/orders` | Crear nueva orden |
| PATCH | `/api/orders/:id/status` | Cambiar estado de orden |
| POST | `/api/orders/:id/items` | Agregar producto a orden |
| PATCH | `/api/orders/:id/items/:item_id/status` | Cambiar estado de item |
| DELETE | `/api/orders/:id/items/:item_id` | Remover item de orden |

### 💳 Pagos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/payments` | Listar pagos (`?date=&method=`) |
| GET | `/api/payments/:id` | Obtener pago |
| POST | `/api/payments` | Procesar pago |
| PATCH | `/api/payments/:id/refund` | Reembolsar pago |

### 📊 Reportes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/reports/summary` | Resumen general (`?period=today/week/month/year`) |
| GET | `/api/reports/top-products` | Productos más vendidos |
| GET | `/api/reports/by-category` | Ventas por categoría |
| GET | `/api/reports/daily-sales` | Ventas diarias (`?days=30`) |
| GET | `/api/reports/table-performance` | Rendimiento por mesa |

---

## 🗄️ Modelos de Base de Datos

```
categories ──< products ──< order_items >── orders >── payments
                                               |
                                             tables
```

## 📦 Stack
- **Runtime:** Node.js
- **Framework:** Express 4
- **ORM:** Sequelize 6
- **Base de datos:** MySQL
- **Auth (próximo):** JWT + bcryptjs

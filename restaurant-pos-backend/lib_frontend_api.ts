/**
 * lib/api.ts
 * Servicio de API para conectar el frontend con el backend
 * El Jardín de los Conejos POS
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ========================
//    TOKEN HELPERS
// ========================
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;

const setToken = (token: string) =>
  typeof window !== 'undefined' && localStorage.setItem('pos_token', token);

const removeToken = () =>
  typeof window !== 'undefined' && localStorage.removeItem('pos_token');

// ========================
//    FETCH BASE
// ========================
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
}

// ========================
//    TIPOS (match frontend)
// ========================
export type UserRole = 'supervisor' | 'empleado';

export interface ApiUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface ApiProduct {
  id: number;
  id_key: string;     // "gringa", "gaseosas", etc. (match frontend ids)
  name: string;
  price: number;
  image_url: string;  // map to "image" in frontend
  category: {
    id: number;
    name: string;     // "comida", "bebidas", "postres"
  };
  is_available: boolean;
}

export interface ApiTable {
  id: number;
  number: string;     // "1" ... "10"
  name: string;       // "Mesa 1"
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
}

export interface ApiOrderItem {
  product_id: number;
  quantity: number;
  notes?: string;
}

export interface ApiOrder {
  id: number;
  order_number: string;
  table_id: number;
  status: string;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    notes?: string;
  }>;
  subtotal: number;
  tax_amount: number;
  total: number;
}

// ========================
//    AUTH
// ========================
export const auth = {
  // Obtener lista de usuarios para la pantalla de login
  getUsers: () =>
    apiFetch<{ success: boolean; data: ApiUser[] }>('/auth/users'),

  // Login por rol + PIN
  login: (role: UserRole, pin: string) =>
    apiFetch<{ success: boolean; token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, pin }),
    }).then((res) => {
      setToken(res.token);
      return res;
    }),

  logout: () => removeToken(),

  // Verificar sesión activa
  me: () =>
    apiFetch<{ success: boolean; user: ApiUser }>('/auth/me'),
};

// ========================
//    MENÚ
// ========================
export const menu = {
  // Obtener todos los productos agrupados por categoría
  // Retorna estructura compatible con MENU_DATA del frontend
  getProducts: async (category?: string) => {
    const query = category ? `?available_only=true&category_key=${category}` : '?available_only=true';
    const res = await apiFetch<{ success: boolean; data: ApiProduct[] }>(
      `/menu/products${query}`
    );

    // Transformar al formato que espera el frontend
    return res.data.map((p) => ({
      id: p.id_key,           // usa id_key como id para el frontend
      name: p.name,
      price: parseFloat(String(p.price)),
      image: p.image_url,
      category: p.category.name,
    }));
  },

  // Obtener todos los productos agrupados (para reemplazar MENU_DATA)
  getMenuData: async () => {
    const res = await apiFetch<{ success: boolean; data: ApiProduct[] }>(
      '/menu/products?available_only=true'
    );

    // Agrupar por categoría (igual que MENU_DATA hardcodeado)
    const grouped: Record<string, Array<{ id: string; name: string; price: number; image: string }>> = {
      comida: [],
      bebidas: [],
      postres: [],
    };

    for (const p of res.data) {
      const cat = p.category.name;
      if (grouped[cat] !== undefined) {
        grouped[cat].push({
          id: p.id_key,
          name: p.name,
          price: parseFloat(String(p.price)),
          image: p.image_url,
        });
      }
    }

    return grouped;
  },
};

// ========================
//    MESAS
// ========================
export const tables = {
  getAll: () =>
    apiFetch<{ success: boolean; data: ApiTable[] }>('/orders/tables'),
};

// ========================
//    ÓRDENES
// ========================
export const orders = {
  // Crear orden nueva
  create: (tableNumber: number | null, items: ApiOrderItem[]) =>
    apiFetch<{ success: boolean; data: ApiOrder }>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        table_number: tableNumber,
        type: tableNumber ? 'dine_in' : 'takeout',
        items,
      }),
    }),

  // Obtener órdenes activas del día
  getActive: () =>
    apiFetch<{ success: boolean; data: ApiOrder[] }>(
      '/orders?status=open,in_progress,ready,delivered'
    ),

  // Obtener orden de una mesa específica
  getByTable: (tableNumber: number) =>
    apiFetch<{ success: boolean; data: ApiOrder[] }>(
      `/orders?table_number=${tableNumber}&status=open,in_progress`
    ),

  // Actualizar estado de una orden
  updateStatus: (orderId: number, status: string) =>
    apiFetch<{ success: boolean; data: ApiOrder }>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ========================
//    PAGOS
// ========================
export const payments = {
  // Procesar pago de una orden
  // En el frontend actual es simple: "Confirmar Pago"
  process: (orderId: number, amountPaid: number) =>
    apiFetch<{ success: boolean; data: unknown; change: number }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        method: 'cash',       // default: efectivo
        amount_paid: amountPaid,
      }),
    }),
};

// ========================
//    REPORTES (solo supervisor)
// ========================
export const reports = {
  getSummary: (period: 'today' | 'week' | 'month' = 'today') =>
    apiFetch<{ success: boolean; data: unknown }>(`/reports/summary?period=${period}`),

  getTopProducts: (period: 'today' | 'week' | 'month' = 'today') =>
    apiFetch<{ success: boolean; data: unknown }>(`/reports/top-products?period=${period}`),

  getDailySales: (days = 30) =>
    apiFetch<{ success: boolean; data: unknown }>(`/reports/daily-sales?days=${days}`),
};

export default { auth, menu, tables, orders, payments, reports };

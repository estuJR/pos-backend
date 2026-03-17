// Updated sync with exact frontend menu data
require('dotenv').config();
const { sequelize, Category, Product, Table } = require('../models');

const sync = async () => {
  try {
    console.log('🔄 Sincronizando base de datos...');

    // force: true elimina y recrea tablas (solo para desarrollo)
    // alter: true actualiza tablas sin eliminar datos
    await sequelize.sync({ alter: true });
    console.log('✅ Tablas creadas/actualizadas correctamente\n');

    // ---- Seed: Categorías ----
    const categoriesCount = await Category.count();
    if (categoriesCount === 0) {
      console.log('🌱 Creando categorías de ejemplo...');
      await Category.bulkCreate([
        { name: 'Entradas',    color: '#f59e0b', icon: '🥗', sort_order: 1 },
        { name: 'Platos Fuertes', color: '#ef4444', icon: '🍽️', sort_order: 2 },
        { name: 'Pizzas',      color: '#f97316', icon: '🍕', sort_order: 3 },
        { name: 'Hamburguesas',color: '#84cc16', icon: '🍔', sort_order: 4 },
        { name: 'Bebidas',     color: '#06b6d4', icon: '🥤', sort_order: 5 },
        { name: 'Postres',     color: '#ec4899', icon: '🍰', sort_order: 6 },
      ]);
      console.log('✅ Categorías creadas');
    }

    // ---- Seed: Productos ----
    const productsCount = await Product.count();
    if (productsCount === 0) {
      console.log('🌱 Creando productos de ejemplo...');
      const cats = await Category.findAll({ raw: true });
      const catMap = {};
      cats.forEach(c => { catMap[c.name] = c.id; });

      await Product.bulkCreate([
        // Entradas
        { name: 'Ensalada César',      price: 45.00, cost: 15.00, category_id: catMap['Entradas'],       preparation_time: 5,  sort_order: 1 },
        { name: 'Sopa del día',        price: 35.00, cost: 10.00, category_id: catMap['Entradas'],       preparation_time: 3,  sort_order: 2 },
        { name: 'Alitas BBQ (6 pzs)',  price: 65.00, cost: 25.00, category_id: catMap['Entradas'],       preparation_time: 15, sort_order: 3 },
        // Platos Fuertes
        { name: 'Filete de Res',       price: 120.00, cost: 55.00, category_id: catMap['Platos Fuertes'], preparation_time: 20, sort_order: 1 },
        { name: 'Pollo a la Plancha',  price: 80.00,  cost: 30.00, category_id: catMap['Platos Fuertes'], preparation_time: 15, sort_order: 2 },
        { name: 'Pasta Alfredo',       price: 70.00,  cost: 20.00, category_id: catMap['Platos Fuertes'], preparation_time: 12, sort_order: 3 },
        // Pizzas
        { name: 'Pizza Margarita',     price: 85.00,  cost: 28.00, category_id: catMap['Pizzas'],         preparation_time: 18, sort_order: 1 },
        { name: 'Pizza Pepperoni',     price: 95.00,  cost: 32.00, category_id: catMap['Pizzas'],         preparation_time: 18, sort_order: 2 },
        { name: 'Pizza 4 Quesos',      price: 98.00,  cost: 35.00, category_id: catMap['Pizzas'],         preparation_time: 18, sort_order: 3 },
        // Hamburguesas
        { name: 'Hamburguesa Clásica', price: 65.00,  cost: 22.00, category_id: catMap['Hamburguesas'],   preparation_time: 10, sort_order: 1 },
        { name: 'Doble Carne',         price: 85.00,  cost: 35.00, category_id: catMap['Hamburguesas'],   preparation_time: 12, sort_order: 2 },
        // Bebidas
        { name: 'Agua Natural',        price: 15.00,  cost: 3.00,  category_id: catMap['Bebidas'],        preparation_time: 1,  sort_order: 1 },
        { name: 'Refresco',            price: 20.00,  cost: 5.00,  category_id: catMap['Bebidas'],        preparation_time: 1,  sort_order: 2 },
        { name: 'Jugo Natural',        price: 30.00,  cost: 10.00, category_id: catMap['Bebidas'],        preparation_time: 3,  sort_order: 3 },
        { name: 'Cerveza',             price: 35.00,  cost: 15.00, category_id: catMap['Bebidas'],        preparation_time: 1,  sort_order: 4 },
        // Postres
        { name: 'Pastel de Chocolate', price: 45.00,  cost: 12.00, category_id: catMap['Postres'],        preparation_time: 5,  sort_order: 1 },
        { name: 'Flan Napolitano',     price: 35.00,  cost: 8.00,  category_id: catMap['Postres'],        preparation_time: 3,  sort_order: 2 },
      ]);
      console.log('✅ Productos creados');
    }

    // ---- Seed: Mesas ----
    const tablesCount = await Table.count();
    if (tablesCount === 0) {
      console.log('🌱 Creando mesas de ejemplo...');
      const tables = [];
      for (let i = 1; i <= 8; i++) {
        tables.push({ number: String(i), name: `Mesa ${i}`, capacity: 4, section: 'Interior' });
      }
      tables.push(
        { number: '9',    name: 'Mesa 9',    capacity: 6, section: 'Interior' },
        { number: '10',   name: 'Mesa 10',   capacity: 6, section: 'Interior' },
        { number: 'T1',   name: 'Terraza 1', capacity: 4, section: 'Exterior' },
        { number: 'T2',   name: 'Terraza 2', capacity: 4, section: 'Exterior' },
        { number: 'B1',   name: 'Barra 1',   capacity: 2, section: 'Barra' },
        { number: 'B2',   name: 'Barra 2',   capacity: 2, section: 'Barra' },
      );
      await Table.bulkCreate(tables);
      console.log('✅ Mesas creadas');
    }

    console.log('\n🎉 Base de datos lista para usar!');
    console.log('▶️  Ejecuta: npm run dev\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al sincronizar:', error.message);
    process.exit(1);
  }
};

sync();

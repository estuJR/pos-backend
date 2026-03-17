require('dotenv').config();
const { sequelize, Category, Product, Table, User } = require('../models');

const sync = async () => {
  try {
    console.log('🔄 Sincronizando base de datos...');
    await sequelize.sync({ alter: true });
    console.log('✅ Tablas listas\n');

    // ---- Categorías ----
    const catsCount = await Category.count();
    if (catsCount === 0) {
      console.log('🌱 Categorías...');
      await Category.bulkCreate([
        { name: 'comida',  display_name: 'Comida',  color: '#B5673D', icon: 'UtensilsCrossed', sort_order: 1 },
        { name: 'bebidas', display_name: 'Bebidas', color: '#06b6d4', icon: 'GlassWater',      sort_order: 2 },
        { name: 'postres', display_name: 'Postres', color: '#ec4899', icon: 'IceCream',        sort_order: 3 },
      ]);
      console.log('  ✅ Categorías creadas');
    }

    // ---- Productos (match exacto con MENU_DATA del frontend) ----
    const prodsCount = await Product.count();
    if (prodsCount === 0) {
      console.log('🌱 Productos...');
      const cats = await Category.findAll({ raw: true });
      const cm = {};
      cats.forEach(c => { cm[c.name] = c.id; });

      await Product.bulkCreate([
        // COMIDA
        { id_key:'gringa',         name:'Gringa',              price:21.00, category_id:cm['comida'],  image_url:'/images/gringa.jpg',           sort_order:1 },
        { id_key:'refa',           name:'Refa',                price:15.00, category_id:cm['comida'],  image_url:'/images/refa.jpg',              sort_order:2 },
        { id_key:'quesadilla',     name:'Quesadilla',          price:10.00, category_id:cm['comida'],  image_url:'/images/quesadilla.jpg',        sort_order:3 },
        { id_key:'alambre',        name:'Alambre',             price:31.00, category_id:cm['comida'],  image_url:'/images/alambre.jpg',           sort_order:4 },
        { id_key:'taqueso',        name:'Taqueso',             price:20.00, category_id:cm['comida'],  image_url:'/images/taqueso.jpg',           sort_order:5 },
        { id_key:'porcion2tacos',  name:'Porción de 2 Tacos', price:25.00, category_id:cm['comida'],  image_url:'/images/tacos.jpg',             sort_order:6 },
        { id_key:'tacoindividual', name:'Taco Individual',    price:14.00, category_id:cm['comida'],  image_url:'/images/taco-individual.jpg',   sort_order:7 },
        // BEBIDAS
        { id_key:'gaseosas',       name:'Gaseosas',            price:10.00, category_id:cm['bebidas'], image_url:'/images/gaseosa.jpg',           sort_order:1 },
        { id_key:'aguapura',       name:'Agua Pura',           price:10.00, category_id:cm['bebidas'], image_url:'/images/agua.jpg',              sort_order:2 },
        { id_key:'licuadopeq',     name:'Licuado Pequeño',    price:15.00, category_id:cm['bebidas'], image_url:'/images/licuado.jpg',           sort_order:3 },
        { id_key:'licuadogde',     name:'Licuado Grande',     price:18.00, category_id:cm['bebidas'], image_url:'/images/licuado.jpg',           sort_order:4 },
        { id_key:'cimarrona',      name:'Cimarrona',           price:25.00, category_id:cm['bebidas'], image_url:'/images/cimarrona.jpg',         sort_order:5 },
        { id_key:'mineralprep',    name:'Mineral Preparada',  price:30.00, category_id:cm['bebidas'], image_url:'/images/mineral-preparada.jpg', sort_order:6 },
        { id_key:'tefrio',         name:'Te Frío',             price:15.00, category_id:cm['bebidas'], image_url:'/images/te-frio.jpg',           sort_order:7 },
        { id_key:'mineral',        name:'Mineral',             price:10.00, category_id:cm['bebidas'], image_url:'/images/mineral.jpg',           sort_order:8 },
        // POSTRES
        { id_key:'crepanutella',     name:'Crepa de Nutella',        price:25.00, category_id:cm['postres'], image_url:'/images/crepa-nutella.jpg',        sort_order:1 },
        { id_key:'crepanutellafrut', name:'Crepa Nutella y Frutas',  price:35.00, category_id:cm['postres'], image_url:'/images/crepa-nutella-frutas.jpg', sort_order:2 },
        { id_key:'bolahelado',       name:'Bola de Helado',          price:6.00,  category_id:cm['postres'], image_url:'/images/helado.jpg',               sort_order:3 },
      ]);
      console.log('  ✅ Productos creados');
    }

    // ---- Mesas (10, igual que el frontend) ----
    const tablesCount = await Table.count();
    if (tablesCount === 0) {
      console.log('🌱 Mesas...');
      const tables = Array.from({ length: 10 }, (_, i) => ({
        number: String(i + 1),
        name: `Mesa ${i + 1}`,
        capacity: 4,
        section: 'Interior',
      }));
      await Table.bulkCreate(tables);
      console.log('  ✅ 10 mesas creadas');
    }

    // ---- Usuarios (match DEMO_USERS del frontend) ----
    const usersCount = await User.count();
    if (usersCount === 0) {
      console.log('🌱 Usuarios...');
      // pin_hash será hasheado automáticamente por el hook beforeCreate
      await User.bulkCreate([
        { name: 'Carlos Supervisor', role: 'supervisor', pin_hash: '1234' },
        { name: 'María Empleada',    role: 'empleado',   pin_hash: '1111' },
        { name: 'Juan Empleado',     role: 'empleado',   pin_hash: '2222' },
        { name: 'Ana Empleada',      role: 'empleado',   pin_hash: '3333' },
      ], { individualHooks: true }); // necesario para que corran los hooks
      console.log('  ✅ Usuarios creados');
      console.log('\n  👤 Credenciales de prueba:');
      console.log('     Supervisor: PIN 1234');
      console.log('     Empleados:  PIN 1111 | 2222 | 3333');
    }

    console.log('\n🎉 ¡Base de datos lista!');
    console.log('▶️  Ejecuta: npm run dev\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

sync();

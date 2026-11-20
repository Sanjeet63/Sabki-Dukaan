const categories = [
  { slug: 'kirana', name: 'Kirana / Grocery', name_hi: 'किराना', icon: '🛒' },
  { slug: 'medical', name: 'Medical / Pharmacy', name_hi: 'मेडिकल', icon: '💊' },
  { slug: 'dairy', name: 'Dairy & Milk', name_hi: 'डेयरी', icon: '🥛' },
  { slug: 'fruits-vegetables', name: 'Fruits & Vegetables', name_hi: 'फल और सब्ज़ी', icon: '🥦' },
  { slug: 'bakery-sweets', name: 'Bakery & Sweets', name_hi: 'बेकरी और मिठाई', icon: '🍰' },
  { slug: 'stationery', name: 'Stationery & Books', name_hi: 'स्टेशनरी', icon: '📚' },
  { slug: 'electronics', name: 'Electronics & Mobile', name_hi: 'इलेक्ट्रॉनिक्स', icon: '📱' },
  { slug: 'hardware', name: 'Hardware & Paints', name_hi: 'हार्डवेयर', icon: '🔧' },
  { slug: 'clothing', name: 'Clothing & Footwear', name_hi: 'कपड़े और जूते', icon: '👕' },
  { slug: 'general', name: 'General Store', name_hi: 'जनरल स्टोर', icon: '🏪' },
];

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  await knex('categories')
    .insert(categories.map((c, i) => ({ ...c, sort_order: i })))
    .onConflict('slug')
    .merge(['name', 'name_hi', 'icon', 'sort_order']);
}

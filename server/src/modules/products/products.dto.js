import { isLowStock } from '../stock/stock.rules.js';

// Sellers see the exact stock setup. Customers only see how many they can still order.
export function toProductDto(row, { forSeller = false } = {}) {
  const dto = {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    pricePaise: row.price_paise,
    mrpPaise: row.mrp_paise,
    inStock: row.in_stock,
    stockLeft: row.track_stock ? row.stock_qty : null,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
  };
  if (forSeller) {
    dto.trackStock = row.track_stock;
    dto.stockQty = row.stock_qty;
    dto.lowStockThreshold = row.low_stock_threshold;
    dto.isLowStock = isLowStock(row);
    dto.catalogProductId = row.product_id;
  }
  return dto;
}

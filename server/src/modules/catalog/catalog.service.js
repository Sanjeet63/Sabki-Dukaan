import { db } from '../../db/knex.js';
import { EVENTS, events } from '../../shared/events.js';
import { badRequest, conflict, notFound } from '../../shared/errors.js';
import { catalogBody } from './catalog.schema.js';
import { catalogRepository, matchKey } from './catalog.repository.js';

export { matchKey };

function toCatalogDto(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    unit: row.unit,
    imageUrl: row.image_url,
    barcode: row.barcode,
    mrpPaise: row.mrp_paise,
    keywords: row.keywords,
    isActive: row.is_active,
    source: row.source,
    category: row.category_id ? { id: row.category_id, slug: row.category_slug, name: row.category_name, icon: row.category_icon } : null,
    ...(row.shop_count !== undefined && { shopCount: row.shop_count }),
  };
}

function toRow(body) {
  const map = {
    name: 'name',
    brand: 'brand',
    unit: 'unit',
    categoryId: 'category_id',
    mrpPaise: 'mrp_paise',
    imageUrl: 'image_url',
    barcode: 'barcode',
    keywords: 'keywords',
    isActive: 'is_active',
  };
  const row = {};
  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) row[column] = body[key];
  }
  return row;
}

// Unique-index clashes get a clear message instead of a generic "Already exists"
async function guardDuplicate(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === '23505') {
      throw conflict(
        String(err.constraint).includes('barcode')
          ? 'Another catalog product already has this barcode'
          : 'A catalog product with this name and pack size already exists',
      );
    }
    throw err;
  }
}

async function categoryIdsBySlug() {
  const rows = await db('categories').select('id', 'slug');
  return new Map(rows.map((c) => [c.slug, c.id]));
}

export const catalogService = {
  // Suggestions while a seller types a product name
  async search({ q, shopId, limit }, categoryId) {
    const rows = await catalogRepository.search({ q, categoryId, limit });
    const dtos = rows.map(toCatalogDto);
    if (shopId && dtos.length) {
      const listed = await db('shop_products')
        .select('product_id')
        .where({ shop_id: shopId, is_active: true })
        .whereIn('product_id', dtos.map((d) => d.id));
      const ids = new Set(listed.map((r) => r.product_id));
      for (const d of dtos) d.inMyShop = ids.has(d.id);
    }
    return dtos;
  },

  async getActive(id, trx) {
    const row = await catalogRepository.findById(id, trx);
    if (!row || !row.is_active) throw badRequest('This catalog product is no longer available. Please pick another one.');
    return row;
  },

  findExact(name, unit, trx) {
    return catalogRepository.findByNameUnit(name, unit, trx);
  },

  // Called when a seller adds a product that is not in the catalog
  async requestFor(shopProduct, { shopId, categoryId, userId }, trx) {
    await catalogRepository.createRequest(
      {
        shop_id: shopId,
        shop_product_id: shopProduct.id,
        requested_by: userId,
        name: shopProduct.name,
        unit: shopProduct.unit,
        category_id: categoryId,
        image_url: shopProduct.image_url,
        match_key: matchKey(shopProduct.name, shopProduct.unit),
      },
      trx,
    );
    events.emit(EVENTS.CATALOG_REQUESTED, { shopId, name: shopProduct.name });
  },

  // Keep a pending request in step with the seller's edits
  syncPendingRequest(shopProduct, trx) {
    return catalogRepository.updatePendingRequest(
      shopProduct.id,
      {
        name: shopProduct.name,
        unit: shopProduct.unit,
        image_url: shopProduct.image_url,
        match_key: matchKey(shopProduct.name, shopProduct.unit),
      },
      trx,
    );
  },

  dropPendingRequest(shopProductId, trx) {
    return catalogRepository.deletePendingRequest(shopProductId, trx);
  },

  // ---- Admin ----
  async list(query) {
    const rows = await catalogRepository.list({
      search: query.search,
      categoryId: query.category,
      includeHidden: query.includeHidden,
      limit: query.limit,
      offset: query.offset,
    });
    return rows.map(toCatalogDto);
  },

  async create(body) {
    const id = await guardDuplicate(() => catalogRepository.create({ ...toRow(body), source: 'admin' }));
    return toCatalogDto(await catalogRepository.findById(id));
  },

  async update(id, body) {
    const existing = await catalogRepository.findById(id);
    if (!existing) throw notFound('Catalog product not found');
    await guardDuplicate(() => catalogRepository.update(id, toRow(body)));
    return toCatalogDto(await catalogRepository.findById(id));
  },

  // Rows are validated one by one so a bad row doesn't stop the rest
  async importRows(rows) {
    const categories = await categoryIdsBySlug();
    const errors = [];
    let added = 0;
    let updated = 0;
    await db.transaction(async (trx) => {
      for (const [i, raw] of rows.entries()) {
        const slug = raw.category?.trim().toLowerCase();
        const categoryId = slug ? categories.get(slug) : null;
        if (slug && !categoryId) {
          errors.push({ row: i + 1, message: `Unknown category "${raw.category}"` });
          continue;
        }
        const mrp = raw.mrp === '' || raw.mrp == null ? null : Math.round(Number(String(raw.mrp).replace(/[₹,\s]/g, '')) * 100);
        if (Number.isNaN(mrp) || mrp < 0) {
          errors.push({ row: i + 1, message: `MRP "${raw.mrp}" is not a valid amount in rupees` });
          continue;
        }
        const parsed = catalogBody.safeParse({
          name: raw.name ?? '',
          brand: raw.brand,
          unit: raw.unit,
          categoryId,
          mrpPaise: mrp,
          imageUrl: raw.image_url?.trim() || null,
          barcode: raw.barcode?.trim() || null,
          keywords: raw.keywords,
        });
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          errors.push({ row: i + 1, message: `${issue.path.join('.') || 'row'}: ${issue.message}` });
          continue;
        }
        const data = { ...toRow(parsed.data), source: 'import' };
        try {
          // Savepoint so one bad row (e.g. duplicate barcode) doesn't abort the batch
          const inserted = await trx.transaction((sp) => catalogRepository.upsert(data, sp));
          if (inserted) added += 1;
          else updated += 1;
        } catch (err) {
          errors.push({ row: i + 1, message: err.code === '23505' ? 'Barcode already used by another product' : 'Could not save this row' });
        }
      }
    });
    return { added, updated, errors };
  },

  async pendingRequests(page) {
    const [groups, total] = await Promise.all([catalogRepository.pendingGroups(page), catalogRepository.countPendingGroups()]);
    const withSimilar = await Promise.all(
      groups.map(async (g) => ({
        matchKey: g.match_key,
        name: g.name,
        unit: g.unit,
        categoryId: g.category_id,
        imageUrl: g.image_url,
        requestCount: g.request_count,
        firstRequestedAt: g.first_requested_at,
        shops: g.shops,
        similar: (await catalogRepository.similar(`${g.name} ${g.unit ?? ''}`)).map(toCatalogDto),
      })),
    );
    return { requests: withSimilar, total };
  },

  // Create a catalog product from a request group and link every shop that asked
  async approve(adminId, { matchKey: key, ...fields }) {
    return db.transaction(async (trx) => {
      const pending = await catalogRepository.lockPendingByKey(key, trx);
      if (pending.length === 0) throw notFound('This request was already handled');
      const existing = await catalogRepository.findByNameUnit(fields.name, fields.unit, trx);
      if (existing) throw conflict('This product is already in the catalog. Use "Merge" to link it instead.');
      const productId = await guardDuplicate(() =>
        trx.transaction((sp) => catalogRepository.create({ ...toRow(fields), source: 'request' }, sp)),
      );
      const linked = await catalogRepository.linkShopProducts(
        pending.map((r) => r.shop_product_id),
        productId,
        trx,
      );
      await catalogRepository.resolveRequests(
        pending.map((r) => r.id),
        { status: 'approved', product_id: productId, reviewed_by: adminId },
        trx,
      );
      return { productId, linked, requests: pending.length };
    });
  },

  // The product already exists in the catalog under another spelling
  async merge(adminId, { matchKey: key, productId }) {
    return db.transaction(async (trx) => {
      const pending = await catalogRepository.lockPendingByKey(key, trx);
      if (pending.length === 0) throw notFound('This request was already handled');
      await this.getActive(productId, trx);
      const linked = await catalogRepository.linkShopProducts(
        pending.map((r) => r.shop_product_id),
        productId,
        trx,
      );
      await catalogRepository.resolveRequests(
        pending.map((r) => r.id),
        { status: 'merged', product_id: productId, reviewed_by: adminId },
        trx,
      );
      return { productId, linked, requests: pending.length };
    });
  },

  // Seller products stay listed; they just don't get linked to the catalog
  async reject(adminId, { matchKey: key, note }) {
    return db.transaction(async (trx) => {
      const pending = await catalogRepository.lockPendingByKey(key, trx);
      if (pending.length === 0) throw notFound('This request was already handled');
      await catalogRepository.resolveRequests(
        pending.map((r) => r.id),
        { status: 'rejected', admin_note: note ?? null, reviewed_by: adminId },
        trx,
      );
      return { requests: pending.length };
    });
  },

  async stats() {
    const [{ n: size }, pendingGroups] = await Promise.all([
      db('products').where({ is_active: true }).count({ n: '*' }).first(),
      catalogRepository.countPendingGroups(),
    ]);
    return { products: Number(size), pendingRequests: pendingGroups };
  },
};

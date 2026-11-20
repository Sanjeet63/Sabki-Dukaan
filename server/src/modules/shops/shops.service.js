import { db } from '../../db/knex.js';
import { EVENTS, events } from '../../shared/events.js';
import { badRequest, conflict, forbidden, notFound } from '../../shared/errors.js';
import { uniqueSlug } from '../../shared/slug.js';
import { usersService } from '../users/users.service.js';
import { toDeliveryDto } from './delivery.js';
import { shopsRepository } from './shops.repository.js';

// One shop per seller in the MVP. Raise this limit to allow multiple shops.
const MAX_SHOPS_PER_OWNER = 1;

function nowInIndia() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function isOpenNow(row) {
  if (!row.is_open) return false;
  if (!row.opening_time || !row.closing_time) return true;
  const now = nowInIndia();
  const { opening_time: open, closing_time: close } = row;
  return open <= close ? now >= open && now < close : now >= open || now < close;
}

export function toShopDto(row, { includePrivate = false } = {}) {
  const dto = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    phone: row.phone,
    addressLine: row.address_line,
    area: row.area,
    city: row.city,
    pincode: row.pincode,
    latitude: row.latitude,
    longitude: row.longitude,
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    isOpen: row.is_open,
    isOpenNow: isOpenNow(row),
    coverImageUrl: row.cover_image_url,
    delivery: toDeliveryDto(row),
    rating: {
      count: row.rating_count,
      average: row.rating_count ? Math.round((row.rating_total / row.rating_count) * 10) / 10 : null,
    },
    category: { id: row.category_id, slug: row.category_slug, name: row.category_name, icon: row.category_icon },
  };
  if (row.distance_m !== undefined) dto.distanceM = row.distance_m;
  if (includePrivate) {
    dto.ownerId = row.owner_id;
    dto.status = row.status;
    dto.statusReason = row.status_reason;
    dto.createdAt = row.created_at;
    if (row.owner_email) dto.owner = { email: row.owner_email, name: row.owner_name };
  }
  return dto;
}

function toShopRow(body) {
  const map = {
    name: 'name',
    description: 'description',
    categoryId: 'category_id',
    phone: 'phone',
    addressLine: 'address_line',
    area: 'area',
    city: 'city',
    pincode: 'pincode',
    latitude: 'latitude',
    longitude: 'longitude',
    openingTime: 'opening_time',
    closingTime: 'closing_time',
    coverImageUrl: 'cover_image_url',
    isOpen: 'is_open',
    deliveryEnabled: 'delivery_enabled',
    deliveryFeePaise: 'delivery_fee_paise',
    freeDeliveryAbovePaise: 'free_delivery_above_paise',
    deliveryMinOrderPaise: 'delivery_min_order_paise',
    deliveryRadiusM: 'delivery_radius_m',
    deliveryNote: 'delivery_note',
  };
  const row = {};
  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) row[column] = body[key];
  }
  return row;
}

async function categoryIdFromSlug(slug) {
  if (!slug) return undefined;
  const cat = await db('categories').select('id').where({ slug, is_active: true }).first();
  if (!cat) throw badRequest(`Unknown category "${slug}"`);
  return cat.id;
}

export const shopsService = {
  async nearby(query) {
    const categoryId = await categoryIdFromSlug(query.category);
    if (query.lat === undefined) {
      const latest = await shopsRepository.findLatest({ categoryId, search: query.search, limit: query.limit, offset: query.offset });
      return latest.map((r) => toShopDto(r));
    }
    const rows = await shopsRepository.findNearby({
      lat: query.lat,
      lng: query.lng,
      radiusM: query.radius,
      categoryId,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
    return rows.map((r) => toShopDto(r));
  },

  // Anyone can view an active shop; pending/rejected ones only the owner and admins.
  async getForViewer(shopRef, viewer) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopRef);
    const row = isUuid ? await shopsRepository.findById(shopRef) : await shopsRepository.findBySlug(shopRef);
    if (!row) throw notFound('Shop not found');
    const isOwner = viewer && viewer.id === row.owner_id;
    const isAdmin = viewer?.role === 'admin';
    if (row.status !== 'active' && !isOwner && !isAdmin) throw notFound('Shop not found');
    return toShopDto(row, { includePrivate: isOwner || isAdmin });
  },

  async myShops(ownerId) {
    const rows = await shopsRepository.findByOwner(ownerId);
    return rows.map((r) => toShopDto(r, { includePrivate: true }));
  },

  async register(ownerId, body) {
    const shopId = await db.transaction(async (trx) => {
      const count = await shopsRepository.countByOwner(ownerId, trx);
      if (count >= MAX_SHOPS_PER_OWNER) throw conflict('You already have a registered shop');
      const id = await shopsRepository.create(
        { ...toShopRow(body), owner_id: ownerId, slug: uniqueSlug(`${body.name} ${body.city}`) },
        trx,
      );
      await usersService.promoteToSeller(ownerId, trx);
      return id;
    });
    events.emit(EVENTS.SHOP_REGISTERED, { shopId, ownerId });
    return toShopDto(await shopsRepository.findById(shopId), { includePrivate: true });
  },

  async update(user, shopId, body) {
    await this.assertCanManage(user, shopId);
    await shopsRepository.update(shopId, toShopRow(body));
    return toShopDto(await shopsRepository.findById(shopId), { includePrivate: true });
  },

  async assertCanManage(user, shopId) {
    const shop = await shopsRepository.getOwnerId(shopId);
    if (!shop) throw notFound('Shop not found');
    if (shop.owner_id !== user.id && user.role !== 'admin') throw forbidden('Not your shop');
    return shop;
  },

  async listByStatus(status, page) {
    const rows = await shopsRepository.findByStatus(status, page);
    return rows.map((r) => toShopDto(r, { includePrivate: true }));
  },

  async setStatus(shopId, status, reason) {
    const updated = await shopsRepository.update(shopId, { status, status_reason: reason ?? null });
    if (!updated) throw notFound('Shop not found');
    events.emit(EVENTS.SHOP_STATUS_CHANGED, { shopId, status });
    return toShopDto(await shopsRepository.findById(shopId), { includePrivate: true });
  },
};

import { db } from '../../db/knex.js';

const PUBLIC_COLUMNS = ['id', 'email', 'name', 'phone', 'avatar_url', 'role', 'created_at'];

export const usersRepository = {
  findById(id) {
    return db('users').select(PUBLIC_COLUMNS).where({ id }).first();
  },

  findByEmail(email) {
    return db('users').select([...PUBLIC_COLUMNS, 'google_id']).where({ email }).first();
  },

  async create(data) {
    const [user] = await db('users').insert(data).returning(PUBLIC_COLUMNS);
    return user;
  },

  async update(id, data, trx = db) {
    const [user] = await trx('users').where({ id }).update(data).returning(PUBLIC_COLUMNS);
    return user;
  },

  setPhoneIfEmpty(id, phone, trx = db) {
    return trx('users').where({ id }).where((q) => q.whereNull('phone').orWhere('phone', '')).update({ phone });
  },

  promoteToSeller(id, trx = db) {
    return trx('users').where({ id, role: 'customer' }).update({ role: 'seller' });
  },
};

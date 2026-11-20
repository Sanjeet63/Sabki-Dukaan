import { env } from '../../config/env.js';
import { notFound } from '../../shared/errors.js';
import { usersRepository } from './users.repository.js';

export const usersService = {
  async getById(id) {
    const user = await usersRepository.findById(id);
    if (!user) throw notFound('User not found');
    return user;
  },

  // Find or create the user after Google login.
  async findOrCreate({ email, name, avatarUrl, googleId }) {
    const normalizedEmail = email.trim().toLowerCase();
    const isAdmin = env.ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(normalizedEmail);
    const existing = await usersRepository.findByEmail(normalizedEmail);

    if (!existing) {
      return usersRepository.create({
        email: normalizedEmail,
        name,
        avatar_url: avatarUrl ?? null,
        google_id: googleId ?? null,
        role: isAdmin ? 'admin' : 'customer',
      });
    }

    const patch = {};
    if (googleId && !existing.google_id) patch.google_id = googleId;
    if (avatarUrl && !existing.avatar_url) patch.avatar_url = avatarUrl;
    if (isAdmin && existing.role !== 'admin') patch.role = 'admin';
    if (Object.keys(patch).length === 0) {
      const { google_id: _omit, ...user } = existing;
      return user;
    }
    return usersRepository.update(existing.id, patch);
  },

  async updateProfile(id, { name, phone }) {
    return usersRepository.update(id, { name, phone });
  },

  // First delivery order: remember the phone so the shop can call next time too
  async savePhoneIfMissing(id, phone, trx) {
    await usersRepository.setPhoneIfEmpty(id, phone, trx);
  },

  // Registering a shop turns a customer into a seller
  async promoteToSeller(id, trx) {
    await usersRepository.promoteToSeller(id, trx);
  },
};

import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { signToken } from '../../middlewares/auth.js';
import { badRequest, unauthorized } from '../../shared/errors.js';
import { usersService } from '../users/users.service.js';

const googleClient = new OAuth2Client();

function session(user) {
  return { token: signToken(user), user };
}

export const authService = {
  config() {
    return { googleClientId: env.GOOGLE_CLIENT_ID || null };
  },

  async loginWithGoogle(credential) {
    if (!env.GOOGLE_CLIENT_ID) throw badRequest('Google login is not configured');

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw unauthorized('Invalid Google login');
    }
    if (!payload?.email || !payload.email_verified) {
      throw unauthorized('Google email is not verified');
    }

    const user = await usersService.findOrCreate({
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture,
      googleId: payload.sub,
    });
    return session(user);
  },

  async me(userId) {
    const user = await usersService.getById(userId);
    // Issue a fresh token too, in case the role changed (e.g. became a seller)
    return session(user);
  },
};

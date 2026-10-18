import { Router, type Response } from 'express';
import { loginSchema, registerSchema, type AuthResponse } from '@quickbill/shared';
import { authenticate, currentUser } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rate-limit';
import * as auth from './auth.service';
import { REFRESH_COOKIE, refreshCookieOptions } from './tokens';

export const authRouter = Router();

function sendSession(res: Response, session: Awaited<ReturnType<typeof auth.login>>, status = 200) {
  const { refreshToken, ...body } = session;
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(status).json(body satisfies AuthResponse);
}

authRouter.post('/login', authLimiter, async (req, res) => {
  const session = await auth.login(loginSchema.parse(req.body), req.get('user-agent'));
  sendSession(res, session);
});

authRouter.post('/register', authLimiter, async (req, res) => {
  const session = await auth.register(registerSchema.parse(req.body), req.get('user-agent'));
  sendSession(res, session, 201);
});

authRouter.post('/refresh', async (req, res) => {
  const presented: string | undefined = req.cookies?.[REFRESH_COOKIE];
  try {
    const session = await auth.refresh(presented, req.get('user-agent'));
    sendSession(res, session);
  } catch (err) {
    // Only clear a cookie this request actually sent; otherwise a slow failed refresh
    // could delete a cookie that a login set a moment later.
    if (presented)
      res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    throw err;
  }
});

authRouter.post('/logout', async (req, res) => {
  await auth.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.status(204).end();
});

authRouter.get('/me', authenticate, async (req, res) => {
  res.json(await auth.getMe(currentUser(req).id));
});

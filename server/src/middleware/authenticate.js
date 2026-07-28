import mongoose from 'mongoose';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../services/tokenService.js';

export async function authenticate(req, _res, next) {
  try {
    const authorization = req.get('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new AppError('Authentication required', 401);

    const payload = verifyAccessToken(authorization.slice(7));
    if (!mongoose.isValidObjectId(payload.sub)) throw new AppError('Invalid access token', 401);

    const user = await User.findById(payload.sub).select('+passwordChangedAt');
    if (!user || user.status !== 'active') throw new AppError('Invalid access token', 401);
    if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      throw new AppError('Access token is no longer valid', 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Invalid or expired access token', 401));
  }
}

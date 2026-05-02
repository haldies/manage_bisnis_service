import jwt, { type SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-me';

export function signToken(payload: object, expiresIn: SignOptions['expiresIn'] = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

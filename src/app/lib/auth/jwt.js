import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function signToken(payload) {
  return generateToken(payload);
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

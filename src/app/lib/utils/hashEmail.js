import crypto from 'crypto';
import { normalizeEmail } from '@/lib/utils/normalizeEmail';

export function hashEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
}

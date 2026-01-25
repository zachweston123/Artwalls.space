import crypto from 'node:crypto';

const STATUS = ['DRAFT', 'SENT', 'CLICKED', 'ACCEPTED', 'DECLINED', 'EXPIRED'];

export function generateInviteToken() {
  return crypto.randomBytes(16).toString('hex');
}

export function isValidInviteToken(token) {
  if (!token || typeof token !== 'string') return false;
  return /^[a-f0-9]{16,64}$/i.test(token.trim());
}

export function isStatusTransitionAllowed(current, next) {
  if (!STATUS.includes(current) || !STATUS.includes(next)) return false;
  if (current === next) return true;
  const allowed = {
    DRAFT: ['SENT', 'CLICKED', 'DECLINED', 'EXPIRED'],
    SENT: ['CLICKED', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
    CLICKED: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
    ACCEPTED: [],
    DECLINED: [],
    EXPIRED: [],
  };
  return allowed[current]?.includes(next) || false;
}

export function statusAfterOpen(current) {
  if (current === 'DRAFT' || current === 'SENT') return 'CLICKED';
  return current;
}

export function shouldBlockDuplicateInvite(lastInviteAtIso, nowIso, windowDays = 30) {
  if (!lastInviteAtIso) return false;
  const last = new Date(lastInviteAtIso).getTime();
  const now = new Date(nowIso).getTime();
  if (!Number.isFinite(last) || !Number.isFinite(now)) return false;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return now - last < windowMs;
}

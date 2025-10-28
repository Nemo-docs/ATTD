const USER_CACHE_KEY = 'attd_user_id';
const USER_ID_LENGTH = 16;

const generateDigits = (length: number): string => {
  if (typeof window === 'undefined') {
    return ''.padStart(length, '0');
  }

  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => String(byte % 10)).join('');
  }

  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

export const generateUserId = (): string => generateDigits(USER_ID_LENGTH);

export const ensureUserId = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  let userId = window.localStorage.getItem(USER_CACHE_KEY) ?? '';

  if (!/^\d{16}$/.test(userId)) {
    const generated = generateUserId();
    if (/^\d{16}$/.test(generated)) {
      window.localStorage.setItem(USER_CACHE_KEY, generated);
      userId = generated;
    }
  }

  return userId;
};

export const getStoredUserId = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(USER_CACHE_KEY) ?? '';
};

export const resolveUserId = (): string => {
  const userId = getStoredUserId() || ensureUserId();
  if (!/^\d{16}$/.test(userId)) {
    throw new Error('Unable to determine user id');
  }
  return userId;
};

export { USER_CACHE_KEY };


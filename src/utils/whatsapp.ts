'use client';

export interface WAMessageOptions {
  phone: string;
  message: string;
}

export function normalizeIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWALink({ phone, message }: WAMessageOptions): string {
  const formattedPhone = normalizeIndonesianPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return 'https://wa.me/' + formattedPhone + '?text=' + encodedMessage;
}

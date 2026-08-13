'use server';

import { cookies } from 'next/headers';

export async function loginAdminRT(
  emailOrData: string | FormData | { email?: string; password?: string },
  passwordInput?: string
) {
  let email = '';
  let password = '';

  if (typeof emailOrData === 'string') {
    email = emailOrData;
    password = passwordInput || '';
  } else if (emailOrData instanceof FormData) {
    email = (emailOrData.get('email') as string) || '';
    password = (emailOrData.get('password') as string) || '';
  } else if (typeof emailOrData === 'object' && emailOrData !== null) {
    email = emailOrData.email || '';
    password = emailOrData.password || '';
  }

  if (email === 'admin@rt.id' && password === 'admin123') {
    const cookieStore = await cookies();
    cookieStore.set('rt_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 Hari
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Email atau kata sandi pengurus RT salah.' };
}

export async function logoutAdminRT() {
  const cookieStore = await cookies();
  cookieStore.delete('rt_session');
  return { success: true };
}

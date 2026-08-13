'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getPublicPropertiesList() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, property_name, type, slug, address, house_rules, status, owner_name, owner_phone, pin_code, failed_pin_attempts, pin_locked_until')
    .order('created_at', { ascending: false });

  return { success: !error, properties: data || [] };
}

export async function createProperty(
  name: string,
  type: 'kos' | 'kontrakan',
  address: string,
  house_rules: string,
  pin_code: string,
  owner_name?: string,
  owner_phone?: string
) {
  if (!name || !pin_code) return { success: false, error: 'Nama properti & PIN wajib diisi.' };

  const slugBase = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const slug = `${slugBase}-${randomCode}`;

  const { data, error } = await supabase.from('properties').insert({
    name,
    property_name: name,
    type,
    slug,
    address,
    house_rules,
    pin_code,
    owner_name: owner_name || '',
    owner_phone: owner_phone || '',
    status: 'PENDING'
  }).select();

  if (error) return { success: false, error: error.message };

  try {
    revalidatePath('/owner');
    revalidatePath('/rt');
  } catch (e) {}

  return { success: true, data };
}

export async function updateProperty(
  propertyId: string,
  payload: {
    name?: string;
    owner_name?: string;
    owner_phone?: string;
    address?: string;
    type?: string;
  }
) {
  const { error } = await supabase
    .from('properties')
    .update({
      name: payload.name,
      property_name: payload.name,
      owner_name: payload.owner_name,
      owner_phone: payload.owner_phone,
      address: payload.address,
      type: payload.type
    })
    .eq('id', propertyId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function deleteProperty(propertyId: string) {
  await supabase.from('tenants').delete().eq('property_id', propertyId);
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function getTenantsByPropertyPin(propertyId: string, pinInput: string) {
  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propErr || !prop) return { success: false, error: 'Properti tidak ditemukan.' };

  if (prop.pin_locked_until && new Date(prop.pin_locked_until) > new Date()) {
    return { success: false, error: '🔒 Unit ini terkunci sementara akibat 3x PIN salah. Hubungi RT untuk reset PIN.' };
  }

  if (prop.pin_code !== pinInput) {
    const attempts = (prop.failed_pin_attempts || 0) + 1;
    let lockTime = null;

    if (attempts >= 3) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      lockTime = lockUntil.toISOString();
    }

    await supabase
      .from('properties')
      .update({ failed_pin_attempts: attempts, pin_locked_until: lockTime })
      .eq('id', propertyId);

    if (attempts >= 3) {
      return { success: false, error: '🔒 Terlalu banyak percobaan PIN salah. Terkunci 15 menit.' };
    }

    return { success: false, error: `🔒 PIN salah (${attempts}/3 percobaan).` };
  }

  await supabase
    .from('properties')
    .update({ failed_pin_attempts: 0, pin_locked_until: null })
    .eq('id', propertyId);

  const { data: tenants, error: tenErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('property_id', propertyId)
    .order('entry_date', { ascending: false });

  return { success: true, property: prop, tenants: tenants || [] };
}

export async function updateTenantStatus(tenantId: string, status: 'active' | 'checked_out') {
  const { error } = await supabase
    .from('tenants')
    .update({ status: status.toUpperCase() })
    .eq('id', tenantId);

  return { success: !error };
}

export async function updateTenantData(
  tenantId: string,
  payload: {
    name?: string;
    phone?: string;
    room_number?: string;
    relation?: string;
  }
) {
  const { error } = await supabase
    .from('tenants')
    .update(payload)
    .eq('id', tenantId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function deleteTenant(tenantId: string) {
  const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
  return { success: !error };
}

export async function updateHouseRules(propertyId: string, house_rules: string) {
  const { error } = await supabase
    .from('properties')
    .update({ house_rules })
    .eq('id', propertyId);

  return { success: !error };
}

export async function getTenantKtpUrl(filePath: string) {
  if (!filePath) return { success: false, error: 'Path KTP kosong.' };
  const cleanPath = filePath.replace(/^ktp-documents\//, '');
  const { data, error } = await supabase.storage.from('ktp-documents').createSignedUrl(cleanPath, 60);

  if (error || !data?.signedUrl) return { success: false, error: 'Gagal membuat signed URL KTP.' };
  return { success: true, url: data.signedUrl };
}

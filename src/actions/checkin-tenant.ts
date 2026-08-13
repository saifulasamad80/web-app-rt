'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface SubmitResponse {
  success: boolean;
  error?: string;
  message?: string;
  household_id?: string;
  registered_at?: string;
}

export async function getOwnerPropertiesAndTenants() {
  try {
    const { data: properties, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true });

    // Ambil data tenants secara langsung tanpa join PostgREST yang rawan error
    const { data: tenants, error: tenErr } = await supabase
      .from('tenants')
      .select('*')
      .order('entry_date', { ascending: false });

    // Gabungkan data properti secara manual di level JavaScript (100% Aman)
    const enrichedTenants = (tenants || []).map((t) => {
      const matchedProp = (properties || []).find((p) => p.id === t.property_id);
      return {
        ...t,
        properties: matchedProp
          ? {
              id: matchedProp.id,
              name: matchedProp.name || matchedProp.property_name || 'Kos Melati 1',
              type: matchedProp.type || 'kos',
              slug: matchedProp.slug || 'kos-melati-1',
            }
          : {
              id: 'default',
              name: 'Kos Melati 1',
              type: 'kos',
              slug: 'kos-melati-1',
            },
      };
    });

    return {
      properties: properties || [],
      tenants: enrichedTenants,
      error: propErr?.message || tenErr?.message || null,
    };
  } catch (err: any) {
    return { properties: [], tenants: [], error: err.message };
  }
}

export async function updateTenantStatus(id: string, status: 'active' | 'checked_out') {
  try {
    const { error } = await supabase
      .from('tenants')
      .update({ status: status.toUpperCase() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTenant(id: string) {
  try {
    if (!id) return { success: false, error: 'ID tidak valid' };
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTenantKtpUrl(ktpPath: string) {
  try {
    if (!ktpPath) {
      return { success: false, error: 'Berkas KTP belum diunggah.' };
    }

    if (ktpPath.startsWith('http://') || ktpPath.startsWith('https://')) {
      return { success: true, url: ktpPath };
    }

    const buckets = ['ktp-documents', 'ktp', 'tenants', 'documents'];
    for (const bucket of buckets) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(ktpPath, 60);

      if (!error && data?.signedUrl) {
        return { success: true, url: data.signedUrl };
      }
    }

    return { success: false, error: 'Berkas KTP tidak ditemukan di Storage.' };
  } catch (err: any) {
    return { success: false, error: 'Gagal menghubungkan ke Storage.' };
  }
}

export async function getPropertyRules(slug: string) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, type, house_rules')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return { success: false, rules: '1. Wajib menjaga ketertiban lingkungan.' };
    }
    return { success: true, property: data };
  } catch (err) {
    return { success: false, rules: '1. Wajib menjaga ketertiban.' };
  }
}

export async function updateHouseRules(propertyId: string, houseRules: string) {
  try {
    const { error } = await supabase
      .from('properties')
      .update({ house_rules: houseRules })
      .eq('id', propertyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Gagal memperbarui tata tertib.' };
  }
}

export async function submitMultiTenantsStrict(formData: FormData): Promise<SubmitResponse> {
  try {
    const property_slug = formData.get('property_slug') as string;
    const phone = formData.get('phone') as string;
    const entry_date = formData.get('entry_date') as string;
    const address_ktp = formData.get('address_ktp') as string;
    const room_number = (formData.get('room_number') as string) || null;
    const full_address = (formData.get('full_address') as string) || null;
    const occupantsJson = formData.get('occupants') as string;

    if (!property_slug || !phone || !occupantsJson) {
      return { success: false, error: 'Data formulir tidak lengkap.' };
    }

    const occupants = JSON.parse(occupantsJson);
    const household_id = 'UNIT-' + Date.now();
    const registered_at = new Date().toISOString();

    const { data: propData } = await supabase
      .from('properties')
      .select('id, type')
      .eq('slug', property_slug)
      .single();

    const property_id = propData?.id || null;

    for (let i = 0; i < occupants.length; i++) {
      const fileKey = 'ktp_file_' + i;
      const file = formData.get(fileKey) as File | null;
      const birthDate = new Date(occupants[i].birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

      if (age >= 17 && (!file || file.size === 0)) {
        return {
          success: false,
          error: 'Penghuni ke-' + (i + 1) + ' (' + occupants[i].name + ') berusia ' + age + ' thn wajib melampirkan foto KTP.',
        };
      }
    }

    for (let i = 0; i < occupants.length; i++) {
      const occ = occupants[i];
      let ktp_url = '';

      const fileKey = 'ktp_file_' + i;
      const file = formData.get(fileKey) as File | null;

      if (file && file.size > 0) {
        const fileExt = file.name.split('.').pop();
        const fileName = household_id + '_' + i + '_' + Date.now() + '.' + fileExt;

        const { data: storageData, error: uploadErr } = await supabase.storage
          .from('ktp-documents')
          .upload(fileName, file);

        if (!uploadErr && storageData) {
          ktp_url = storageData.path;
        }
      }

      await supabase.from('tenants').insert({
        property_id,
        name: occ.name,
        phone: phone,
        entry_date: entry_date,
        birth_date: occ.birth_date,
        address_ktp: address_ktp,
        room_number: room_number,
        full_address: full_address,
        status: 'PENDING',
        household_id: household_id,
        is_head: i === 0,
        relation: occ.relation || (i === 0 ? 'Penanggung Jawab' : 'Anggota'),
        ktp_url: ktp_url || null,
        agreed_rules: true,
        agreed_rules_at: registered_at,
      });
    }

    return {
      success: true,
      household_id: household_id,
      registered_at: registered_at,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memproses pendaftaran.' };
  }
}


export async function submitTenantCheckin(formData: FormData): Promise<SubmitResponse> {
  // Jika format data lama (tanpa array occupants), bungkus otomatis
  if (!formData.get('occupants') && formData.get('name')) {
    const singleOccupant = [{
      name: formData.get('name') as string,
      birth_date: (formData.get('birth_date') as string) || '2000-01-01',
      relation: 'Penanggung Jawab'
    }];
    formData.append('occupants', JSON.stringify(singleOccupant));
  }
  return await submitMultiTenantsStrict(formData);
}

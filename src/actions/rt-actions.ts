'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getRtDashboardData() {
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .order('entry_date', { ascending: false });

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
              status: matchedProp.status || 'APPROVED',
            }
          : {
              id: 'default',
              name: 'Kos Melati 1',
              type: 'kos',
              slug: 'kos-melati-1',
              status: 'APPROVED',
            },
      };
    });

    return {
      properties: properties || [],
      tenants: enrichedTenants,
      success: true,
    };
  } catch (err: any) {
    return { properties: [], tenants: [], success: false, error: err.message };
  }
}

export async function verifyTenantByRt(id: string, status: 'VERIFIED' | 'REJECTED' | 'ACTIVE') {
  try {
    const { error } = await supabase
      .from('tenants')
      .update({ status: status })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    try { revalidatePath('/rt'); revalidatePath('/owner'); } catch(e){}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approvePropertyByRt(propertyId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    const { error } = await supabase
      .from('properties')
      .update({ status: status })
      .eq('id', propertyId);

    if (error) return { success: false, error: error.message };
    try { revalidatePath('/rt'); revalidatePath('/owner'); } catch(e){}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetPropertyPinByRt(propertyId: string, newPin: string) {
  try {
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'PIN baru harus berupa 4-digit angka.' };
    }

    const { error } = await supabase
      .from('properties')
      .update({
        pin_code: newPin,
        failed_pin_attempts: 0,
        pin_locked_until: null,
      })
      .eq('id', propertyId);

    if (error) return { success: false, error: error.message };
    try { revalidatePath('/rt'); revalidatePath('/owner'); revalidatePath('/'); } catch(e){}
    return { success: true, message: 'PIN berhasil direset!' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

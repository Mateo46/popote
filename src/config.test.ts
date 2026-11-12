import { describe, expect, it } from 'vitest';
import { parseConfig } from './config';

const key = 'sb_publishable_0123456789abcdefghij';

describe('parseConfig', () => {
  it('accepte une configuration complète', () => {
    const result = parseConfig({
      VITE_SUPABASE_URL: 'https://abc.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    });
    expect(result).toEqual({
      ok: true,
      config: { supabaseUrl: 'https://abc.supabase.co', supabaseKey: key },
    });
  });

  it("corrige l'URL de l'API REST collée à la place de l'URL du projet", () => {
    const result = parseConfig({
      VITE_SUPABASE_URL: 'https://abc.supabase.co/rest/v1/',
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    });
    expect(result.ok && result.config.supabaseUrl).toBe('https://abc.supabase.co');
  });

  it('signale les variables manquantes', () => {
    const result = parseConfig({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(2);
  });
});

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  global: {
    fetch: (input, init) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      return fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      }).finally(() => clearTimeout(timer));
    },
  },
});

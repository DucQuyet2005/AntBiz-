export interface GeminiKeyRecord {
  id: string;
  key_value: string;
  label: string;
  status: 'active' | 'rate_limited' | 'invalid';
  rate_limited_until?: string | null;
  error_count: number;
  last_used_at?: string | null;
}

export interface ComplexityMetrics {
  title: string;
  content: string;
  layout?: string;
}

export function evaluateComplexity(metrics: ComplexityMetrics): 'high' | 'medium' | 'low' {
  const text = `${metrics.title || ''} ${metrics.content || ''}`;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charLength = text.length;

  // 1. Check if the layout is complex (longform or Emag/Spotlight)
  if (metrics.layout && ['dmagazine', 'megastory', 'tamdiem'].includes(metrics.layout)) {
    return 'high';
  }

  // 2. High complexity by length
  if (charLength > 3000 || wordCount > 500) {
    return 'high';
  }

  // 3. Low complexity (very short articles, simple rewrites, summaries)
  if (charLength < 800 && wordCount < 120) {
    return 'low';
  }

  // 4. Default: Medium complexity
  return 'medium';
}

export function selectModel(complexity: 'high' | 'medium' | 'low'): string {
  const globalDefault = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  switch (complexity) {
    case 'high':
      return process.env.GEMINI_HIGH_MODEL || globalDefault;
    case 'low':
      return process.env.GEMINI_LOW_MODEL || 'gemini-3.1-flash-lite';
    case 'medium':
    default:
      return process.env.GEMINI_MEDIUM_MODEL || globalDefault;
  }
}

/**
 * Fetch keys using HTTP REST to bypass Supabase Realtime Client's Node.js WebSocket issues.
 */
async function fetchKeysFromDB(): Promise<GeminiKeyRecord[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/gemini_api_keys?status=neq.invalid`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`DB Fetch failed: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('[Gemini Rotation DB] Error fetching keys:', err);
    return [];
  }
}

/**
 * Update key in DB using HTTP REST PATCH
 */
async function updateKeyInDB(id: string, payload: Partial<GeminiKeyRecord>): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/gemini_api_keys?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error('[Gemini Rotation DB] Error updating key:', res.statusText);
    }
  } catch (err) {
    console.error('[Gemini Rotation DB] Error updating key:', err);
  }
}

/**
 * Executes a Gemini runner function using rotated API keys.
 * Automatically handles failovers on rate-limiting (429) or invalid key errors.
 */
export async function executeWithRotation<T>(
  complexityMetrics: ComplexityMetrics,
  runner: (apiKey: string, modelName: string) => Promise<T>
): Promise<T> {
  const complexity = evaluateComplexity(complexityMetrics);
  const modelName = selectModel(complexity);

  console.log(`[Gemini Rotation] Evaluated complexity: "${complexity}". Target model: "${modelName}"`);

  // Fetch keys from DB via REST client
  const keys = await fetchKeysFromDB();

  // Filter keys: keep all non-invalid keys (including rate-limited ones as fallback)
  let availableKeys: GeminiKeyRecord[] = keys.filter((key) => key.status !== 'invalid');
  let usingInvalidFallback = false;

  // Self-healing fallback: If all keys in DB are invalid, try them as last resort before giving up
  if (availableKeys.length === 0 && keys.length > 0) {
    console.warn('[Gemini Rotation] All keys in DB are marked invalid. Attempting to use them as a self-healing fallback.');
    availableKeys = keys;
    usingInvalidFallback = true;
  }

  // If no keys in DB, fallback to environment variable (GEMINI_API_KEY)
  if (availableKeys.length === 0) {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
      console.warn('[Gemini Rotation] No keys found in database. Falling back to env GEMINI_API_KEY.');
      const finalModel = process.env.GEMINI_MODEL || modelName;
      return runner(envKey, finalModel);
    }
    throw new Error('Không tìm thấy API Key Gemini nào khả dụng (trong Database lẫn biến môi trường)');
  }

  // Sort strategy:
  // 1. Active keys first, rate-limited keys last.
  // 2. Within the same status, sort by last_used_at ascending (nulls first) to pick the least recently used key
  const now = new Date();
  availableKeys.sort((a, b) => {
    const aIsRateLimited = a.status === 'rate_limited' && a.rate_limited_until && new Date(a.rate_limited_until) > now;
    const bIsRateLimited = b.status === 'rate_limited' && b.rate_limited_until && new Date(b.rate_limited_until) > now;

    if (aIsRateLimited && !bIsRateLimited) return 1;
    if (!aIsRateLimited && bIsRateLimited) return -1;

    if (!a.last_used_at) return -1;
    if (!b.last_used_at) return 1;
    return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
  });

  for (let i = 0; i < availableKeys.length; i++) {
    const keyRecord = availableKeys[i];
    console.log(`[Gemini Rotation] Trying key "${keyRecord.label}" (Attempt ${i + 1}/${availableKeys.length})...`);

    try {
      const result = await runner(keyRecord.key_value, modelName);

      // Success: update stats
      await updateKeyInDB(keyRecord.id, {
        status: 'active',
        error_count: 0,
        rate_limited_until: null,
        last_used_at: new Date().toISOString()
      });

      return result;
    } catch (err: any) {
      const errMsg = err.message || '';
      
      // Determine error type accurately to prevent false invalidations
      const isRateLimit = 
        errMsg.includes('429') || 
        errMsg.toLowerCase().includes('quota') || 
        errMsg.toLowerCase().includes('rate limit') || 
        err.status === 429;
        
      const isAuthError = 
        errMsg.toLowerCase().includes('api key not valid') || 
        errMsg.toLowerCase().includes('api_key_invalid') || 
        errMsg.toLowerCase().includes('key not valid') ||
        errMsg.toLowerCase().includes('invalid key') ||
        (err.status === 400 && errMsg.toLowerCase().includes('key')) ||
        (err.status === 403 && (
          errMsg.toLowerCase().includes('denied') || 
          errMsg.toLowerCase().includes('disabled') || 
          errMsg.toLowerCase().includes('blocked') ||
          errMsg.toLowerCase().includes('forbidden')
        ));

      const isModelNotFoundError = 
        errMsg.includes('404') || 
        (errMsg.toLowerCase().includes('model') && (
          errMsg.toLowerCase().includes('not found') || 
          errMsg.toLowerCase().includes('not available')
        ));

      console.warn(`[Gemini Rotation] Key "${keyRecord.label}" failed:`, err.message || err);

      if (isRateLimit) {
        const rateLimitedUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        await updateKeyInDB(keyRecord.id, {
          status: 'rate_limited',
          rate_limited_until: rateLimitedUntil,
          error_count: keyRecord.error_count + 1
        });
        console.warn(`[Gemini Rotation] Key "${keyRecord.label}" marked as rate_limited until ${rateLimitedUntil}`);
      } else if (isAuthError) {
        await updateKeyInDB(keyRecord.id, {
          status: 'invalid',
          error_count: keyRecord.error_count + 1
        });
        console.error(`[Gemini Rotation] Key "${keyRecord.label}" marked as invalid due to auth error`);
      } else if (isModelNotFoundError) {
        // If the model itself is not found, do not mark the key as invalid since it is a configuration/model availability issue
        console.warn(`[Gemini Rotation] Model not found error. Keeping key "${keyRecord.label}" active.`);
        await updateKeyInDB(keyRecord.id, {
          error_count: keyRecord.error_count + 1
        });
      } else {
        const nextErrorCount = keyRecord.error_count + 1;
        const nextStatus = nextErrorCount >= 5 ? 'invalid' : keyRecord.status;
        await updateKeyInDB(keyRecord.id, {
          status: nextStatus,
          error_count: nextErrorCount
        });
        if (nextStatus === 'invalid') {
          console.error(`[Gemini Rotation] Key "${keyRecord.label}" marked as invalid after 5 errors`);
        }
      }

      if (i === availableKeys.length - 1) {
        throw new Error(`Tất cả ${availableKeys.length} API Key Gemini đều gặp lỗi. Lỗi cuối cùng: ${err.message || err}`);
      }
    }
  }

  throw new Error('Không thể hoàn thành yêu cầu bằng bất kỳ API Key nào');
}

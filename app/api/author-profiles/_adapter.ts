import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { AuthorProfileModule } from '@/backend/modules/author-profiles/author-profile-module';
import { SupabaseAuthorProfileRepository } from '@/backend/modules/author-profiles/author-profile-repository';
import { ProductionStyleSampleSource } from '@/backend/modules/author-profiles/style-sample-source-adapter';
import {
  AuthorProfileError,
  AuthorProfileRepositoryError,
} from '@/backend/modules/author-profiles/errors';

export const AUTHOR_PROFILE_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export function buildAuthorProfileModule(supabase: SupabaseClient) {
  return new AuthorProfileModule(
    new SupabaseAuthorProfileRepository(supabase),
    new ProductionStyleSampleSource()
  );
}

export function authorProfileErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof AuthorProfileError) {
    if (error.status === 500) console.error(logLabel, error.cause);
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  if (error instanceof AuthorProfileRepositoryError) {
    console.error(logLabel, error.cause);
    return NextResponse.json(
      { error: 'Không thể xử lý hồ sơ văn phong tác giả' },
      { status: 500 }
    );
  }
  console.error(logLabel, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Lỗi hệ thống' },
    { status: 500 }
  );
}

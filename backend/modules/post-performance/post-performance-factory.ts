import type { SupabaseClient } from '@supabase/supabase-js';
import { PostPerformanceModule } from './post-performance-module';
import { SupabasePostPerformanceRepository } from './post-performance-repository';
import { FacebookPerformanceCollector } from './facebook-performance-collector';
import { InstagramPerformanceCollector } from './instagram-performance-collector';

export function createPostPerformanceModule(supabase: SupabaseClient): PostPerformanceModule {
  return new PostPerformanceModule(
    new SupabasePostPerformanceRepository(supabase),
    [
      new FacebookPerformanceCollector(),
      new InstagramPerformanceCollector(),
    ]
  );
}

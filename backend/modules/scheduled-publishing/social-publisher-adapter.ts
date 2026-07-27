import { publishToFacebookPage, publishToInstagramAccount } from '@/lib/facebook';
import { publishToInstagram } from '@/lib/instagram';
import { postThread } from '@/lib/threads';
import type {
  PublicationRequest,
  PublicationResult,
  SocialPublisher,
} from './scheduled-publishing-types';

export class ProductionSocialPublisher implements SocialPublisher {
  async publish(input: PublicationRequest): Promise<PublicationResult> {
    if (input.platform === 'thread') {
      if (!input.accessToken) {
        return { success: false, error: 'Tài khoản Threads chưa được kết nối hoặc thiếu access token' };
      }
      return retry(
        async () => normalizeResult(await postThread(
          input.message, input.imageUrls, input.accessToken
        )),
        3
      );
    }
    if (input.platform === 'instagram') {
      return retry(
        async () => normalizeResult(await (input.accessToken && input.accountId
          ? publishToInstagram(input.message, input.imageUrls, input.accountId, input.accessToken)
          : publishToInstagramAccount(input.message, input.imageUrls))),
        3
      );
    }
    return normalizeResult(await publishToFacebookPage(
      input.message, input.imageUrls, input.accountId, input.accessToken
    ));
  }
}

function normalizeResult(result: { success: boolean; postId?: string; error?: string }): PublicationResult {
  return result.success && result.postId
    ? { success: true, postId: result.postId }
    : { success: false, error: result.error || 'Không xác định' };
}

async function retry(
  operation: () => Promise<PublicationResult>,
  attempts: number
): Promise<PublicationResult> {
  let result: PublicationResult = { success: false, error: 'Không xác định' };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await operation();
    if (result.success) return result;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return result;
}

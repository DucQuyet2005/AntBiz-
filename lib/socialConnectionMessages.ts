export type SocialConnectionLanguage = 'vi' | 'en';

const ERROR_MESSAGES: Record<string, Record<SocialConnectionLanguage, string>> = {
  invalid_state: {
    vi: 'Phiên liên kết không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
    en: 'The connection session is invalid or has expired. Please try again.',
  },
  configuration_error: {
    vi: 'Kết nối này chưa được cấu hình đầy đủ.',
    en: 'This connection has not been fully configured.',
  },
  provider_denied: {
    vi: 'Bạn đã hủy hoặc từ chối quyền liên kết.',
    en: 'You cancelled or denied the connection request.',
  },
  provider_unavailable: {
    vi: 'Nhà cung cấp đang tạm thời không khả dụng. Vui lòng thử lại sau.',
    en: 'The provider is temporarily unavailable. Please try again later.',
  },
  no_accounts: {
    vi: 'Không tìm thấy tài khoản phù hợp với yêu cầu liên kết.',
    en: 'No account matching this connection request was found.',
  },
  persistence_failed: {
    vi: 'Không thể lưu tài khoản liên kết lúc này. Vui lòng thử lại.',
    en: 'The linked account could not be saved. Please try again.',
  },
  invalid_platform: {
    vi: 'Nền tảng liên kết không hợp lệ.',
    en: 'The connection platform is invalid.',
  },
  connection_failed: {
    vi: 'Đã xảy ra lỗi khi liên kết tài khoản. Vui lòng thử lại.',
    en: 'The account connection failed. Please try again.',
  },
};

export function getSocialConnectionErrorMessage(
  code: string | null,
  language: SocialConnectionLanguage,
  platformLabel: string
) {
  const detail = ERROR_MESSAGES[code || 'connection_failed']?.[language]
    || ERROR_MESSAGES.connection_failed[language];
  return language === 'vi'
    ? `Không thể liên kết ${platformLabel}. ${detail}`
    : `Failed to link ${platformLabel}. ${detail}`;
}

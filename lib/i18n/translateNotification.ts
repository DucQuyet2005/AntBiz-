export const translateNotification = (title: string, message: string, lang: string) => {
  if (lang === 'vi') return { title, message };
  
  let translatedTitle = title;
  let translatedMessage = message;

  // Dịch tiêu đề
  const titleLower = title.toLowerCase();
  if (titleLower.includes('lên lịch bài đăng') || titleLower.includes('lên lịch thành công') || titleLower.includes('bài đăng lên lịch')) {
    translatedTitle = 'Post Scheduled';
  } else if (titleLower.includes('màu giao diện') || titleLower.includes('tông màu')) {
    translatedTitle = 'Theme Color Changed';
  } else if (titleLower.includes('vai trò')) {
    translatedTitle = 'Role Changed';
  } else if (titleLower.includes('khóa tài khoản') || titleLower.includes('bị khóa')) {
    translatedTitle = 'Account Locked';
  } else if (titleLower.includes('mở khóa')) {
    translatedTitle = 'Account Unlocked';
  } else if (titleLower.includes('mật khẩu')) {
    translatedTitle = 'Password Changed';
  } else if (titleLower.includes('hồ sơ') || titleLower.includes('thông tin cá nhân') || titleLower.includes('ảnh đại diện')) {
    translatedTitle = 'Profile Updated';
  } else if (titleLower.includes('khôi phục') || titleLower.includes('lưu trữ')) {
    translatedTitle = 'Version Restored';
  } else if (titleLower.includes('prompt')) {
    translatedTitle = 'Prompt Created';
  } else if (titleLower.includes('landing')) {
    translatedTitle = 'Landing Page Published';
  }

  // Dịch nội dung (message)
  if (message.includes('đã được lên lịch đăng tải thành công')) {
    const match = message.match(/Bài viết "([^"]+)" đã được lên lịch đăng tải thành công vào lúc ([^.]+)\./);
    if (match) {
      translatedMessage = `Article "${match[1]}" was successfully scheduled to publish at ${match[2]}.`;
    } else {
      translatedMessage = message.replace('Bài viết', 'Article').replace('đã được lên lịch đăng tải thành công vào lúc', 'was successfully scheduled to publish at');
    }
  }
  else if (message.includes('thay đổi màu sắc giao diện hệ thống')) {
    const colorMap: Record<string, string> = {
      'Lam': 'Indigo',
      'Đào': 'Peach',
      'Bạc hà': 'Mint',
      'Đen đỏ': 'Red-black',
      'Vàng đen': 'Yellow-black',
      'Đỏ': 'Red'
    };
    const colorMatch = message.match(/thành tông màu:\s*([^.]+)/);
    const colorVi = colorMatch ? colorMatch[1].trim() : '';
    const colorEn = colorMap[colorVi] || colorVi;
    translatedMessage = `You changed the system theme color to: ${colorEn}.`;
  }
  else if (message.includes('đã thay đổi vai trò của người dùng')) {
    const match = message.match(/Admin\s+(\S+)\s+đã thay đổi vai trò của người dùng\s+(\S+)\s+từ\s+(\S+)\s+sang\s+(\S+)/);
    if (match) {
      const roleMap: Record<string, string> = {
        'admin': 'Admin',
        'marketer_full': 'Marketer (Full)',
        'marketer_content': 'Marketer (Content)'
      };
      const oldRole = roleMap[match[3]] || match[3];
      const newRole = roleMap[match[4]] || match[4];
      translatedMessage = `Admin ${match[1]} changed the role of user ${match[2]} from ${oldRole} to ${newRole}.`;
    }
  }
  else if (message.includes('đã khóa tài khoản người dùng')) {
    const match = message.match(/Admin\s+(\S+)\s+đã khóa tài khoản người dùng\s+(\S+)\.\s+Lý do:\s*(.+)/);
    if (match) {
      translatedMessage = `Admin ${match[1]} locked the account of user ${match[2]}. Reason: ${match[3]}`;
    }
  }
  else if (message.includes('đã mở khóa tài khoản người dùng')) {
    const match = message.match(/Admin\s+(\S+)\s+đã mở khóa tài khoản người dùng\s+(\S+)/);
    if (match) {
      translatedMessage = `Admin ${match[1]} unlocked the account of user ${match[2]}.`;
    }
  }
  else if (message.includes('Mật khẩu tài khoản của bạn đã được thay đổi thành công')) {
    translatedMessage = 'Your account password has been changed successfully.';
  }
  else if (message.includes('Thông tin cá nhân của bạn đã được cập nhật')) {
    translatedMessage = 'Your profile details have been updated successfully.';
  }
  else if (message.includes('Phiên bản caption lịch sử đã được khôi phục')) {
    translatedMessage = 'Historical caption version has been successfully restored.';
  }
  else if (message.includes('đã được tạo thành công cho nền tảng')) {
    const match = message.match(/Prompt\s+"([^"]+)"\s+đã được tạo thành công cho nền tảng\s+(\S+)/);
    if (match) {
      translatedMessage = `Prompt "${match[1]}" was created successfully for ${match[2]}.`;
    }
  }
  else if (message.includes('Cấu hình landing page mới đã được xuất bản')) {
    translatedMessage = 'New landing page configuration has been published successfully.';
  }

  return { title: translatedTitle, message: translatedMessage };
};

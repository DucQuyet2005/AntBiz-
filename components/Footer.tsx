import React from 'react';
import { Twitter, Linkedin, Instagram, Facebook, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-12 bg-[#333333] text-white w-full flex flex-col px-10 pb-8">
      <div className="pt-12 pb-8 grid grid-cols-12 gap-8 border-b border-gray-600">
        
        {/* Left Column - About */}
        <div className="col-span-6 pr-8">
          <div className="mb-6 flex items-center">
            <div className="bg-[#cc0000] text-white font-bold text-3xl px-3 py-1 rounded-sm flex items-center">
              <span>Ant</span><span className="font-light">b</span><span>iz</span>
            </div>
          </div>
          <h3 className="text-xl font-bold mb-4">Về chúng tôi</h3>
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            Chúng tôi là một đội ngũ gồm những cá nhân đam mê với mục tiêu cải thiện cuộc sống
            của mọi người thông qua các sản phẩm đột phá. Chúng tôi tạo ra những sản phẩm
            tuyệt vời để giải quyết các vấn đề kinh doanh của bạn.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            Sản phẩm của chúng tôi được thiết kế dành cho các công ty vừa và nhỏ muốn tối ưu
            hóa hiệu suất hoạt động.
          </p>
        </div>

        {/* Middle Column - Menu */}
        <div className="col-span-3">
          <h3 className="text-xl font-bold mb-4">Mục lục</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300">
            <a href="#" className="hover:text-white transition-colors">Trang chủ</a>
            <a href="#" className="hover:text-white transition-colors">Lịch sử</a>
            <a href="#" className="hover:text-white transition-colors">Công ty của chúng tôi</a>
            <a href="#" className="hover:text-white transition-colors">Tài nguyên</a>
            <a href="#" className="hover:text-white transition-colors">Nghiên cứu điển hình</a>
            <a href="#" className="hover:text-white transition-colors">Tuyển dụng</a>
            <a href="#" className="hover:text-white transition-colors">Dịch vụ</a>
            <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
            <a href="#" className="hover:text-white transition-colors">Chính sách quyền riêng tư</a>
          </div>
        </div>

        {/* Right Column - Support */}
        <div className="col-span-3">
          <h3 className="text-xl font-bold mb-4">Hỗ trợ</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300">
            <a href="#" className="hover:text-white transition-colors">Trợ giúp</a>
            <a href="#" className="hover:text-white transition-colors">Vận chuyển</a>
            <a href="#" className="hover:text-white transition-colors">Điều khoản Dịch vụ</a>
            <a href="#" className="hover:text-white transition-colors">Trả hàng</a>
            <a href="#" className="hover:text-white transition-colors">Chính sách Bảo mật</a>
            <a href="#" className="hover:text-white transition-colors">Nhận</a>
            <a href="#" className="hover:text-white transition-colors">Chính sách quyền riêng tư</a>
            <a href="#" className="hover:text-white transition-colors">Phòng ban</a>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="pt-8 flex flex-col gap-4">
        <div className="flex items-center gap-4 text-gray-400">
          <a href="#" className="hover:text-white transition-colors"><Twitter size={20} /></a>
          <a href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
          <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
          <a href="#" className="hover:text-white transition-colors"><Facebook size={20} /></a>
          <a href="#" className="hover:text-white transition-colors"><Youtube size={20} /></a>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-base">🇺🇸</span>
          <span className="text-base">🇻🇳</span>
        </div>
        <div className="text-xs text-gray-400">
          Copyright © Company name
        </div>
      </div>
    </footer>
  );
};

export default Footer;

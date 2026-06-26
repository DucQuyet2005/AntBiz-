---
name: AntBiz Design System
description: Bàn làm việc của nhà xuất bản - Giao diện năng suất cao dành cho Content Creator & Marketer.
colors:
  primary: "#5A5CDE"
  primary-hover: "#4A4CBF"
  neutral-bg: "#F4F5F9"
  card: "#FFFFFF"
  text: "#1C1E2A"
  text-muted: "#6B7280"
  mint: "#C4F0E1"
  peach: "#EED7C8"
  sidebar: "#ECEEFE"
typography:
  display:
    fontFamily: "Inter, var(--font-sans), sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, var(--font-sans), sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.2xl}"
    padding: "12px 32px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: AntBiz Design System

## 1. Overview

**Creative North Star: "The Publisher's Workbench" (Bàn làm việc của nhà xuất bản)**

AntBiz Design System được xây dựng dựa trên triết lý tối ưu hóa năng suất và giảm thiểu rào cản thị giác cho các chuyên viên Marketing. Hệ thống giao diện tập trung vào việc tạo không gian soạn thảo yên tĩnh, trực quan nhưng vẫn toát lên sự chuyên nghiệp và đáng tin cậy. 

Sản phẩm kiên quyết loại bỏ các xu hướng thiết kế SaaS sáo rỗng hoặc quá sặc sỡ để Marketer có thể tập trung hoàn toàn vào việc sáng tạo nội dung.

**Key Characteristics:**
- **Rhythm & Structure (Nhịp điệu & Cấu trúc)**: Sử dụng hệ lưới và khoảng cách nhất quán để tạo nhịp điệu đọc rõ ràng.
- **Dynamic Adaptability (Khả năng thích ứng động)**: Hỗ trợ chuyển đổi phông chữ linh hoạt để tối ưu trải nghiệm đọc và soạn thảo.
- **High Readability (Khả năng đọc cao)**: Đảm bảo độ tương phản văn bản đạt chuẩn WCAG AA trên mọi bề mặt giao diện.

## 2. Colors

Bảng màu sử dụng các tông màu chuyên nghiệp, có sắc thái lạnh dịu mắt để giảm căng thẳng cho mắt khi sử dụng trong thời gian dài.

### Primary
- **Performance Indigo** (#5A5CDE / oklch(50.41% 0.2032 268.04)): Màu thương hiệu chính, đại diện cho hiệu năng vượt trội và tính chuyên nghiệp của AI. Được sử dụng cho các nút hành động chính (CTA), tiêu điểm trạng thái và trạng thái được chọn.

### Neutral
- **Ink Navy** (#1C1E2A): Màu văn bản chính, có độ tương phản cao nhưng dịu mắt hơn màu đen thuần túy.
- **Muted Gray** (#6B7280): Dành cho văn bản phụ, ghi chú và các nhãn trạng thái không nhấn mạnh.
- **Slate Tint** (#F4F5F9): Màu nền chính của ứng dụng, tạo cảm giác sạch sẽ và hiện đại.
- **Pure Surface White** (#FFFFFF): Màu nền cho các thẻ (cards), bảng dữ liệu và khu vực soạn thảo để làm nổi bật nội dung.

### Named Rules
**The 10% Accent Rule.** Màu Performance Indigo chỉ được xuất hiện trên tối đa 10% diện tích màn hình để duy trì tính định hướng và giảm nhiễu thị giác.

## 3. Typography

**Display Font:** Inter (with system fallback)
**Body Font:** Inter (with system fallback)

Hệ thống phông chữ hỗ trợ thay đổi động theo lựa chọn của người dùng qua `FontProvider` (ví dụ: DM Sans cho tối giản, Space Grotesk cho công nghệ, Lora cho bài viết dài).

### Hierarchy
- **Display** (Bold (700), clamp(2rem, 5vw, 3.5rem), 1.2): Dành cho tiêu đề lớn, banner quảng cáo.
- **Headline** (Bold (700), 1.5rem, 1.3): Dành cho tiêu đề chính của trang.
- **Title** (SemiBold (600), 1.125rem, 1.4): Dành cho tiêu đề thẻ, tiêu đề module.
- **Body** (Regular (400), 1rem, 1.5): Dành cho nội dung bài viết, caption soạn thảo (giới hạn độ rộng dòng ở 65–75ch).
- **Label** (Medium (500), 0.75rem, normal): Dành cho các nhãn, bộ đếm ký tự, trạng thái.

## 4. Elevation

Hệ thống giao diện sử dụng triết lý phẳng có phân lớp nhẹ nhàng (tonal layering) thay vì lạm dụng đổ bóng lớn. Độ sâu được tạo ra bằng cách sử dụng các lớp nền màu sắc nhẹ nhàng.

### Shadow Vocabulary
- **Interactive Shadow** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Sử dụng cho trạng thái hover của các thẻ hoặc nút bấm quan trọng.

### Named Rules
**The Flat-By-Rest Rule.** Giao diện ở trạng thái tĩnh hoàn toàn phẳng. Đổ bóng chỉ xuất hiện khi có tương tác (hover, focus) để phản hồi hành động của người dùng.

## 5. Components

### Buttons
- **Shape:** Bo tròn góc lớn (full rounded-full cho CTA chính, 12px (rounded-xl) cho nút chức năng).
- **Primary:** Màu Performance Indigo (#5A5CDE), chữ trắng, padding dọc 12px, padding ngang 32px.
- **Hover / Focus:** Đổi sang màu Deep Indigo (#4A4CBF), có hiệu ứng active scale nhẹ (active:scale-95).

### Cards / Containers
- **Corner Style:** Bo tròn góc vừa phải (16px (rounded-2xl)).
- **Background:** Pure Surface White (#FFFFFF), viền xám siêu mảnh (border border-gray-100).
- **Shadow Strategy:** Không đổ bóng ở trạng thái nghỉ, hiển thị đổ bóng nhẹ khi hover.

### Inputs / Fields
- **Style:** Viền xám mảnh, bo góc 12px, nền trắng hoặc xám nhẹ.
- **Focus:** Viền chuyển sang màu Performance Indigo kèm viền ring mờ 2px.

## 6. Do's and Don'ts

### Do:
- **Do** đảm bảo độ tương phản văn bản đạt chuẩn WCAG AA >= 4.5:1.
- **Do** sử dụng `prefers-reduced-motion` cho mọi hiệu ứng chuyển động.
- **Do** giới hạn độ rộng dòng văn bản trong khoảng 65-75ch để tối ưu khả năng đọc.

### Don't:
- **Don't** sử dụng viền kẻ sọc một bên (border-left/right dày) để làm điểm nhấn trên thẻ.
- **Don't** sử dụng gradient tím-xanh neon hoặc các hiệu ứng glassmorphism rườm rà trên giao diện quản trị.
- **Don't** sử dụng border-radius lớn hơn 24px trên các thẻ nội dung lớn.
- **Don't** kết hợp cả viền đậm (border-1px) và đổ bóng cực lớn (shadow blur >= 16px) trên cùng một thành phần.

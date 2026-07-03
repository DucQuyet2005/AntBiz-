# Spec: Step 1 Layout Optimization & Crawl Empty State Design

This document details the layout adjustments for Step 1 of the AI Creator View, optimizing the presentation of the primary configurations and providing an elegant onboarding experience when no input data is currently scraped.

---

## 1. Objectives

- **Refined Layout Structure:** Hide the "Bài viết gốc" (Original Article Preview Card) in Step 1, and show it only in Step 2.
- **Improved Hierarchy:** In Step 1, naturally elevate the **AI Engine Control Panel** (Platform selection, brand style, guidelines, target author) to the top of the right sidebar.
- **Premium Onboarding (Empty State):** Introduce a hybrid glassmorphism card under the crawl URL input when no data is parsed, guiding the user on how the tool works and eliminating negative whitespace.

---

## 2. Detailed Technical Design

### A. Right Column (Sidebar) Layout Adjustments
Currently, the right column (`lg:col-span-4`) displays:
1. `Toggles Customizer` (Only in step 2)
2. `Active AI Configuration Summary` (Only in step 2)
3. `Article Live Preview Card (Bài viết gốc)` (Always shown)
4. `AI ENGINE CONTROL PANEL` (Only in step 1)

**Modification:**
- Wrap `Article Live Preview Card` in `step === 2` condition.
- This ensures that in Step 1, only the `AI ENGINE CONTROL PANEL` is visible, effectively placing "Kênh đăng" (Platform tabs) at the very top of the right sidebar, parallel with the URL crawler input.

### B. Left Column (Main Area) Crawl Empty State
When `inputMode === 'crawl'` and `!postData.title` (or no data has been scraped yet), we display a beautiful card to prevent the interface from looking empty.

**Empty State Component Specification:**
- **Container Styling:**
  - Glassmorphic backdrop: `bg-slate-50/30 dark:bg-zinc-900/10 backdrop-blur-md`
  - Border: `border border-dashed border-slate-200 dark:border-zinc-800`
  - Padding: `p-12` (spacious feel)
  - Rounded corners: `rounded-3xl`
  - Center alignment: `flex flex-col items-center text-center justify-center`
- **Icon / Visual Anchor:**
  - Combined `Globe` and `Sparkles` icon with a subtle indigo/purple soft glow (`shadow-[0_0_50px_0_rgba(99,102,241,0.15)]`).
- **Typography:**
  - Header: `"Sẵn sàng trích xuất nội dung"` (`text-sm font-extrabold text-text`)
  - Subtitle: `"Nhập link bài viết ở trên để AI bắt đầu phân tích và đề xuất caption"` (`text-xs text-text-muted mt-2 max-w-sm`)
- **Quick Guide Pipeline:**
  - A horizontal/vertical row of 3 steps connecting with dashed lines:
    1. **Bước 1:** Dán link bài viết (Icon: `Link`)
    2. **Bước 2:** AI đọc hiểu & phân tích (Icon: `Cpu`)
    3. **Bước 3:** Tạo caption tối ưu (Icon: `Sparkles`)

---

## 3. Scope of Changes

### Modified Files:
- `components/views/AiCreatorView.tsx`

---

## 4. Verification Plan

1. **Step 1 View (No Crawl Data):**
   - Ensure the right sidebar shows the AI Engine Control Panel at the top.
   - Ensure the left column displays the new Empty State guide.
2. **Step 1 View (Crawl Data Available):**
   - Ensure the Empty State guide disappears and the Mock Newspaper preview displays.
3. **Step 2 View:**
   - Ensure the Right Sidebar displays the "Bài viết gốc" card for editorial comparison.
   - Verify that the layout transitions are smooth and do not cause jumpy layout shifts.

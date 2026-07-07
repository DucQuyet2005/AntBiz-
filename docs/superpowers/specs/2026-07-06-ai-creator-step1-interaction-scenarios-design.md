# Step 1 Interaction Scenarios Interactive Preview Design

## Overview
This specification details the creation of an interactive preview page (`/ai-creator/preview-step1`) to showcase, test, and compare 5 creative interaction scenarios for Step 1 ("Nạp nội dung" / AI Configuration & Inputs) of the `AiCreatorView`. These scenarios replace or enhance the traditional sidebar fields (Preset, Brand Style, Custom instructions) with dynamic, interactive flows.

---

## The 5 Interaction Scenarios

### Kịch bản 1: Giao diện Modal nổi (Traditional Dialog Stepper)
- **Visual Flow:**
  - The right panel shows a single prominent button: "Thiết lập chi tiết" (Detailed Settings).
  - Clicking it opens a centered modal with a blurred background overlay (`backdrop-blur-md`).
  - Inside the modal, a horizontal stepper guides the user through 3 steps:
    - **Step 1 (Chọn quy chuẩn):** Selection chips for platform presets.
    - **Step 2 (Chọn văn phong):** Selection chips for brand style tones.
    - **Step 3 (Yêu cầu thêm):** Selection chips for custom requirements.
  - Buttons "Quay lại" and "Tiếp theo / Hoàn thành" manage state.
  - Upon clicking "Hoàn thành", the modal closes and displays the selected options in the right panel as structured, readable full-text summaries.
- **UX Intent:** High focus, distraction-free configuration. Perfect for users who prefer standard wizards.

### Kịch bản 2: Giao diện Side Drawer (Modern Pull-out Drawer)
- **Visual Flow:**
  - The right panel shows a button: "Bắt đầu thiết lập" (Start configuration).
  - Clicking it slides a drawer out from the right edge of the viewport. The drawer overlays the right sidebar area, keeping the left workspace visible.
  - Inside the drawer, a **Vertical Stepper** organizes the steps into collapsible accordion panels:
    - Selecting a preset in Step 1 automatically collapses Step 1 and expands Step 2.
    - Selecting a tone in Step 2 collapses it and expands Step 3.
    - Step 3 features a "Tạo bản xem trước" (Generate Preview) button.
  - Clicking "Tạo bản xem trước" slides the drawer back in and updates the main sidebar with the selected details.
- **UX Intent:** Space-saving, seamless flow that preserves layout context without modal overlays.

### Kịch bản 3: Giao diện Inline Expand (Accordion Selection Grid)
- **Visual Flow:**
  - The right panel features a toggle: "Tùy chỉnh từng bước" (Toggle Mode).
  - When enabled, the static fields disappear and are replaced by an inline accordion grid.
  - **Step 1 (Quy chuẩn):** Selection grid of custom radio buttons. Selecting one unlocks Step 2.
  - **Step 2 (Văn phong):** Custom dropdown interface. Selecting a tone unlocks Step 3.
  - **Step 3 (Yêu cầu thêm):** Checklist of modern option cards.
  - Completing Step 3 automatically compiles the choices into the final prompt text and returns the panel to its original full-text display state.
- **UX Intent:** Inline editing without pop-ups or drawers, catering to keyboard users and fast clicking.

### Kịch bản 4: Giao diện phong cách Sci-Fi / Cyberpunk HUD
- **Visual Flow:**
  - The right panel acts as a parameters controller with a neon glow button: "Khởi tạo thông số" (Initialize parameters).
  - Clicking it transforms the panel into a sci-fi cockpit terminal (Goddess of Victory: Nikke style).
  - Styling includes: neon orange/cyan borders, chamfered corner buttons, grid HUD elements, modules progress indicator, and active glitch/scanline effects.
  - The setup is divided into **3 Phases**:
    - **Phase 1: SYSTEM PRESETS** (HUD grid selectors).
    - **Phase 2: BRAND TONE MATRIX** (HUD matrix clickers).
    - **Phase 3: INSTRUCTION EMULATOR** (Module chip toggles).
  - Confirming the final Phase triggers a scanning overlay anim ("COMPILING PROMPT...") that fades out, revealing the compiled prompt in a retro-terminal monospace format.
- **UX Intent:** Gamified, futuristic experience that adds visual polish and delight.

### Kịch bản 5: Giao diện Card-based Swiper (Thẻ trượt tương tác)
- **Visual Flow:**
  - The right panel shows a button: "Hướng dẫn tạo Prompt".
  - Clicking it turns the panel into a deck of cards that users can swipe/slide through (using Framer Motion).
  - **Card 1 (Quy chuẩn):** Shows 3 visual icon boxes representing platform layout goals. Clicking one slides Card 1 left, showing Card 2.
  - **Card 2 (Văn phong):** Displays 4 distinct tone icons (formal, casual, energetic, humorous). Clicking slides to Card 3.
  - **Card 3 (Yêu cầu thêm):** Renders requirement badges. Clicking slides to Card 4.
  - **Card 4 (Summary Card):** Summarizes the choices and features an "Áp dụng" button to commit the results and exit the swiper.
- **UX Intent:** Mobile-first, card-swiping flow that makes configuration playful and quick.

### Kịch bản 6: Giao diện Phân bước Tối giản (Split Step-by-Step Dropdown)
- **Visual Flow:**
  - The right panel displays two navigation step buttons:
    - **Step 1 (Nền tảng):** Chooses the platform.
    - **Step 2 (Cấu hình):** Configures options for the selected platform.
  - Under Step 1, big clean selectors choose Facebook, Threads, or Instagram. Selecting one unlocks Step 2.
  - Under Step 2, instead of three separate fields inside a card frame with section titles:
    - The inputs are converted into simple borderless **Dropdown menus** or popovers.
    - There are no titles (like "1. QUY CHUẨN INSTAGRAM").
    - The options are only displayed when clicked/needed.
    - No enclosing individual card frames for the inputs.
  - A summary preview updates according to selections.
- **UX Intent:** Ultra-clean minimalist design, hides complexity from view and only displays configuration options on-demand.

---

## Styling & Design Tokens (AntBiz System)
- **Backgrounds:** Pure Surface White (`#FFFFFF`) or Slate Tint (`#F8F9FD`).
- **Cyberpunk Accents:** Neon Orange (`#EAA015`), Neon Cyan (`#06B6D4`), and deep dark panels (`#0B0F19`).
- **Animations:** Custom transitions using `framer-motion` for slide-in drawer, card swipes, accordion collapse, and scifi glitch overlay.
- **Typography:** Inter for clean layout, monospace fonts (`JetBrains Mono` / `Courier New`) for prompt compilations.

---

## Verification Plan

### Manual Verification
1. Access `/ai-creator/preview-step1` in the browser.
2. Select between the 6 scenarios using tabs in the header.
3. Test layout response, transitions, and click behaviors of:
   - Centered Wizard Modal (Model 1)
   - Right Side Drawer (Model 2)
   - Inline Accordion Expand (Model 3)
   - Cyberpunk Grid HUD (Model 4)
   - Flashcard Swiper (Model 5)
   - Split Step-by-Step Dropdown (Model 6)
4. Confirm that choices compile correctly and display as structured text on completion of each flow.

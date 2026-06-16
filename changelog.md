# Changelog

All notable changes to the AntBiz Creator Studio project will be documented in this file.

---

## [1.2.0] - 2026-06-16

### Added
- **AI Publishing Creator Layout update**: Re-architected `/ai-creator` page to a high-fidelity two-column grid matching design requirements. Added *Source Context Importer* card, *Target Channels* checkbox selector, *Generate Optimized Content Variants* CTA, and *Variant Sandbox Previews* with interactive tabs and dynamic post rendering.
- **Language Selector & Settings**: Integrated English/Vietnamese language settings into the `Settings` view with Vietnamese as the default. Configured unified state listeners across the dashboard (`Settings` toggles and `Footer` badges).
- **Interactive System Changelog Card**: Added a timeline visualization of system releases in `/settings`.

### Changed
- **Footer Styling and Color Integration**: Updated Footer background color to `#E9EAF5` to align with Sidebar and the light theme.
- **Footer Scroll Layout Stability**: Refactored the "Về chúng tôi" (About Us) section to cuộn mượt mà (scroll smoothly) with page container scrollbar, avoiding overlay shift or trôi nổi.

---

## [1.1.0] - 2026-06-15

### Added
- **Supabase Authentication**: Integrated secure authentication guards to protect private views and redirect unauthorized sessions to `/login`.
- **Archive Page Grid Layout**: Built a 3-column light-themed card layout showing content metric details and platform icons.
- **FAQ Page Accordion**: Built interactive accordions for frequently asked questions with a "Pro Tips" layout.

---

## [1.0.0] - 2026-05-10

### Added
- Initial project release with core layout elements (Sidebar, Header, Overview stats).

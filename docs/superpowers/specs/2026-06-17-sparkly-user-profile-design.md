# Design Spec: Sparkly User Profile Dropdown

## Goal

Create a high-quality, animated, and interactive profile dropdown menu associated with the user profile icon (currently the "JS" placeholder) in the top-right corner of the dashboard. This interface allows users to update their profile name, custom avatar (including support for animated GIFs), department (bộ phận), and select custom animated frames (khung động) for their avatar.

## Proposed Design & Components

### 1. User Interface: Shimmering Profile Popover
The profile dropdown is triggered by clicking the avatar icon in the top-right corner of the screen.

#### Avatar Trigger (Header)
* An avatar circle featuring the user's active avatar (supports images/GIFs).
* Surounded by an active **Animated Frame** that rotates, glows, or pulses based on the selected setting.
* Uses CSS custom animations:
  * `spin-gradient`: Continuous rotating gradient.
  * `pulse-glow`: Pulsing backglow for cybernetic/neon effects.
  * `gold-shimmer`: Shimmering gold gradient sweep.

#### Profile Dropdown Card (Glassmorphism)
* Opens via a slide-down animation using `framer-motion`.
* Styled with frosted glass: `backdrop-blur-xl bg-white/25 dark:bg-black/40 border border-white/20 shadow-2xl rounded-2xl`.
* **Content Sections**:
  * **User Profile Header**: Displays user initials/avatar, email, and system role (`role` from database) inside a colored pill badge.
  * **Editable Form**:
    * **Display Name**: Text input to modify their full name.
    * **Department**: Text input to change their department ("Bộ phận").
    * **Avatar URL**: Text input to paste an avatar URL (with support for GIFs). We will pre-populate 3 preset animated GIF avatar options (e.g. cute cats, retro pixel art, abstract patterns) for convenience.
  * **Animated Frame Selector**:
    * A row of interactive options to select the avatar frame:
      1. *Rainbow Sparkle* (Multi-color fast rotating border)
      2. *Golden Shimmer* (Luxury gold sweeps)
      3. *Cyberpunk Pulse* (Neon-cyan breathing outline)
      4. *None* (Simple clean border)
  * **Footer Actions**:
    * *Save Changes* button with a beautiful glowing gradient transition.
    * *Sign Out* button with a red hover state.

### 2. Implementation details

#### Data Storage
We will fetch the current authenticated user session on the client side using the Supabase client SDK:
* `const { data: { user } } = await supabase.auth.getUser();`
* User custom values (Full Name, Avatar URL, Department, Active Frame) will be read from and saved to the user's `user_metadata` using:
  `await supabase.auth.updateUser({ data: { full_name, avatar_url, department, avatar_frame } });`
* Real-time UI updates: Once updated, the state updates locally and propagates to the trigger icon.

---

## Verification Plan

### Manual Verification
1. Click the profile avatar to ensure the popover transitions smoothly.
2. Edit display name, department, avatar GIF, and select different frames.
3. Save changes and verify they persist on reload.
4. Verify that entering a GIF URL displays correctly.
5. Click sign out to verify it log the user out successfully.

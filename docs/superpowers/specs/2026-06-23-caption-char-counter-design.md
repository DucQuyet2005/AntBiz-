# Spec: Caption Character Counter in AiCreatorView

## Context & Goal
To prevent users from writing captions that exceed the platform limitations of Facebook, Threads, and Instagram, we need to implement a real-time character counter and limit validation in the `AiCreatorView` variant workspace.

## Success Criteria
- Permanent character counter badge on each variant preview card header in Step 2.
- Real-time character counter and warning message displayed inside the `EditableText` text editor during editing.
- Clear warning colors (red/rose) when character limits are exceeded.

## Configurations
The character limits for each platform are:
- **Facebook**: 63,206 characters
- **Threads**: 5,000 characters
- **Instagram**: 2,200 characters

## Detailed Changes

### Component 1: Variant Card Header (Preview Mode)
In `components/views/AiCreatorView.tsx` within the variant list loop, add a character count pill next to the platform label.
- Normal state: `bg-gray-100 text-gray-500`
- Exceeded state: `bg-rose-50 text-rose-600 border border-rose-200`

### Component 2: EditableText Component (Edit Mode)
In `components/views/AiCreatorView.tsx`'s `EditableText` component:
- Detect if the current field is a caption (`facebook`, `threads`, or `instagram`).
- If so, render a character counter below the active textarea.
- If the text exceeds the limit, display a warning message in red.

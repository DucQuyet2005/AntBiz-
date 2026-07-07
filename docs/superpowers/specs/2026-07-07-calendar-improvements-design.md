# Design Spec: Content Calendar Improvements

This design document outlines the changes required to improve the visual representation and drag-and-drop behavior of the Content Calendar.

## Objectives

1. **Dragging Precision:** Allow users to drag calendar events to any minute (no snapping to 15 or 30 minutes).
2. **Hourly Grouping:** Group multiple scheduled posts scheduled within the same hour slot (e.g., 08:00 - 08:59) into a single visual stacked event. Single posts will still display at their exact minute.
3. **Visual Stacked Representation:** Style the multiple-posts event as a "stacked card" matching the design (light blue background, shadow layers, badge displaying post count, platform icons, and centered "BẤM ĐỂ XEM" action text).
4. **Reschedule Confirmation Dialog:** When a user drags a group of posts, prompt them with a dialog listing all pending posts in the group, allowing them to select which posts they want to reschedule (all, some, or one).
5. **Bulk Reschedule API:** Provide a clean backend endpoint to update the `scheduled_at` times for multiple posts in a single request.
6. **Cursor Pointer:** Change cursor to a hand shape (`cursor-pointer`) when hovering over calendar cards instead of the text selection pointer.

---

## 1. Backend: Calendar Fetch & Reschedule APIs

### API 1: Calendar Fetch Grouping
**Endpoint:** `GET /api/calendar`
* **File:** [route.ts](file:///d:/Web/AntBiz-/app/api/calendar/route.ts)
* **Changes:**
  * Group posts by local hour slot (using UTC+7 timezone representation).
  * If an hour slot contains only 1 post, return it as a single event with `start` set to its exact `scheduled_at` time.
  * If an hour slot contains multiple posts, return it as a grouped event where `start` is the beginning of that hour (e.g., `HH:00`), `end` is `HH + 1 hour` (visually spanning the whole slot), and `extendedProps.posts` contains all posts in that slot.

### API 2: Bulk Reschedule API [NEW]
**Endpoint:** `PUT /api/scheduled-posts/bulk-reschedule`
* **File:** [route.ts](file:///d:/Web/AntBiz-/app/api/scheduled-posts/bulk-reschedule/route.ts)
* **Request Body:**
  ```json
  {
    "ids": ["uuid-1", "uuid-2"],
    "scheduledAt": "2026-07-07T08:32:00.000Z"
  }
  ```
* **Behavior:**
  * Update all posts matching the `ids` to the new `scheduledAt` date/time.
  * Trigger notifications for each updated post.
  * Execute inside a single Supabase query filter.

---

## 2. Frontend Visuals & Drag-and-Drop UX

### Dragging Resolution
* **File:** [ContentCalendarView.tsx](file:///d:/Web/AntBiz-/components/views/ContentCalendarView.tsx)
* Change `snapDuration` property on the `CalendarComponent` from `"00:15:00"` to `"00:01:00"` to allow precise drag positioning.

### Visual Design Styles
* **Hover Cursor:** Apply CSS rule `.fc-event, .fc-event * { cursor: pointer !important; }`.
* **Single Post Event:** 
  * Customize background and borders depending on platform (Facebook: light blue, Instagram: light pink/rose, Threads: light gray, Blog: light green).
  * Render platform icon, start time (e.g., `08:30`), warning triangle if failed/cancelled, and article title.
* **Multiple Posts Event (Stacked Card):**
  * Render multiple overlapping backgrounds shifted slightly to create a stack depth effect.
  * Display a badge with `X bài` (e.g., `2 bài`), platform icons, and purple text `BẤM ĐỂ XEM` centered inside the card.

### Confirmation Dialog
* When `handleEventDrop` is triggered:
  * Check if the dragged event is a multiple-posts group (`isMultiple: true`).
  * If single, show the standard single reschedule confirmation modal.
  * If multiple, show an expanded modal listing all pending posts in the group with checkboxes (checked by default).
  * Clicking "Confirm" calls `/api/scheduled-posts/bulk-reschedule` with selected post IDs.

### Detail Dialog (BẤM ĐỂ XEM)
* Add image previews inside each post card within the detail dialog.
* Fallback resolving image logic:
  * First check `post.image_urls[0]`.
  * Then check `post.captions?.articles?.images[0]`.
  * If none exist, display platform-based placeholder image.

---

## Verification Plan

### Automated Verification
* Verify build correctness using `npm run build` or compilation checks.

### Manual Verification
1. Open Content Calendar tab.
2. Drag a single post and verify it can snap to any minute (e.g., `08:32`).
3. Verify that multiple posts scheduled in the same hour (e.g., `08:15` and `08:45`) are grouped into a single visual stacked event.
4. Verify hover cursor displays a hand pointer over all calendar items.
5. Click on the grouped event and check that the detail dialog displays the exact time and thumbnail images for each post.
6. Drag the grouped event and verify that a dialog pops up asking to confirm moving 1, 2, or all posts. Select a subset and confirm, then verify calendar updates correctly.

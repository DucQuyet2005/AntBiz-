# Design Specification: Calendar Role-Based Filtering & Code Cleanup

**Date:** 2026-07-22  
**Status:** Approved  
**Target Files:**
- `app/api/calendar/route.ts`
- `components/views/ContentCalendarView.tsx`

---

## 1. Overview
1. Enforce role-based calendar post visibility: Users with `marketer_content` role only see posts created by themselves (`creatorId = user.id`), while `admin` and `marketer_full` can view all posts.
2. Clean up dead/unnecessary HTML grid code in `ContentCalendarView.tsx` left over after migrating to FullCalendar.

---

## 2. Detailed Technical Changes

### 2.1 Backend Role Filtering (`app/api/calendar/route.ts`)
- Extract `user` and `role` from `requireUserWithRole(SCHEDULED_PUBLISHING_ROLES)`.
- If `role === 'marketer_content'`, attach `creatorId: user.id` to calendar filters passed to `calendarEvents(filters)`.

### 2.2 Frontend Cleanup (`ContentCalendarView.tsx`)
- Remove unused variables/states:
  - `scrollRef`, `gridContainerRef`
  - `draggedPostId`, `draggedPlatforms`, `dragOverTime`
  - `hoursArray`
  - `getDayAndPosition()`
  - HTML Drag & Drop handlers: `handleDragStart`, `handleDragEnd`, `handleDragOver`, `handleDragLeave`, `handleDrop`
- Keep clean FullCalendar integration and Modal state handlers.

---

## 3. Verification Plan
1. Test `/api/calendar` with `marketer_content` role to verify it returns only user-created posts.
2. Test `/api/calendar` with `admin`/`marketer_full` roles to verify all posts return.
3. Run `npx vitest run __tests__/api/` to ensure all tests pass.

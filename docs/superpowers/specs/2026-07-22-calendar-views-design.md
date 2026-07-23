# Design Specification: FullCalendar Day/Week/Month View Integration

**Date:** 2026-07-22  
**Status:** Approved  
**Target File:** `components/views/ContentCalendarView.tsx`

---

## 1. Overview
The Editorial Calendar view (`ContentCalendarView.tsx`) currently renders a custom 7-day HTML grid that ignores the selected view mode (`dayGridMonth`, `timeGridWeek`, `timeGridDay`). The goal is to replace the static HTML grid with the integrated `<CalendarComponent />` (powered by `@fullcalendar/react`), enabling full interactive Month, Week, and Day calendar views.

---

## 2. Technical Architecture & Component Changes

### 2.1 View Controls & FullCalendar API Integration
- **View Modes:**
  - `dayGridMonth`: Month grid (30/31 days).
  - `timeGridWeek`: 7-day hourly grid.
  - `timeGridDay`: 1-day hourly detailed view.
- **View Switcher Buttons:**
  - Clicking "Tháng" -> `handleViewChange('dayGridMonth')` -> calls `calendarRef.current.getApi().changeView('dayGridMonth')`.
  - Clicking "Tuần" -> `handleViewChange('timeGridWeek')` -> calls `calendarRef.current.getApi().changeView('timeGridWeek')`.
  - Clicking "Ngày" -> `handleViewChange('timeGridDay')` -> calls `calendarRef.current.getApi().changeView('timeGridDay')`.
- **Date Navigation Controls:**
  - **Today ("Hôm nay"):** Calls `calendarRef.current.getApi().today()`.
  - **Previous ("<"):** Calls `calendarRef.current.getApi().prev()`.
  - **Next (">"):** Calls `calendarRef.current.getApi().next()`.
- **Title & Mini-Calendar Sync:**
  - FullCalendar `datesSet` callback updates the top title string (`calendarTitle`) and current view start date.
  - Selecting a date in the left mini-calendar invokes `calendarRef.current.getApi().gotoDate(selectedDate)`.

### 2.2 `<CalendarComponent />` Props & Configuration
Replace the custom HTML table block with:
```tsx
<CalendarComponent
  ref={calendarRef}
  initialView={activeView}
  headerToolbar={false}
  events={fetchCalendarEvents}
  editable={true}
  eventDrop={handleEventDrop}
  eventClick={handleEventClick}
  eventContent={renderEventContent}
  datesSet={handleDatesSet}
  height="100%"
/>
```

### 2.3 Event Card Rendering & Custom Badges
- **Single Event Card:** Displays social icon (Facebook / Instagram / Threads), scheduled time, title snippet, status pill (`pending`, `posted`, `failed`, `cancelled`), and Golden Hour badge if applicable.
- **Multiple Events (Grouped):** Displays stacked layer badge with count.

### 2.4 Platform Filter Integration
- Filter buttons for Facebook, Instagram, Threads call `clearCache()` and `calendarRef.current?.getApi()?.refetchEvents()` so events re-fetch matching selected channels.

---

## 3. Verification Plan
1. Test switching between **Tháng** (Month), **Tuần** (Week), and **Ngày** (Day) views.
2. Test navigation buttons (**Hôm nay**, **<**, **>**) across all three view modes.
3. Test selecting dates on the mini-calendar.
4. Verify Drag & Drop rescheduling modal functionality in all views.
5. Verify platform filters (Facebook, Instagram, Threads).

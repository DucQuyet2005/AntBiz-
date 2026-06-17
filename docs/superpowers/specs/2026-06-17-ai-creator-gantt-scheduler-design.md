# Spec: 2D PostLab-Style Calendar Scheduler in AICreator Step 3

This document details the design and specification for implementing a new Step 3 inside the AI Creator wizard matching the PostLab 2D grid calendar scheduling system.

---

## 1. Goal Description

Implement a 2D calendar scheduling grid for Step 3 of the AI Creator wizard (`AiCreatorView.tsx`):
1. **7-Day Columns Layout**: Display Thứ hai (Monday) to Chủ nhật (Sunday) as columns, matching the PostLab screenshot.
2. **Hourly Rows Layout**: Display publication slots representing hours from 16:00 to 23:00 as rows.
3. **Week Tabs**: Allow selecting Week 1, Week 2, or Week 3 via tabs at the top to cover the 3-week requirement.
4. **Independent 2D Drag & Drop**: Facebook and Threads active pills are rendered in full color and can be dragged horizontally (shifts day) and vertically (shifts hour) independently.
5. **Collision Detection**: Pre-existing posts are displayed in grayscale matching the PostLab layout. Active pills cannot snap onto occupied cells; dragging onto a blocked cell snaps the pill back to its previous position and displays a conflict error message.
6. **Bidirectional Bindings**: Changing date/time pickers in the Left Column moves the active pills on the 2D grid, and dragging the pills on the grid updates the pickers.

---

## 2. Component Integration details

### Step Wizard State
We will update the state in `AiCreatorView.tsx`:
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1);
const [activeWeek, setActiveWeek] = useState<0 | 1 | 2>(0); // Week 1, 2, 3
const [facebookDate, setFacebookDate] = useState<string>("2026-06-17");
const [facebookTime, setFacebookTime] = useState<string>("20:00");
const [threadsDate, setThreadsDate] = useState<string>("2026-06-18");
const [threadsTime, setThreadsTime] = useState<string>("18:00");
```

---

## 3. Step 3 UI/UX Specifications

### Layout Structure
Inside Step 3, we show:
- **Left Column (width: col-span-4)**:
  - Separate Facebook and Threads date & time picker blocks.
  - Conflict warning text flashes red in case of blocked cell drops.
- **Right Column (width: col-span-8)**:
  - **Week Selection Tabs**: "Week 1", "Week 2", "Week 3" to toggle date domains.
  - **2D Calendar Board**:
    - **Header Row**: 8 columns template: Empty (80px), Mon, Tue, Wed, Thu, Fri, Sat, Sun.
    - **Time Grid Rows**: 8 rows of height 70px.
    - **Pre-existing Gray Cards**: Placed in cells (e.g. Wednesday 16:00, Saturday 20:00) using absolute offset mapping.
    - **Colored Active Cards**: Absolutely positioned on the active week grid cells, responsive, and draggable in both X and Y directions.

---

## 4. Verification Plan

- Drag pills horizontally and check that date updates in the inputs.
- Drag pills vertically and check that hour updates in the inputs.
- Try dragging onto Tuesday 18:00 (blocked cell) and check that the card bounces back to its original slot and flashes an error.



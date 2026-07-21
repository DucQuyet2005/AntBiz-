# Instagram Performance Collection & Golden Hours Analysis Design Specification

## Overview
This document specifies the technical design for automating Instagram post performance data collection and analyzing optimal posting times ("Golden Hours") for Instagram within the AntBiz platform. 

The design ensures strict modularity and boundary separation to allow team members working on other social platforms (Facebook, Threads) to work simultaneously without Git merge conflicts.

---

## 1. System Architecture & Boundaries

```
┌───────────────────────────────────────────────────────────────────┐
│                    Instagram Graph API v19.0                      │
└────────────────────────────────0──────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    Public Metrics Endpoint            Insights Endpoint
   (like_count, reply_count)        (saved, shares, reach, impressions)
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
         ┌──────────────────────────────────────────────┐
         │     InstagramPerformanceCollector            │
         │ (backend/modules/post-performance/...)       │
         └───────────────────────┬──────────────────────┘
                                 ▼
         ┌──────────────────────────────────────────────┐
         │     Supabase PostPerformanceRepository       │
         │         (stores to post_interactions)        │
         └───────────────────────┬──────────────────────┘
                                 ▼
         ┌──────────────────────────────────────────────┐
         │      InstagramGoldenHoursCalculator          │
         │   (Computes 7x24 ER grid & top recommendation)│
         └───────────────────────┬──────────────────────┘
                                 ▼
         ┌──────────────────────────────────────────────┐
         │         InstagramGoldenHoursCard             │
         │   (Frontend UI Card in Reports View)         │
         └──────────────────────────────────────────────┘
```

---

## 2. Instagram Metrics Collection

### 2.1 Metrics Captured
For each posted Instagram media item (`platform = 'instagram'` in `scheduled_posts`), the collector fetches:
1. **Public Metrics**:
   - `likes`: `like_count`
   - `comments`: `comments_count`
2. **Insights Metrics**:
   - `saved`: Number of times post was saved
   - `shares`: Number of shares / DMs
   - `reach`: Unique accounts reached
   - `impressions`: Total visual impressions

### 2.2 Dual Trigger Strategy (Hybrid Sync)
- **Background VPS Scheduler**: Runs every 6 hours via `lib/scheduler/scheduler.ts`, iterating through recent posted Instagram items and syncing metrics to `post_interactions`.
- **On-Demand UI Sync**: Triggered when the user clicks "Đồng bộ ngay" on the Reports dashboard via `POST /api/reports/sync?platform=instagram`. Cooldown threshold: 60 seconds per user.

---

## 3. Instagram Golden Hours Calculation

### 3.1 Weighted Engagement Rate Formula
$$\text{ER (\%)} = \frac{\text{Likes} + \text{Comments} + (\text{Saved} \times 2) + (\text{Shares} \times 1.5)}{\text{Reach}} \times 100$$

### 3.2 7x24 Matrix Aggregation
- Grid: Day of Week (0-6) x Hour of Day (0-23).
- Output: List of slots sorted by average engagement rate.
- Top 3 slots highlighted as "Optimal Posting Windows".
- Automated text recommendation generator providing actionable advice for Marketers.

---

## 4. File Ownership & Isolation Matrix

| Layer | Dedicated File | Role |
| :--- | :--- | :--- |
| Collector | `backend/modules/post-performance/instagram-performance-collector.ts` | Instagram Graph API caller |
| Analytics | `backend/modules/post-performance/instagram-golden-hours.ts` | Golden Hour ER Matrix algorithm |
| API Route | `app/api/reports/golden-hours/route.ts` | Next.js thin route adapter |
| UI Component | `components/views/reports/InstagramGoldenHoursCard.tsx` | Visual card with AI recommendation |

---

## 5. Security & Rate Limiting
- Handles Graph API Rate Limit response codes (`17`, `32`, `613`, `429`).
- Uses service role / user-scoped authenticated clients for Supabase database access.

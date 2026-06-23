# Spec: Global Search Design Specification

## Goal
As a Marketer, I want a global search bar in the header to search simultaneously for original articles, captions, and prompts by keyword. This avoids having to go into each page individually when searching for content.

## User Review Required
> [!IMPORTANT]
> - **Database Changes**: No database migrations or schema modifications will be performed. Search queries will run inline `.or()` and `.ilike()` filters using the existing Postgres tables.
> - **Performance**: By limiting search results to 20 items per category and debouncing the user's keystrokes by 300ms, database load will be minimal.

## Proposed Changes

### 1. API: Multi-Entity Search Route
#### [NEW] [route.ts](file:///d:/Web/AntBiz-/app/api/search/route.ts)
- **Method**: `GET /api/search?q=keyword`
- **Authentication**: Requires a valid user session with `admin`, `marketer_full`, or `marketer_content` role.
- **Search Logic**:
  - Run 3 queries in parallel using `Promise.all`:
    - **Articles**:
      ```ts
      supabase.from('articles')
        .select('id, title, description, crawled_at')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%,full_text.ilike.%${q}%`)
        .limit(20)
      ```
    - **Captions**:q
      ```ts
      supabase.from('captions')
        .select('id, platform, ai_content, edited_content, article_id, articles(id, title)')
        .or(`edited_content.ilike.%${q}%,ai_content.ilike.%${q}%`)
        .limit(20)
      ```
    - **Prompts**:
      ```ts
      let query = supabase.from('prompts')
        .select('id, name, content, platform, tags')
        .eq('is_deleted', false)
        .or(`name.ilike.%${q}%,content.ilike.%${q}%`);
      if (role !== 'admin' && user) {
        query = query.eq('created_by', user.id);
      }
      query.limit(20)
      ```
- **Error Handling**: Standard try-catch block returning a 500 error on database failure, or 400 error on empty or invalid search keywords.

---

### 2. UI: Header Search Bar Modification
#### [MODIFY] [Header.tsx](file:///d:/Web/AntBiz-/components/Header.tsx)
- Integrate state management for:
  - `searchQuery` (string)
  - `suggestions` (JSON response from `/api/search`)
  - `isOpen` (boolean to show/hide the dropdown overlay)
  - `isLoading` (boolean for search progress)
- Implement a 300ms debounce when `searchQuery` changes.
- If `searchQuery` is empty, hide suggestions.
- Render a suggestions dropdown panel below the search input:
  - Display matched items grouped by type: **Articles**, **Captions**, **Prompts** (max 3 items per group to save vertical space).
  - Clicking any item navigates to its detail page.
  - Pressing `Enter` or clicking the "See all results..." button at the bottom navigates to `/search?q=keyword` and closes the dropdown.
  - Implement a click-outside handler to close the dropdown.

---

### 3. UI: Dedicated Search Page
#### [NEW] [page.tsx](file:///d:/Web/AntBiz-/app/(dashboard)/search/page.tsx)
- Serves as the page component for `/search`.
- Imports and returns the `SearchView` component.

#### [NEW] [SearchView.tsx](file:///d:/Web/AntBiz-/components/views/SearchView.tsx)
- Fetches full search results from `/api/search?q=keyword`.
- Displays results in tabs:
  - **All (Tất cả)**: Mixed list/grid of articles, captions, and prompts.
  - **Articles (Bài viết gốc)**: List of matching source articles.
  - **Captions (Captions)**: List of matching captions with platform badges and source article title.
  - **Prompts (Prompts)**: List of matching prompts with platform badges and tags.
- Includes a loading spinner and an empty state illustration with search advice if no results are found.
- Supports tab switches with Framer Motion slide-in animations.

---

### 4. Inter-Component Navigation Logic
- **Article detail**: Navigates to `/archive/[article_id]`.
- **Caption detail**: Navigates to `/archive/[article_id]?captionId=[caption_id]`.
  - Let's check and highlight/scroll to the matching caption in `ArticleDetailView.tsx`.
- **Prompt detail**: Navigates to `/prompts?promptId=[prompt_id]`.
  - Modify `PromptsView.tsx` to read the `promptId` query parameter on mount and automatically open the edit modal for that prompt.

#### [MODIFY] [PromptsView.tsx](file:///d:/Web/AntBiz-/components/views/PromptsView.tsx)
- Read `promptId` query parameter from the URL.
- If present, fetch or locate the prompt in the list and call `openEditModal(prompt)`.

#### [MODIFY] [ArticleDetailView.tsx](file:///d:/Web/AntBiz-/components/views/ArticleDetailView.tsx)
- Read `captionId` query parameter from the URL.
- Scroll to and briefly highlight/flash the matching caption card.

---

### 5. Translations
#### [MODIFY] [translations.ts](file:///d:/Web/AntBiz-/lib/i18n/translations.ts)
Add translated strings under the `search` key in both `vi` and `en`:
- `vi.search`:
  - `title`: "Tìm kiếm toàn cục"
  - `subtitle`: "Tìm kiếm đồng thời bài viết gốc, caption và prompt"
  - `placeholder`: "Nhập từ khóa cần tìm..."
  - `all`: "Tất cả"
  - `articles`: "Bài viết gốc"
  - `captions`: "Captions"
  - `prompts`: "Prompts"
  - `noResults`: "Không tìm thấy kết quả phù hợp"
  - `tryChanging`: "Thử thay đổi từ khóa tìm kiếm."
  - `foundResults`: "Tìm thấy {count} kết quả"
  - `articleResult`: "Bài viết"
  - `captionResult`: "Caption"
  - `promptResult`: "Prompt"
  - `seeAll`: "Xem tất cả kết quả..."
- `en.search`:
  - `title`: "Global Search"
  - `subtitle`: "Simultaneously search for original articles, captions, and prompts"
  - `placeholder`: "Enter search keywords..."
  - `all`: "All"
  - `articles`: "Original Articles"
  - `captions`: "Captions"
  - `prompts`: "Prompts"
  - `noResults`: "No matching results found"
  - `tryChanging`: "Try changing your search keywords."
  - `foundResults`: "Found {count} results"
  - `articleResult`: "Article"
  - `captionResult`: "Caption"
  - `promptResult`: "Prompt"
  - `seeAll`: "See all results..."

---

## Verification Plan

### Automated Tests
Run Vitest on a new test suite:
- `npm run test __tests__/api/search.test.ts`
We will write unit tests verifying:
1. `GET /api/search` with no query parameters returns 400.
2. `GET /api/search` unauthorized returns 401.
3. `GET /api/search` returns filtered lists for non-admin users.
4. `GET /api/search` returns the correct response schema for a valid keyword search.

### Manual Verification
1. Open the browser local environment.
2. Type a keyword like "tet" or "gocnhinmoi" in the header search input.
3. Verify that the suggestion dropdown appears showing matching results.
4. Click on an article, caption, or prompt in the dropdown and verify redirection.
5. Press `Enter` in the search input and verify redirection to `/search?q=keyword`.
6. Test tab switching on the `/search` page.

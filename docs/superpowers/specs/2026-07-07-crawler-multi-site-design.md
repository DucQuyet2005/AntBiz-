# Design Spec: Multi-Site & Multi-Layout News Crawler

This document describes the design for detecting page types and layouts across Tuoi Tre (`tuoitre.vn`), Dan Tri (`dantri.com.vn`), and Goc Nhin Moi (`gocnhinmoi.com.vn`), and extracting their contents or listing links accordingly.

## 1. Objectives

- Automatically recognize which of the three websites a URL belongs to.
- Classify the URL into two main page types: `ARTICLE` or `LISTING`.
- If `ARTICLE`, identify the layout sub-type (Standard, Video, Photo, Long-form, Podcast, Infographic, etc.) to choose the appropriate selectors.
- If `LISTING`, extract child article links and return them as a list with a warning/indicator, rather than raising an error, to support automated ingestion pipelines.
- Integrate seamlessly into the existing TypeScript Playwright/Firecrawl crawler pipeline without breaking Goc Nhin Moi's existing parsing.

## 2. Layout & Page Type Detection Strategy

The crawler uses a combination of **URL pattern regexes** and **DOM selector checks** to classify pages.

### Page Type: LISTING vs ARTICLE

```typescript
export type PageType = 'ARTICLE' | 'LISTING';

export type ArticleLayout =
  | 'standard'
  | 'video'
  | 'photo'
  | 'dmagazine' // Dan Tri longform
  | 'megastory' // Tuoi Tre longform
  | 'podcast'
  | 'infographic'
  | 'tamdiem'    // Dan Tri editorial
  | 'bandoc'     // Dan Tri reader submissions
  | 'sub_publication' // cuoi.tuoitre.vn, etc.
  | 'gocnhinmoi_standard'
  | 'gocnhinmoi_spotlight';
```

### Detection Logic

1. **Domain Detection**: Extract hostname from URL to decide if it is `dantri.com.vn`, `tuoitre.vn`, or `gocnhinmoi.com.vn`.
2. **Page Type & Layout Classification**:
   - **Dan Tri**:
     - `LISTING`:
       - URL matches `/event/` or `/chu-de/` or `/tag/` or ends with an index page (e.g. without `.htm`).
       - DOM check: Has listing containers like `.list-article`, `.event-page`, `.tag-page` and no single article title.
     - `ARTICLE` (sub-types):
       - `video`: URL contains `/dt360/` or `/video/` or DOM has `.video-player` or `.dt-video`.
       - `photo`: URL contains `/photo-news` or `/photo-story` or DOM contains `.photo-story`, `.photo-news` or tag `.e-magazine__photo`.
       - `dmagazine`: URL contains `/dmagazine` or DOM contains logo "DMagazine" or container `.dmagazine`.
       - `tamdiem`: URL contains `/tam-diem` or DOM contains `.tam-diem` / editorial classes.
       - `bandoc`: URL contains `/ban-doc`.
       - `infographic`: URL contains `/infographic` or `/interactive`.
       - `standard`: Default article layout if it has `.htm` and doesn't match above.
   - **Tuoi Tre**:
     - `LISTING`:
       - URL matches `/tac-gia/` or ends with `-e\d+\.htm` (Event/Chủ đề).
       - URL ends with category paths (no trailing `{slug}-{id}.htm`).
     - `ARTICLE` (sub-types):
       - `video`: URL contains `/video/` or `video.tuoitre.vn`.
       - `podcast`: Domain starts with `podcast.tuoitre.vn` or path has `/podcast/`.
       - `photo`: Path has `/photo/` or matches `/photo.htm`.
       - `infographic`: Path has `/infographic/` or matches `/infographic.htm`.
       - `megastory`: Path has `/megastory/` or matches `/megastory.htm`.
       - `sub_publication`: Host is `cuoi.tuoitre.vn`, `cuoituan.tuoitre.vn`, or `news.tuoitre.vn`.
       - `standard`: Path matches `/{slug}-{id}.htm` where ID is 18 digits.
   - **Goc Nhin Moi**:
     - Kept as-is. Check Goc Nhin Moi specific DOM structures (e.g. `#html_content` vs spotlight layouts).

---

## 3. Data Extraction Parsers

### Article Parsers
For each supported site, a set of target selectors will be queried to populate the article fields:
- **Title**: Selectors like `h1`, `h1.title-detail`, `h1.article-title`, `.dmagazine-title`, etc.
- **Sapo/Description**: Selectors like `.sapo`, `.article-sapo`, `.description`, `.dmagazine-sapo`.
- **Author**: Selectors like `.author`, `.article-author`, `.dmagazine-author`.
- **Published Date**: Selectors like `.date`, `.time`, `.article-time`, `.dmagazine-time`.
- **Views**: Extract if available (often dynamic, via class or json-ld).
- **Body Blocks**: Iteratively traverse children elements of the content wrapper (e.g., `.sing-content`, `.fck`, `.dmagazine-content`, `.detail-content`). Map paragraphs (`p`), headings (`h2`/`h3`), and images (`img` inside photo-block structures with their matching caption siblings) into a flat array of `BodyBlock` elements.

### Listing link extractor
If classified as `LISTING`:
- Scan the DOM for all `<a>` tags.
- Filter URLs that match the known article patterns of the corresponding domain.
- Lọc trùng, extract the text/title within the link if available.
- Return payload:
  ```json
  {
    "type": "LISTING",
    "url": "original_listing_url",
    "extractedUrls": [
      { "url": "child_url_1", "title": "Child title 1" },
      { "url": "child_url_2", "title": "Child title 2" }
    ],
    "warning": "Trang này là danh sách, đã trích xuất N liên kết con"
  }
  ```

---

## 4. Integration Plan

- We will modify `lib/crawler/preprocess.ts` to include:
  1. `detectPageType(url, html)`
  2. Site-specific parsers: `parseDantri(url, $, pageType, layout)`, `parseTuoitre(url, $, pageType, layout)`.
- We will modify the API route `app/api/scrape/route.ts` to handle the `LISTING` response type gracefully (e.g., return the warning and the extracted URLs list without throwing a database error).

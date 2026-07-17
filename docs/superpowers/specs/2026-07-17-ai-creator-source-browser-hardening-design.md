# AI Creator Source Browser Hardening Design

## Goal

Make the embedded news-source browser in AI Creator safe and reliable from site navigation through Article ingestion, while preserving the newly delivered iframe-based user experience.

## Scope

This change covers:

- The embedded source browser in `Step2Article`.
- URL-change messages emitted by `/api/proxy`.
- The Creator Flow URL-ingestion workflow.
- Frontend handling of Article versus Listing responses.
- Tests and lint failures introduced by the new UI merge.

Crawler extraction algorithms and database schemas are unchanged.

## Architecture

The existing dependency direction remains:

```text
Step2Article
  -> frontend/modules/creator-flow
      -> GET /api/scrape
          -> backend/modules/article-ingestion
              -> crawler + preprocess + repository
```

`Step2Article` owns browser presentation and user-facing feedback. Creator Flow owns ingestion state and HTTP response normalization. Article Ingestion remains authoritative for URL safety, page classification, preprocessing, and persistence.

## Embedded Browser Security

The iframe keeps script execution for compatibility with the supported news sites but drops `allow-same-origin`. Proxied third-party content therefore runs in an opaque sandbox origin and cannot share the AntBiz origin with its parent page.

The injected proxy script sends URL updates to the computed AntBiz parent origin instead of `*`.

The parent accepts a URL update only when:

- `event.source` is the current iframe window.
- The payload has the expected `URL_CHANGE` shape.
- The URL uses HTTPS.
- Its hostname is the selected source hostname or one of its subdomains.

The click interceptor proxies only URLs in the supported hostname allowlist. Unsupported external links are ignored rather than routed through AntBiz.

## Source Selection Flow

Opening a source card sets both the active source and its base URL directly from the click handler. No effect synchronously derives local state.

The “select this article” action is disabled when:

- The URL is empty or invalid.
- It is outside the selected source hostname.
- Its pathname is the site root.
- A crawl is already running.

Client checks provide immediate feedback only. Backend SSRF protection and page classification remain final.

## Article and Listing Results

`BrowserCreatorFlowClient.ingestUrl` distinguishes Article and Listing transport responses.

- A persisted Article is normalized into the existing `IngestedCreatorArticle` contract.
- A Listing produces a typed Creator Flow error telling the user to navigate to a specific article.
- Non-success HTTP responses preserve the backend’s safe error message when present.

The public creator flow continues to require a persisted `articleId`; crawled content that failed persistence cannot advance the wizard.

## State and Error Handling

Starting a URL crawl clears the previous `articleId` and `articleContext`, then sets `crawlStatus` to `crawling`.

On success:

- Creator Flow stores the new Article ID and context.
- `crawlStatus` becomes `done`.
- The source-browser modal closes.

On failure:

- `crawlStatus` becomes `error`.
- Creator Flow rethrows the typed error to the presentation adapter.
- The modal remains open.
- A user-facing message appears beside the selection controls.

No previous Article may remain eligible after a failed replacement crawl.

## Cleanup

- Remove the unused `MOCK_SITE_ARTICLES` constant.
- Remove unused icon imports.
- Replace the synchronous state-setting effect with an explicit source-open handler.
- Make proxy source tests newline-agnostic.

## Testing

Tests cover:

- Article and Listing response normalization.
- Safe backend error propagation.
- Supported-source URL validation.
- Rejection of root, cross-domain, non-HTTPS, and malformed URLs.
- Proxy script uses the concrete parent origin rather than `*`.
- Proxy click interception enforces the hostname allowlist.
- Iframe sandbox omits `allow-same-origin`.
- Crawl state clears stale Article data and exposes failures.
- Existing Article Ingestion, Creator Flow, proxy middleware, and build contracts remain green.

Verification includes targeted Vitest suites, full lint, typecheck, and production build.

## Non-goals

- Replacing the embedded browser with a URL input.
- Removing all third-party JavaScript from proxied pages.
- Adding new supported news domains.
- Changing crawler extraction rules or Article persistence schema.

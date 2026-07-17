# AI Creator proxy loop prevention

## Goal

Stop the embedded Góc Nhìn Mới article view from repeatedly requesting the
article page and its comments endpoint, while retaining navigation and article
selection in the AI Creator iframe.

## Cause

The injected proxy script currently rewrites every same-origin `fetch` and
`XMLHttpRequest` request through `/api/proxy`.  Góc Nhìn Mới's hydrated Next.js
client issues RSC and comment-data requests during navigation; proxying those
requests changes their origin and response semantics.  The target client then
retries navigation/data loading, producing the observed repeated article and
comments requests.

## Design

The proxy route remains an HTTP adapter.  Its injected script will:

- proxy document navigations that originate from user link clicks;
- leave same-origin programmatic data requests (including RSC and comments)
  directed at the target site, preserving the target application's expected
  request/response semantics;
- keep static assets targeting the target origin;
- report the URL once initially and when the iframe navigation state actually
  changes, rather than on an 800 ms polling interval.

The AI Creator view remains responsible only for displaying the reported URL
and submitting the selected URL to its existing crawl workflow.

## Error handling and safety

The existing authenticated allowlist and SSRF validation remain unchanged.
Malformed URLs continue to fall back to the browser's original request
behaviour.  The change must not expand the list of proxyable hosts.

## Verification

- Add a focused route-level/script-content test for the navigation interceptor
  contract where practical.
- Run the focused test and TypeScript type check.
- Manually confirm opening the supplied article stabilizes after its initial
  article and comments requests, and clicking a new article still updates the
  iframe URL and permits selection.

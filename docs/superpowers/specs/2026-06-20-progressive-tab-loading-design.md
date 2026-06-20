# Progressive Tab Loading and Swipe Design

## Summary

The Home screen will stop waiting for every tournament endpoint before it renders. It will show the stable shell immediately, load the active Knockout tab first, prefetch adjacent tab code and data, and cache successful responses with TanStack Query. Horizontal navigation will behave like a lightweight carousel: the active tab and its immediate neighbors are available for a transform-based swipe, while distant tabs load during idle time.

This design preserves the existing navigation, tab content, API endpoints, selection flow, visual styling, and tournament data contracts.

## Problem

`AppShell` currently starts four independent tournament requests inside one `Promise.all`. The Home content remains in a global loading state until Knockout, Fixtures, Table, and News have all completed. A slow or failed request therefore blocks every tab.

All tab modules are also imported eagerly. The Knockout view is the heaviest screen, and the existing transition briefly keeps both outgoing and incoming screens mounted. Fast repeated navigation can feel unresponsive because a second tab change is ignored while the outgoing screen exists and the defensive transition timer has not completed.

Mock data is not the root cause. The blocking request boundary, eager module loading, duplicate transition rendering, and transition lock are the dominant issues.

## Goals

- Render the Home header and tab navigation immediately after the local participant session is available.
- Prioritize the active Knockout tab without waiting for unrelated endpoints.
- Make an adjacent tab ready before a normal swipe reaches it.
- Keep horizontal swipe motion responsive even when tab data is still loading.
- Avoid a full-screen Home loading state after the shell has rendered.
- Deduplicate requests and reuse cached data when users revisit tabs.
- Support rapid repeated gestures without overshooting, freezing, or firing duplicate requests.
- Preserve vertical page scrolling, reduced-motion behavior, accessibility semantics, API contracts, and current UI styling.

## Non-Goals

- Changing the tournament API response shapes or Supabase schema.
- Adding realtime score subscriptions in this iteration.
- Redesigning Knockout, Fixtures, Table, News, the navbar, or the team-selection flow.
- Persisting the complete query cache across browser restarts.
- Rendering every tab permanently in the DOM.

## Selected Approach

Use a hybrid cache-first strategy with adjacent prefetching.

1. TanStack Query owns tournament request state, caching, deduplication, retries, and background refreshes.
2. Each tab owns only the queries it needs.
3. The current tab and its immediate neighbors are eligible to render in the swipe track.
4. Adjacent tab code and data are prefetched as soon as the active tab settles.
5. Remaining tabs are prefetched during browser idle time.
6. Swipe transforms are driven independently from query state, so loading cannot block motion.

Pure upfront loading was rejected because it preserves the current all-or-nothing delay. Pure on-demand loading was rejected because a quick first visit to a tab would frequently expose a loading state.

## Query Model

The query client will use these query keys and freshness windows:

| Data | Query key | Stale time | Reason |
| --- | --- | ---: | --- |
| Teams | `['tournament', 'teams']` | 24 hours | Team identity and logos rarely change during a session. |
| Knockout | `['tournament', 'knockout']` | 30 seconds | Bracket results may change during live play. |
| Fixtures | `['tournament', 'fixtures']` | 30 seconds | Match status and schedule can change. |
| Table | `['tournament', 'table']` | 30 seconds | Standings are score-dependent. |
| News | `['tournament', 'news']` | 5 minutes | News does not require score-level freshness. |

Successful query data remains in memory for 30 minutes after its final observer unmounts. Queries display cached data while refreshing in the background. Automatic refetch on window focus remains enabled for live tournament data, but background failures do not replace usable cached content.

The participant session remains outside this query migration. Its local-first behavior is already appropriate: a valid local session opens Home immediately while remote verification continues.

## Module Loading

The four tab modules will be split with `React.lazy`. Each module will expose a matching preload function based on the same dynamic import promise so preloading and rendering cannot download separate chunks.

Initial sequence:

1. Load the application shell and Knockout module.
2. Start the Knockout query.
3. Prefetch the Fixtures module and query because it is the right-hand neighbor.
4. During idle time, preload Table and News modules and queries.

When the active tab changes, the new previous and next neighbors receive priority. Hover, focus, pointer-down, or touch-start on a tab button also preloads that destination.

## Swipe and Snap Model

The swipe layer is separate from the data layer.

- The viewport clips horizontal overflow.
- The track uses `translate3d` for finger-following motion and snap animation.
- Transient pointer coordinates and velocity live in refs so every move does not trigger a React render.
- One completed gesture advances at most one tab.
- Distance and velocity thresholds decide whether the track advances or returns to its current tab.
- A new gesture may begin after the previous track settle completes; it is not blocked by query loading.
- Rapid gestures cannot move beyond the first or last tab.
- The active tab button updates when the snap destination is committed.
- Vertical-dominant gestures remain page scrolls and never trigger tab navigation.

Only the active tab and immediate neighbors render in the track. Heavy distant tabs are not mounted. Once a tab leaves the neighbor window, its component may unmount while its query data remains cached.

The carousel viewport follows the measured height of the active slide through `ResizeObserver`. Taller adjacent slides are clipped until they become active, so a short tab does not inherit empty space from Knockout or Table. The height is content-driven rather than fixed and updates when lazy content or images change size.

The existing 360 ms outgoing-tab lock will be removed. A short transform transition will settle the track, while tab-button centering occurs immediately without smooth scrolling. Reduced-motion users get an immediate tab replacement with no transform animation.

## Loading and Error States

The Home header and tab bar never disappear because of a tournament request.

- First load of an unprepared tab: show a panel-local skeleton matching the tab's approximate layout.
- Cached tab with background refresh: keep the existing content visible without a blocking indicator.
- Query failure with cached data: keep cached content and expose a small retry status inside the tab.
- Query failure without cached data: show a tab-local error and retry button.
- Neighbor prefetch failure: do not interrupt the active tab; retry when the user selects that destination.

Each tab has an independent error boundary at the query state level. A News failure cannot block Knockout, Fixtures, or Table.

## Component Boundaries

- `apps/web/src/main.tsx`: create and provide the shared query client.
- `apps/web/src/lib/queryClient.ts`: hold query defaults and shared cache policy.
- `apps/web/src/lib/tournamentQueries.ts`: define query keys, query options, and tab prefetch helpers.
- `apps/web/src/components/layout/tabModules.ts`: centralize lazy imports and module preload functions.
- `apps/web/src/components/home/FixtureFilters.tsx`: keep the small Fixtures toolbar eager while the heavier fixture list remains in a lazy chunk.
- `apps/web/src/hooks/useTabSwipe.ts`: own pointer tracking, dominant-axis detection, velocity, clamping, and snap destination.
- `apps/web/src/components/layout/TabCarousel.tsx`: render the active and adjacent tab screens and apply transforms.
- `apps/web/src/components/layout/AppShell.tsx`: retain shell controls and active-tab coordination, while removing the global dashboard `Promise.all` and outgoing-tab timer.
- Existing tab components: read their own query state through small container components while preserving presentational props and markup.
- `apps/web/src/styles.css`: replace outgoing/incoming keyframe layers with a transform track, local skeleton styles, and reduced-motion overrides.

## Accessibility

- Existing tab roles, names, `aria-selected`, and keyboard activation remain intact.
- Only the active panel is keyboard-accessible; neighbor panels are `aria-hidden` and inert.
- Focus remains on the selected tab button after keyboard navigation.
- Skeletons are not announced repeatedly. The active panel uses a concise status message only when no usable data exists.
- Reduced-motion preferences disable track animation and animated tab centering.

## Testing Strategy

Unit and integration tests will verify:

- Home shell renders before every tournament request resolves.
- Knockout becomes usable without Fixtures, Table, or News completing.
- adjacent tabs are prefetched after the active tab settles;
- duplicate prefetch and selection requests are deduplicated;
- cached content remains visible during background refresh;
- one gesture advances at most one tab;
- vertical gestures do not change tabs;
- rapid sequential gestures never overshoot;
- query loading does not block track movement;
- tab-local error and retry states do not affect other tabs;
- reduced motion replaces screens immediately;
- production chunks are split by tab.

Mobile browser QA will test normal and throttled network conditions, rapid left/right swipes, vertical scrolling inside long Knockout content, tab-button selection, cache revisits, and first visits to distant tabs.

## Success Criteria

- Home shell and navigation render without waiting for all tournament endpoints.
- A slow News request cannot delay Knockout.
- Revisiting a loaded tab shows content immediately.
- Normal adjacent swipes display no full-page loader.
- A fast gesture advances no more than one tab and settles without visible overshoot.
- Vertical scrolling does not trigger tab changes.
- No duplicate request is sent for the same query while an existing request is in flight.
- Existing tests continue to pass, and new loading and swipe tests pass on desktop and mobile viewport simulations.
- Production build succeeds with separate lazy chunks for tab modules.

## Rollout

Implementation will be delivered in small commits: query foundation, per-tab queries, module preloading, carousel gesture hook, carousel rendering, local loading/error states, and final performance QA. The old transition implementation will remain until the new query boundaries are proven, then it will be replaced in one focused task so regressions are easy to isolate.

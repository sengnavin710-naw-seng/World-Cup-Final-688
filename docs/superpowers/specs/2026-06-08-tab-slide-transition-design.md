# Tab Slide Transition Design

## Goal

Replace the current enter-only tab animation with a coordinated screen transition:

- the current tab screen slides out;
- the destination tab screen slides in at the same time;
- direction follows the tab order;
- the header and primary tab navigation remain stationary.

The transition must work for tab-button clicks and intentional horizontal swipes without reintroducing accidental tab changes during vertical scrolling.

## Scope

The animated screen contains all content owned by the active tab:

- Fixtures: filter toolbar and fixtures list;
- Table: Short/Full and scope controls plus standings;
- Knockout: knockout content;
- News: news content.

The following elements remain outside the animated screen:

- application header;
- primary `Knockout / Fixtures / Table / News` navigation;
- confirmation dialogs and global feedback.

No tournament data, display-name behavior, API contract, or business rule changes are included.

## Recommended Interaction

### Forward navigation

Moving to a tab on the right, such as Knockout to Fixtures:

- the current screen slides left from `translateX(0)` to a negative offset;
- the destination screen slides in from the right;
- both animations run for 280 milliseconds.

### Backward navigation

Moving to a tab on the left, such as Table to Fixtures:

- the current screen slides right;
- the destination screen slides in from the left;
- both animations run for 280 milliseconds.

### During transition

- Ignore additional primary-tab clicks and horizontal swipe completions.
- Keep both screens mounted until the exit animation finishes.
- Do not reset the destination tab's local controls.
- Do not allow the temporary layers to create a page-level horizontal scrollbar.

### Vertical scrolling and gestures

A gesture may change tabs only when:

- horizontal movement is at least 48 pixels; and
- horizontal movement is greater than vertical movement.

Vertical scrolling with horizontal drift must remain within the active tab. Nested horizontal views, including the mobile knockout bracket and Full standings table, keep ownership of their own touch gestures.

## Architecture

`AppShell` will separate the selected tab from the rendered transition state.

The transition state contains:

- `activeTab`: the committed destination tab;
- `outgoingTab`: the previous tab while it exits, otherwise `null`;
- `direction`: `left` for forward navigation and `right` for backward navigation;
- `isTransitioning`: whether the 280 millisecond transition is active.

A single tab-screen rendering function will produce the toolbar and content for a supplied tab. This prevents the outgoing and incoming layers from using different layout rules.

When navigation begins:

1. Ignore the request if it targets the current tab or a transition is active.
2. Store the current tab as `outgoingTab`.
3. Calculate direction from tab indexes.
4. Commit the destination as `activeTab`.
5. Render outgoing and incoming layers together.
6. Clear `outgoingTab` after animation completion.

Use the animation end event as the primary cleanup signal. A timeout matching the animation duration may be used only as a defensive fallback if needed.

## DOM Structure

The ready dashboard will use one stable transition viewport:

```text
tab-transition-viewport
  tab-transition-stage
    tab-screen outgoing
      tab-specific toolbar
      tab panel/content
    tab-screen incoming
      tab-specific toolbar
      tab panel/content
```

The viewport clips horizontal movement with `overflow-x: hidden`. The outgoing layer is absolutely positioned during transition so it does not double the document height. The incoming layer remains responsible for the final layout height.

The screen wrapper must use `min-width: 0` so Fixtures and Table responsive layouts continue to shrink correctly.

## Animation

Four animation roles are required:

- incoming from right;
- incoming from left;
- outgoing to left;
- outgoing to right.

Use transforms and opacity only:

- transform distance: approximately 36 pixels on desktop and mobile;
- opacity: `0.82` at the far edge to `1` at rest;
- duration: `280ms`;
- easing: `cubic-bezier(0.22, 1, 0.36, 1)`.

Animating a modest offset instead of the full viewport reduces motion while preserving a clear screen-slide relationship.

## Reduced Motion

Under `@media (prefers-reduced-motion: reduce)`:

- disable tab-screen animation;
- complete the tab change immediately;
- do not keep an outgoing visual layer after the state update.

The feature remains functionally identical without motion.

## Accessibility

- Preserve the current tab roles and `aria-selected` values.
- Focus remains on the clicked tab button.
- Swipe navigation does not force focus to move.
- Outgoing content receives `aria-hidden="true"` while it is visual-only.
- Outgoing controls must not be keyboard- or pointer-interactive.

## Error and Interruption Handling

- `touchcancel` clears the stored gesture start.
- Repeated navigation during transition is ignored.
- Unmounting the shell clears any defensive cleanup timer.
- A failed data request continues to use the existing loading/error states and does not enter a tab transition.

## Testing

Component tests will verify:

- forward navigation renders incoming-right and outgoing-left layers;
- backward navigation renders incoming-left and outgoing-right layers;
- outgoing content remains mounted until animation completion;
- animation completion removes the outgoing layer;
- repeated tab requests during transition are ignored;
- vertical gestures with horizontal drift do not change tabs;
- primarily horizontal gestures still change tabs;
- Fixtures and Table toolbars are inside their animated tab screens;
- outgoing screens are hidden from accessibility and interaction.

Style tests will verify:

- the transition viewport clips horizontal overflow;
- the four animation roles exist;
- transition duration is 280 milliseconds;
- reduced-motion rules disable the animations.

Run the complete web test suite, TypeScript lint, and production build after implementation.

## Success Criteria

- Changing tabs visibly moves the old and new screens together.
- Direction matches the relative position of the destination tab.
- Header and main tab navigation never move.
- Rapid vertical scrolling never changes tabs.
- Nested horizontal content remains usable.
- No horizontal page scrollbar, overlap, or duplicate interactive controls appear.
- The behavior is responsive on small and large screens.


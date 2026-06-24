# Compact Home Tabs And Knockout Surface Design

## Goal

Reduce the unused vertical space below the Home tab navigation across Knockout, Fixtures, Table, and News on mobile. Restyle the mobile Knockout content as one white container while preserving dark match cards, the existing white-and-blue brand theme, and all current data and gesture behavior.

## Scope

- The spacing change targets mobile layouts at widths up to 760px, matching the supplied phone references.
- Knockout receives the surface and connector-motion changes described below.
- Fixtures, Table, and News keep their current controls, cards, typography, data, and colors. Only their first-content spacing below the Home tab navigation changes.
- Desktop bracket layout and desktop card styling remain unchanged.
- Existing tab swipe, Knockout round swipe, snapping thresholds, scroll positions, dynamic bracket height, and API behavior remain unchanged.

## Shared Tab Spacing

- Use one mobile spacing rule for all four Home tabs.
- The distance from the bottom edge of the Home tab navigation to the first visible control or content surface is 8px.
- Knockout begins with its unified container.
- Fixtures begins with its filter toolbar.
- Table begins with its Short/Full and Overall/Home/Away toolbar.
- News begins with its first news card.
- Remove competing negative margins or panel padding that make one tab start higher or lower than another.
- Preserve the existing tab-carousel height measurement and 300ms tab transition so switching tabs does not jump.

## Mobile Knockout Container

- Status controls, round controls, SVG connectors, and match cards live inside the existing `.knockout-mobile` DOM boundary so they behave as one surface.
- The unified surface uses a white background, a `1px` light-blue border based on the existing `--line` token, a `10px` corner radius, and no dark outer background.
- Keep 8px inner side spacing for the status controls, round controls, and the first snapped card edge.
- Replace the black backgrounds on the status strip, round strip, and bracket scroller with white while retaining their existing scrolling behavior.
- Keep match cards dark. Card sizes, internal spacing, team labels, dates, Final/Bronze-final treatment, and owner display names do not change in this work.
- Keep connector strokes blue using the current branded blue family.

## Controls

- `As it stands` and `Confirmed` remain above the round selector.
- Round buttons retain their current labels and horizontal scrolling.
- Selected status and round controls use `#00abff` with white text.
- Unselected controls use a pale blue or white surface, dark text, and the existing light-blue border so they remain readable against the white container.
- Control dimensions and hit areas remain unchanged unless a one-pixel border adjustment is required to preserve the current height.

## Connector Fade Behavior

- Replace bare mobile SVG path strings with connector records containing the path plus the source and target round indexes.
- Each connector opacity is derived from the same layout progress that determines the opacity of its connected cards.
- A connector must not be more visible than the least-visible card group it connects. Use the minimum relevant card opacity as the connector opacity.
- As the user swipes away from a round, connectors attached to the outgoing cards fade at exactly the same progress as those cards and reach zero opacity together.
- Connectors associated with visible incoming cards remain or become visible according to those cards' opacity. No separate timer, CSS transition, or delayed animation is introduced.
- Vertical scrolling does not alter connector opacity.
- Reduced-motion behavior continues to follow the existing application setting.

## Architecture

- `AppShell` owns the common 8px mobile gap below the Home navigation and tab-specific toolbar placement.
- `KnockoutTab` continues to own round gesture state and bracket layout calculation.
- `getMobileConnectorPaths` returns connector metadata rather than only SVG path strings.
- `getMobileBracketLayout` calculates connector opacity from the positioned source and target card groups after card opacity has been calculated.
- The SVG renderer applies the calculated opacity to each path. Connector geometry is unchanged.
- CSS changes remain scoped to Home tab spacing and mobile Knockout selectors.

## Accessibility

- Keep the existing tab, status, and round semantics (`role`, `aria-selected`, and `aria-pressed`).
- Dark cards must retain readable contrast against their white surroundings.
- Selected blue controls use white text with sufficient contrast.
- The white container must not introduce horizontal clipping, visible scrollbars, or reduced touch targets.

## Testing

- Add CSS contract tests confirming an 8px mobile gap for all Home tab slides.
- Verify Fixtures, Table, and News retain their existing internal components and no new wrapper changes their data flow.
- Verify the mobile Knockout surface, status strip, round strip, and scroller use the white surface while match cards remain dark.
- Add layout tests proving connector records identify their source and target rounds.
- During an in-progress round swipe, assert outgoing connector opacity matches outgoing card opacity.
- At the settled destination round, assert connectors attached only to hidden outgoing cards have zero opacity.
- Retain all current Knockout snap, fast-swipe, vertical-scroll, Final/Bronze-final, and dynamic-height tests.
- Run focused component tests, the complete web test suite, TypeScript checks, and a production build.
- Visually verify Knockout, Fixtures, Table, and News at a phone-sized viewport after implementation.

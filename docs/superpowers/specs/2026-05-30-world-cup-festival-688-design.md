# World Cup Festival 688 Design

## Overview

World Cup Festival 688 is a company activity web app for World Cup 2026 team selection and tournament viewing. Each participant uses one device-bound identity, chooses one national team from the full set of 48 teams, and then enters a home dashboard centered on tournament information. A team can belong to only one participant at a time.

The first release focuses on:
- a polished selection flow
- device-based participant memory
- shared team ownership rules
- a single dashboard-style home experience
- mock tournament content served through a real backend

The first release does not include:
- account login
- live football APIs
- real notification delivery
- analytics summary cards
- admin tools

## Product Goals

- Make the team selection experience feel clear, fast, and exciting.
- Prevent duplicate ownership of the same national team.
- Remember returning participants on the same device without forcing them to select again.
- Give the company a shared World Cup dashboard that mixes tournament content with company selection visibility.
- Establish a clean technical foundation using React, Node.js, and Supabase so later live-data work does not require a rewrite.

## Tech Direction

The product will use a balanced architecture:

- Frontend: React, Vite, TypeScript
- Backend: Node.js API
- Database: Supabase

Frontend owns presentation, local device memory, and screen flow.
Backend owns trusted business rules, mock tournament APIs, and conflict prevention.
Supabase owns shared participant selection records and current team ownership.

Tournament content such as knockout bracket data, fixtures, standings, and news is mock data in the first release, but it is still served through the backend API rather than hardcoded deeply into the frontend.

## Primary User Flow

### 1. Entry Decision

When the site loads, the frontend checks for a stored device identity and the last known participant state.

- If no valid local participant memory exists, the user enters the Team Selection screen.
- If valid local participant memory exists, the user enters the Home dashboard directly.

The backend remains the source of truth for whether the stored selection is still valid.

### 2. Team Selection

The Team Selection screen is the first-time entry flow.

It includes:
- brand header for World Cup Festival 688
- team search input
- a responsive grid of 48 national team cards
- visual disabled state and ownership badge for unavailable teams
- selected state with both a highlight border and check indicator
- display name input shown as part of the confirmation stage after a team is selected
- a Continue action to confirm selection

Team search supports English names as the primary searchable text and includes Thai aliases for notable teams in the mock dataset.

### 3. Selection Confirmation

The participant flow is:
- search for a team if needed
- select one available team
- enter a display name
- press Continue

The backend checks whether the selected team is still available at submission time.

- If available, the selection is saved and the user is routed to Home.
- If not available, the user is shown a conflict message and returned to the Team Selection screen with as much prior context preserved as possible.

### 4. Home Dashboard

After a successful selection, the participant enters a single-page dashboard experience.

The page structure is:
- top navbar
- home tab bar
- selected team summary
- active tab content

Navbar content:
- left: logo and brand name `World Cup Festival 688`
- right: notification bell icon
- utility menu near the bell with device reset access

Home tabs:
- Knockout
- Fixtures
- Table
- News

Default tab:
- Knockout

### 5. Change Team

The selected team summary includes a Change Team action.

When pressed:
- a confirmation popup appears first
- after confirmation, the user returns to the Team Selection flow
- the old team remains owned until the new team is successfully confirmed

If the new attempt fails because another participant already owns that team, the user keeps the original team.

### 6. Display Name Update

The participant may edit their display name later from the Home experience without changing team ownership.

### 7. Reset Device

The utility menu includes Reset this device.

When confirmed:
- the local device identity is cleared
- the participant's team selection is released back to available state
- the site returns to the Team Selection flow

This keeps device-based identity simple and prevents orphaned owned teams.

## Team Selection Screen

Visual direction:
- clean tech dashboard feel
- white base with `#00abff` as the primary accent
- football atmosphere carried by flags, team names, and crisp motion rather than flashy decoration

Content and behavior:
- prominent brand header
- search field above the grid
- all 48 teams always visible in the grid
- unavailable teams remain visible but disabled
- unavailable teams display a badge indicating they are already selected
- selected team card uses both a blue-highlight border and a check marker
- after team selection, the participant completes the display name step before Continue

Responsive behavior:
- desktop uses a spacious multi-column grid
- tablet and mobile reduce columns cleanly without shrinking text to unreadable sizes

## Home Dashboard

The Home screen is a quiet but polished dashboard rather than a marketing page.

It includes a selected team summary section that stays near the top and shows:
- chosen team flag
- chosen team name
- participant display name
- Change Team action

No leaderboard cards or summary counters are included in the first release.

### Knockout Tab

This is the default tab and the main visual centerpiece of Home.

It includes:
- a bracket overview
- supporting match detail cards

The bracket leads the layout, with details supporting it instead of competing with it.

### Fixtures Tab

This tab presents tournament match listings with filters:
- All
- My Team
- Round

Flags should be used where useful to improve scan speed and readability.

### Table Tab

This tab contains two kinds of information:
- group standings
- company picks table

The company picks table:
- is visible to all participants
- shows display name and owned team
- is ordered by team name
- does not include search
- does not include summary cards

### News Tab

This tab uses a `featured story + list` structure.

It includes:
- a featured news item with mock image
- a list of supporting news items
- team spotlight news for the selected team alongside broader tournament coverage

### Notification Panel

The bell icon opens a placeholder notification panel.

The first release behavior is lightweight and mock-driven. It exists to complete the shell experience, not to provide live push notifications.

## Business Rules

### Identity Rules

- One participant session is tied to one browser device identity.
- The system remembers the participant only on that device.
- There is no full login system in the first release.

### Ownership Rules

- One participant can own exactly one team at a time.
- One team can be owned by exactly one participant at a time.
- A participant can change teams later, but only through the explicit Change Team flow.

### Availability Rules

- Team availability is determined by the shared backend state.
- Disabled teams remain visible in the grid.
- Availability must be rechecked at confirmation time.

### Conflict Rules

- If two participants attempt to claim the same team near the same time, only the first successful confirmation wins.
- The losing participant receives a clear conflict message and is asked to choose another team.

### Change Rules

- Old ownership is preserved until a replacement team is successfully secured.
- A failed team change attempt leaves the original team unchanged.

### Reset Rules

- Reset this device intentionally clears the local identity.
- Reset this device also releases the currently owned team.

## Data Responsibilities

### Frontend

The frontend is responsible for:
- reading and writing local device memory
- rendering the selection and dashboard flows
- showing current local participant context
- calling backend APIs for authoritative data

### Backend

The backend is responsible for:
- serving teams
- serving knockout content
- serving fixtures
- serving standings and company picks
- serving news content
- creating selection records
- checking availability
- handling selection conflicts
- processing team changes
- updating display names
- resetting device-bound selections

### Supabase

Supabase stores:
- selection records
- current ownership state
- participant display names
- timestamps for shared records

It does not need to store all tournament content in the first release if that content remains mock data managed by the backend layer.

## API Surface

The exact route naming can be finalized during planning, but the first release should support API capabilities equivalent to:
- fetch teams with availability state
- create selection
- fetch current participant selection by device identity
- change selection
- update display name
- reset device selection
- fetch knockout content
- fetch fixtures
- fetch standings
- fetch company picks
- fetch news

## Error Handling

The first release should explicitly handle:
- team selection conflicts
- missing or invalid local participant memory
- unavailable team selection attempts
- backend fetch failures for dashboard content
- display name validation failures

The UX should stay calm and corrective rather than alarming.

## Validation and Testing Expectations

The implementation should validate:
- first-time selection flow
- returning participant flow on the same device
- change team flow with confirmation
- reset device flow with release behavior
- duplicate team protection under conflicting requests
- correct disabled rendering for owned teams
- responsive behavior for selection screen and dashboard

## Out of Scope for Release 1

- authentication and company SSO
- live sports data providers
- real notification delivery
- admin moderation tools
- participant analytics dashboards
- multi-device identity continuity

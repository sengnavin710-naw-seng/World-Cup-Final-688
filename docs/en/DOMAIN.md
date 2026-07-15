# Domain

English | [ภาษาไทย](../th/DOMAIN.md)

This document defines the product language and the business rules that should remain consistent across the UI, API, tests, and documentation.

## Core terms

**Participant**: A person using the World Cup selection site.

**National Team**: One of the World Cup teams available for selection.

**Team Selection**: The single National Team currently chosen by a Participant.

**Selection Rule**: A Participant has at most one Team Selection, and a National Team can belong to at most one Participant.

**Returning Participant**: A Participant recognized when opening the site again with the same browser identity.

**Device Identity**: A browser-bound identifier stored under `wcf688-device-id` in local storage.

**Device Reset**: An explicit action that deletes the server-side Selection Record and clears local identity/session data.

**Selection Release**: Returning a National Team to the available state when its Participant resets the device identity.

**Display Name**: A participant-provided name, limited by the API to 80 characters.

**Selection Change**: Replacing the current Team Selection with another available National Team after confirmation.

**Selection Conflict**: A rejected selection because another Participant already owns the requested National Team.

**Selection Record**: The stored relationship between `deviceId`, `displayName`, and a three-letter `teamCode`.

**Team Availability**: Whether a National Team is available or currently owned, optionally including the owner's Display Name.

## Product surfaces

**Team Selection Grid**: The searchable grid used to choose a National Team.

**Team Search**: The filter input that narrows the Team Selection Grid by team name and supported aliases.

**Selection Confirmation**: Finalizing the highlighted National Team and entering the Home View.

**Home View**: The main experience after selection, or after explicitly skipping selection.

**Brand Header**: The top navigation area that identifies World Cup Festival 688 and contains the primary application actions.

**Home Tabs**: Knockout, Fixtures, Table, and News.

**Selected Team Summary**: The persistent summary of the Participant's team and the entry point for changing it.

**Company Picks Table**: The shared list of Participants and their National Teams.

**Notification Panel**: The panel opened from the bell button to show tournament updates.

**Team Spotlight News**: Tournament news that specifically highlights the Participant's selected National Team.

**Mock Tournament Data**: Static tournament data used when a configured live provider is unavailable.

## Persistence rules

- Supabase table `participant_selections` enforces unique `device_id` and unique `team_code`.
- Without valid Supabase configuration, the API uses an in-memory store. That data disappears when the API process restarts.
- The browser caches both its Device Identity and the latest Participant session in local storage.

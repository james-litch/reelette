# Reelette domain

[Back to README](../../README.md)

## Rooms and access

Authenticated users create rooms with a trimmed name of 1–80 characters.
**My Rooms** opens the newest accessible room; the room-title dropdown switches
between owned and joined rooms or creates another room.

Every room has three tabs:

- **Requests:** `/rooms/[roomId]`, showing unwatched requests, newest first.
- **Search:** `/rooms/[roomId]/search`, for finding and adding movies.
- **History:** `/rooms/[roomId]/history`, showing watched movies, most recently watched first.

Owners and members can add/delete requests, mark movies as watched, randomise,
rename the room, and change its random-selection setting. Only owners can invite
or remove members and delete the room. Anonymous users and non-members have no
room access; knowing its ID does not grant access.

Supabase row-level security and checked database functions enforce permissions.
Room identity, ownership, and saved movie metadata cannot be changed through
the Data API. Deleting a room removes its requests, history, memberships, and
invite link. Deleting its owning Auth user also deletes the room.

## Settings and members

**General** contains the room name and **Exclude last requestor** preference.
**Members** lists participants with owner/member badges and names formatted as
first name and last initial (for example, **Alex M.**); single names stay unchanged.
Names use profile metadata, falling back to the email name without its domain.
The member list refreshes when opened.

Owners share copyable invite links. Recipients sign in with Google and explicitly
choose **Join room**. Links support multiple recipients, expire after one hour,
and are invalidated when replaced. Expiry or replacement does not remove members.
Repeated joins do not create duplicate memberships.

Owners remove members with the trash icon, but cannot remove themselves. Removal
revokes access and retains existing requests/history. A removed user can rejoin
with a valid link, so rotate previously shared links when needed.

The owner-only **Danger** tab requires confirmation before deleting a room.

## Movie requests and selection

Search results open an **Add request** dialog. Select an existing requestor or
add a typed name. Names are scoped to the room, deduplicated ignoring case, and
persist only when a request is saved. The server checks access and fetches movie
details from TMDB before saving a snapshot.

Requests display a poster, title/year, and requestor badge. Their menu offers
**Mark as watched**, **Letterboxd**, and **Delete**. Watched movies move to History
and show the watched date on their poster.

Requestor and genre filters both support multiple selections. Matches are OR
within each filter and AND between filters. **Randomise movie** chooses from the
matching unwatched requests; **Pick again** chooses a different movie when possible.
The modal can mark the choice as watched or open Letterboxd.

**Exclude last requestor** defaults to off. When enabled, selection skips requests
from the person whose movie was most recently watched across the room's history,
matching names without case sensitivity. It does not hide requests. Before the
first watch, nobody is excluded. No eligible movies means changing filters or the
setting; history-load failures disable random selection until a successful refresh.

## Search and live updates

The authenticated `/api/movies/search?query=<title>&page=1` endpoint accepts
2–200 characters and pages 1–500. Search debounces for 350 ms, cancels previous
requests, and ignores stale responses. Pagination uses TMDB's total counts.
The English genre list is cached server-side with 24-hour revalidation; searches
remain uncached. Tokens and provider error details never reach the browser.

Private Supabase Realtime broadcasts notify room participants when requests
are added, watched, or deleted. The shared layout batches updates for 100 ms,
refreshes server data, and refreshes requestor suggestions. Reconnect, focus,
visibility, and online events catch missed changes. Mounted filter/search state
and scroll position are preserved.

Notifications contain no movie or profile details; data is fetched through RLS.
Realtime caches channel permissions until reauthorization, so removed members
may receive empty notifications on an existing connection but cannot fetch room data.

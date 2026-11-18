# Cravd messaging feature — integration guide

The supplied ZIP is a patch against the original `cravd-app-main.zip` project, not your local Git branch. It does not include `.env`, node_modules, or Firebase credentials. Apply only on the `feature/messaging` branch.

## Add the files

Extract `cravd-messaging-changes.zip` into your current `cravd-app` directory. Existing files such as `App.jsx`, `AppLayout.jsx`, `index.css`, `Explore.jsx`, `ItemDetail.jsx`, `ReviewCard.jsx`, and `Profile.jsx` will be replaced by the integrated versions; new messaging files will be added. Do not overwrite your `.env` or other teammates' work. Check `git diff` before committing.

## What is wired up

* Top-right Messages button and unread conversation badge on every page.
* Inbox subscribes to `threads` in real time and **also synthesizes invite messages** from the existing `invites` collection, so existing Home/NewInvite flows appear in both friends' inboxes without modifying `sendInvite`.
* Friends can open a 1:1 conversation and send text or share a dish.
* Inside a chat the `+` button offers a dish picker or an invite composer.
* Explore cards, item details and review cards offer **Send to a friend**.
* Invite messages accept Yes (`down`) and No (`cant`) via existing `respondToInvite`, preserving Home behavior.
* Recipients can suggest a new time and the invite sender can accept/reject it. Accept changes `urgency`, `meetAt`, `expiresAt` and the response to `down` using a Firestore transaction.
* Opening a conversation updates `lastReadAt` and clears its unread indicator.
* UI only exposes chat between friends. Thread schema retains `participantIds[]` for future group messages.

## Firestore schema (no migration necessary)

* `threads/{threadId}`: `{ participantIds: [uidA, uidB], lastMessage: {...}, lastMessageAt: number, lastReadAt: { [uid]: number } }`
* `messages/{autoId}`: `{ threadId, senderId, type: 'text' | 'dish' | 'invite' | 'counter', text?, itemId?, inviteId?, proposedFor?, counterStatus?, createdAt: number }`
* All timestamps follow the app's existing Date.now()/milliseconds convention.
* Existing `invites` documents remain unchanged. For legacy invites, chat message cards are derived from `invites`, so there is no duplicate write, and new invite messages are deduplicated by inviteId in the thread view.
* Queries: `threads` with `participantIds array-contains uid` and `messages` with `threadId == value`. Both are individually filtered and sorted client-side; no composite index is required.

## Firebase security limitations

The original app logs users in by selecting an ID saved in `localStorage`, not by Firebase Authentication. This is **not verified identity**. UI-level friend checks are not a security boundary. Before deploying messaging for real students, configure Firebase Authentication plus Firestore rules that verify `request.auth.uid` is a thread participant; and check friendship membership and author identity on creates/updates, including invite counter-offers. Do not blindly publish permissive sample rules to a public project.

**If you see `Missing or insufficient permissions` in the browser**, your deployed Firestore rules don't allow these new collections. The UI cannot fix that by itself. Ask the teammate managing Firebase to set up proper authentication and review the access rules; don't change production rules without them.

## Manual testing (use two authorized demo users)

1. On the sender's login, open Messages and click New; choose a friend, send a text.
2. Switch to the friend; the text should appear in their Inbox; opening the thread should remove the unread dot/badge.
3. Share a dish from a chat, then open it from the recipient's thread.
4. Send an invite through the **existing New Invite screen** (not messaging), then open Messages on both users: invite should appear automatically.
5. From the recipient's thread tap Yes. Home should treat that as `down`.
6. Send another invite, tap No. Chat should say You declined; existing Home stores `cant`.
7. Send another invite, tap Different time, select a future time, send; on inviter side tap Works for me. Check the invite's meetAt and `down` response.
8. Check an expired invite has no action buttons.
9. From Explore, a dish detail, or a review, click Send to a friend; send invite or share-only and verify it opens the chat.
10. Repeat with two browser sessions or a private/incognito window. Both users need to be friends.

## Test status

Source JS/JSX parse and local import resolution passed. Pure-data tests for inbox invite merging, unread, text previews, and deduplication passed. A full Vite build and live Firestore test could not run in the current environment because `npm ci` stalled while fetching packages. Run `npm install`, `npm run build`, and `npm run lint` on your Mac before submitting a PR.

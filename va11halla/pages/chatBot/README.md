# chatBot Module

This directory contains the active chatbot implementation used by `pages/chatBot/*`.

## Runtime Pages

- `index/index.vue`: session launcher, featured personas, market personas, and session list.
- `session/index.vue`: AI chat session (streaming, settings, memories, recommendation cards).
- `friend/index.vue`: friend-to-friend chat session.

## Shared Components

- `components/ChatTopBar.vue`: reusable top navigation bar for chat pages.
- `components/ErrorBanner.vue`: reusable closable inline error banner.
- `components/SessionListItem.vue`: reusable list item with right-side visibility badge.

## Services (Cloud API Facade)

- `services/sessionService.js`: session fetch/settings/visibility APIs.
- `services/personaService.js`: persona list/create/clone APIs.
- `services/chatService.js`: request context build + send + persistence helpers.
- `services/modelService.js`: model list, model routing, request message shaping, SSE stream parser.
- `services/messageService.js`: local message mapping + message persistence APIs.
- `services/memoryService.js`: memory fetch/compress/recommendation APIs.
- `services/fileService.js`: client-side file pick/read/normalize helpers.
- `services/friendService.js`: friend relation/session/message APIs.

## Notes

- Removed placeholder folders/files (`composables`, `store`, `constants`, empty `core/*`, empty `utils/*`) to keep only active code paths.
- `core/context/CoreEventSchema.js` and `core/context/CoreEventSkill.md` are retained as event-memory design references.

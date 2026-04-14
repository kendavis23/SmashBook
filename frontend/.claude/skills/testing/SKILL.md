---
name: testing
description: Testing rules and patterns for api-client, domain hooks, mappers, and feature components.
---

## Layers and tools

| Layer              | Tool                      | What to test                                                       |
| ------------------ | ------------------------- | ------------------------------------------------------------------ |
| api-client         | Vitest                    | URL, method, body — mock `fetcher`                                 |
| Domain mappers     | Vitest                    | Transform logic — no transform, field present, field absent        |
| Domain hooks       | Vitest + RTL `renderHook` | Success + enabled-guard (query); success + invalidation (mutation) |
| Feature components | Vitest + RTL `render`     | User behavior from user POV                                        |

## API client test pattern

```ts
vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));
import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);
beforeEach(() => mockFetcher.mockReset());
// One describe per function, one it per test — assert URL, method, body
```

## Domain hook test pattern

```ts
// Mock the entire api-client module at the top
vi.mock("@repo/api-client/modules/staff", () => ({
    listCourtsEndpoint: vi.fn(),
}));
import * as staffApi from "@repo/api-client/modules/staff";

// Fresh QueryClient per test
function makeWrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, Wrapper };
}
```

Required tests:

- `useQuery`: success (data returned) + enabled-guard (no fetch when param is empty)
- `useMutation`: success (endpoint called with correct args) + `invalidateQueries` called with correct key

## Feature component test pattern

```tsx
vi.mock("@repo/ui", () => ({
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock("../../hooks", () => ({ useListCourts: vi.fn() }));
```

- Query by role: `getByRole`, `getByText`, `getByLabelText`, `getByPlaceholderText`
- Avoid `getByTestId` unless no semantic alternative exists
- Test behavior, not implementation — never assert on internal state

## Required test cases per component type

**View component:** loading state, error state, empty state, data state, user events call correct callbacks  
**Modal/dialog:** correct title for create vs edit, validation prevents submit, submit calls mutation, cancel calls `onClose`  
**Container:** loading/error/success state rendering

## Rules

- Test behavior, not implementation
- Never test Zustand store internals — test via hooks or component behavior
- No real HTTP calls — always mock at module level
- Every domain service with business logic must have unit tests

## Ref: `docs/FE_DOMAIN_LAYER_GUIDE.md` §5, `docs/FE_FEATURE_LAYER_GUIDE.md` §7

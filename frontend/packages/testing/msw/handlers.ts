// MSW request handlers — shared across all test suites.
// Domain-specific handlers live here and are imported by feature tests.
import { http, HttpResponse } from "msw";

export const handlers = {
    // Add domain handlers here e.g.:
    // bookings: { withEmpty: () => http.get('/api/v1/bookings', () => HttpResponse.json([])) }
};

export { http, HttpResponse };

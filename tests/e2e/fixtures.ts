import { test as base } from "@playwright/test";

// Each isolated browser account also gets an isolated test IP. This keeps the
// real API rate limits enabled without accumulating a whole suite on localhost.
export const test = base.extend({
  extraHTTPHeaders: async ({}, use, info) => {
    let hash = 0;
    for (const char of info.testId)
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    await use({
      "X-Forwarded-For": `198.18.${(hash >>> 8) & 255}.${hash & 255}`,
    });
  },
});
export { expect, type Page } from "@playwright/test";

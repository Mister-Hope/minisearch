import { bench, describe } from "vitest";

import { index, search } from "./__fixtures__/store.js";

describe("Combined search", () => {
  bench('search("virtute conoscienza", { fuzzy: 0.2, prefix: true })', () => {
    search(index, "virtute conoscienza", {
      fuzzy: 0.2,
      prefix: true,
    });
  });

  bench('search("virtu", { fuzzy: 0.2, prefix: true })', () => {
    search(index, "virtu", {
      fuzzy: 0.2,
      prefix: true,
    });
  });
});

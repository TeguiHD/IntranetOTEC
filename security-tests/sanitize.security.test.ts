import assert from "node:assert/strict";
import test from "node:test";

import { sanitizePath, sanitizeVideoUrl } from "../src/lib/sanitizePath";

test("sanitizePath accepts valid storage paths", () => {
  assert.equal(
    sanitizePath("material/550e8400-e29b-41d4-a716-446655440000/recurso.pdf"),
    "material/550e8400-e29b-41d4-a716-446655440000/recurso.pdf",
  );

  assert.equal(
    sanitizePath("/material//550e8400-e29b-41d4-a716-446655440000//a.pdf/"),
    "material/550e8400-e29b-41d4-a716-446655440000/a.pdf",
  );
});

test("sanitizePath rejects path traversal payloads", () => {
  assert.throws(() => sanitizePath("../../etc/passwd"));
  assert.throws(() => sanitizePath("..%2F..%2Fetc%2Fpasswd"));
  assert.throws(() => sanitizePath("material/..\\secret"));
  assert.throws(() => sanitizePath("material/%00evil"));
});

test("sanitizeVideoUrl allows only whitelisted https providers", () => {
  assert.equal(sanitizeVideoUrl("https://www.youtube.com/watch?v=123"), true);
  assert.equal(sanitizeVideoUrl("https://player.vimeo.com/video/123"), true);
  assert.equal(sanitizeVideoUrl("https://drive.google.com/file/d/abc/view"), true);

  assert.equal(sanitizeVideoUrl("http://www.youtube.com/watch?v=123"), false);
  assert.equal(sanitizeVideoUrl("https://evil.example.com/video"), false);
  assert.equal(sanitizeVideoUrl("javascript:alert(1)"), false);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  CALENDAR_CREATOR_EMAIL,
  filterCalendarEventResult,
  isCalendarEventReadTool,
  isGoogleCalendarServer,
} from "../src/ai/mcp/utils/calendarEventFilter.ts";

const event = (id, email) => ({ id, creator: { email } });
const result = (value) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});
const filter = (value) =>
  filterCalendarEventResult(result(value), CALENDAR_CREATOR_EMAIL);

test("only creator.email matches; attendee and organizer do not count", () => {
  const filtered = filter({
    items: [
      event("mine", "MAIL@NICO.DEV"),
      {
        ...event("invitation", "other@example.com"),
        organizer: { email: CALENDAR_CREATOR_EMAIL },
      },
      {
        id: "unknown",
        attendees: [{ email: CALENDAR_CREATOR_EMAIL }],
        creator: { self: true },
      },
    ],
    nextPageToken: "next",
    summary: "Unfiltered event titles",
  });
  assert.deepEqual(
    filtered.structuredContent.events.map(({ id }) => id),
    ["mine"]
  );
  assert.equal(filtered.structuredContent.nextPageToken, "next");
  assert.equal(filtered.structuredContent.creatorFilter.excluded, 1);
  assert.equal(filtered.structuredContent.creatorFilter.unverified, 1);
  assert.ok(!filtered.content[0].text.includes("Unfiltered event titles"));
});

test("supports arrays, events wrappers, nested data and individual events", () => {
  const mine = event("mine", CALENDAR_CREATOR_EMAIL);
  for (const value of [
    [mine],
    { events: [mine] },
    { data: { items: [mine] } },
    { event: mine },
  ]) {
    assert.deepEqual(filter(value).structuredContent.events, [mine]);
  }
});

test("structured content replaces all unfiltered text and media", () => {
  const filtered = filterCalendarEventResult(
    {
      structuredContent: {
        events: [
          event("mine", CALENDAR_CREATOR_EMAIL),
          event("other", "other@example.com"),
        ],
      },
      content: [{ type: "text", text: "Unfiltered summary" }],
    },
    CALENDAR_CREATOR_EMAIL
  );
  assert.deepEqual(
    JSON.parse(filtered.content[0].text),
    filtered.structuredContent
  );
  assert.ok(!filtered.content[0].text.includes("Unfiltered summary"));
  assert.equal(filtered.structuredContent.events.length, 1);
});

test("empty pages retain pagination and missing creators are omitted", () => {
  const filtered = filter({
    events: [{ id: "unknown" }],
    nextPageToken: "next",
  });
  assert.deepEqual(filtered.structuredContent.events, []);
  assert.equal(filtered.structuredContent.nextPageToken, "next");
  assert.equal(filtered.structuredContent.creatorFilter.unverified, 1);
});

test("unsupported formats fail closed and existing errors are preserved", () => {
  for (const response of [
    { content: [{ type: "text", text: "private event title" }] },
    result({ summary: "private event title" }),
    { content: [] },
  ]) {
    const filtered = filterCalendarEventResult(
      response,
      CALENDAR_CREATOR_EMAIL
    );
    assert.equal(filtered.isError, true);
    assert.ok(!filtered.content[0].text.includes("private event title"));
  }
  const error = {
    isError: true,
    content: [{ type: "text", text: "Authentication required" }],
  };
  assert.equal(filterCalendarEventResult(error, CALENDAR_CREATOR_EMAIL), error);
});

test("targets calendar read tools, not writes or unrelated tools", () => {
  for (const name of [
    "list_events",
    "search-events",
    "getEvent",
    "google_calendar_list_events",
    "events",
  ]) {
    assert.equal(isCalendarEventReadTool(name), true, name);
  }
  for (const name of [
    "create_event",
    "update_event",
    "delete_event",
    "list_calendars",
    "list_memories",
  ]) {
    assert.equal(isCalendarEventReadTool(name), false, name);
  }
  assert.equal(
    isGoogleCalendarServer("Google Calendar", "https://example.com/mcp"),
    true
  );
  assert.equal(
    isGoogleCalendarServer("Calendar", "https://google-calendar.nico.dev/mcp"),
    true
  );
  assert.equal(
    isGoogleCalendarServer("Other", "https://example.com/mcp"),
    false
  );
});

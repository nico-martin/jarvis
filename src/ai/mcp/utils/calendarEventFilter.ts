import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const CALENDAR_CREATOR_EMAIL = "mail@nico.dev";

export function isGoogleCalendarServer(name: string, url: string): boolean {
  return (
    /google[\s_-]*calendar/i.test(name) ||
    /google[\s_-]*calendar/i.test(new URL(url).hostname)
  );
}

export function isCalendarEventReadTool(name: string): boolean {
  const words = name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  if (
    /(^|[_-])(create|add|insert|update|patch|delete|remove|move|import|cancel|respond|accept|decline|set|watch)([_-]|$)/.test(
      words
    )
  ) {
    return false;
  }
  return (
    /(^|[_-])events?([_-]|$)/.test(words) &&
    (/(^|[_-])(list|search|get|fetch|query|find)([_-]|$)/.test(words) ||
      words === "events")
  );
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function eventPage(value: unknown): JsonObject & { events: unknown[] } {
  if (Array.isArray(value)) return { events: value };
  if (!isObject(value)) throw new Error("Unsupported calendar response");
  for (const key of ["events", "items", "results"]) {
    if (Array.isArray(value[key])) {
      // Only retain event data and pagination, not potentially unfiltered summaries.
      return {
        events: value[key],
        ...(typeof value.nextPageToken === "string"
          ? { nextPageToken: value.nextPageToken }
          : {}),
        ...(typeof value.timeZone === "string"
          ? { timeZone: value.timeZone }
          : {}),
      };
    }
  }
  if ("data" in value) return eventPage(value.data);
  if ("event" in value) return eventPage(value.event);
  if ("creator" in value && "id" in value) return { events: [value] };
  throw new Error("Unsupported calendar response");
}

export function filterCalendarEventResult(
  result: CallToolResult,
  creatorEmail: string
): CallToolResult {
  if (result.isError) return result;

  try {
    const sources = result.structuredContent
      ? [result.structuredContent]
      : result.content.map((part) => {
          if (part.type !== "text")
            throw new Error("Non-JSON calendar response");
          return JSON.parse(part.text) as unknown;
        });
    if (!sources.length) throw new Error("Empty calendar response");

    let excluded = 0;
    let unverified = 0;
    const email = creatorEmail.trim().toLowerCase();
    const pages = sources.map((source) => {
      const page = eventPage(source);
      return {
        ...page,
        events: page.events.filter((event) => {
          const creator = isObject(event) && event.creator;
          if (
            !isObject(creator) ||
            typeof creator.email !== "string" ||
            !creator.email.trim()
          ) {
            unverified++;
            return false;
          }
          const matches = creator.email.trim().toLowerCase() === email;
          if (!matches) excluded++;
          return matches;
        }),
      };
    });
    const filtered = {
      ...(pages.length === 1 ? pages[0] : { pages }),
      creatorFilter: {
        email,
        excluded,
        unverified,
        note: "Only events created by this email are included. Unverified events are omitted. Follow nextPageToken, if present, to check further pages.",
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(filtered) }],
      structuredContent: filtered,
    };
  } catch {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Cannot safely filter calendar events for ${creatorEmail}: the MCP must return JSON events with creator.email. No unfiltered events have been returned.`,
        },
      ],
    };
  }
}

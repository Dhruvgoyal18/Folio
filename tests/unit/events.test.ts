// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { emit, on } from "@/lib/events";

describe("event bus", () => {
  it("replays an event fired before the island subscribed", async () => {
    emit("dg:capcom", { question: "early" });
    const fn = vi.fn();
    const off = on("dg:capcom", fn);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledWith({ question: "early" });
    emit("dg:capcom", { question: "live" });
    expect(fn).toHaveBeenLastCalledWith({ question: "live" });
    off();
  });
});

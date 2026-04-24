import { describe, it, expect } from "vitest";
import { sanitizeUserHtml } from "../lib/sanitize-html";

describe("sanitizeUserHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitizeUserHtml("")).toBe("");
    // @ts-expect-error — deliberately testing runtime guard
    expect(sanitizeUserHtml(null)).toBe("");
  });

  it("strips <script> tags entirely", () => {
    const out = sanitizeUserHtml(`<p>ok</p><script>alert(1)</script>`);
    expect(out).toContain("<p>ok</p>");
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("alert");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeUserHtml(`<a href="https://x.com" onclick="steal()">click</a>`);
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("steal");
  });

  it("strips javascript: URLs", () => {
    const out = sanitizeUserHtml(`<a href="javascript:alert(1)">x</a>`);
    expect(out).not.toMatch(/javascript:/i);
  });

  it("allows safe inline formatting and lists", () => {
    const out = sanitizeUserHtml(
      `<h2>t</h2><p><strong>b</strong> <em>i</em></p><ul><li>x</li></ul>`,
    );
    expect(out).toContain("<h2>t</h2>");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>x</li>");
  });

  it("forces safe rel + target on anchors", () => {
    const out = sanitizeUserHtml(`<a href="https://example.com">x</a>`);
    expect(out).toMatch(/rel="noopener noreferrer nofollow"/);
    expect(out).toMatch(/target="_blank"/);
  });

  it("strips <style> blocks", () => {
    const out = sanitizeUserHtml(`<style>body{display:none}</style><p>ok</p>`);
    expect(out).not.toContain("<style>");
    expect(out).toContain("<p>ok</p>");
  });

  it("strips iframes", () => {
    const out = sanitizeUserHtml(`<iframe src="evil"></iframe><p>ok</p>`);
    expect(out).not.toContain("<iframe");
    expect(out).toContain("<p>ok</p>");
  });

  it("allows img tags with http(s) and data: sources", () => {
    const httpOut = sanitizeUserHtml(`<img src="https://x.com/y.png" alt="a">`);
    expect(httpOut).toContain("<img");
    expect(httpOut).toMatch(/src="https:\/\//);

    const dataOut = sanitizeUserHtml(
      `<img src="data:image/png;base64,iVBORw0KGgo=" alt="a">`,
    );
    expect(dataOut).toContain("<img");
  });
});

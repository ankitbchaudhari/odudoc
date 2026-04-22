// Parse the "Frequently asked questions" section out of AI-generated blog
// HTML so we can emit FAQPage JSON-LD. Google rewards FAQ rich results with
// extra SERP real estate — big win for almost zero ongoing cost.
//
// Expected shape we ask Gemini for:
//   <h2>Frequently asked questions</h2>
//   <h3>Question?</h3>
//   <p>Answer.</p>
//   <h3>Next question?</h3>
//   <p>Next answer.</p>
//
// We're forgiving — any <h2> whose text matches /faq|frequently asked/i counts,
// and we accept either <h3> or <h4> for the question, and the first
// sibling <p> (or concatenated <p>s) as the answer.

export interface ExtractedFaq {
  q: string;
  a: string;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFaqs(html: string): ExtractedFaq[] {
  if (!html) return [];
  // Find the start of the FAQ section — the <h2> whose inner text contains
  // "faq" or "frequently asked".
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let faqStart = -1;
  let m: RegExpExecArray | null;
  while ((m = h2Re.exec(html))) {
    const inner = stripTags(m[1]).toLowerCase();
    if (/faq|frequently asked/.test(inner)) {
      faqStart = m.index + m[0].length;
      break;
    }
  }
  if (faqStart < 0) return [];

  // Next <h2> marks the end of the FAQ block (or end-of-string).
  let faqEnd = html.length;
  h2Re.lastIndex = faqStart;
  const next = h2Re.exec(html);
  if (next) faqEnd = next.index;

  const block = html.slice(faqStart, faqEnd);

  // Pull out Q/A pairs. Question = <h3>|<h4>, answer = all <p>s until the
  // next question tag.
  const tokRe = /<(h3|h4)[^>]*>([\s\S]*?)<\/\1>|<p[^>]*>([\s\S]*?)<\/p>/gi;
  const faqs: ExtractedFaq[] = [];
  let current: ExtractedFaq | null = null;
  let tm: RegExpExecArray | null;
  while ((tm = tokRe.exec(block))) {
    if (tm[1]) {
      // It's a heading — push any completed FAQ and start a new one.
      if (current && current.q && current.a) faqs.push(current);
      current = { q: stripTags(tm[2]).replace(/[?:.]*$/, "?"), a: "" };
    } else if (tm[3] && current) {
      const para = stripTags(tm[3]);
      if (!para) continue;
      current.a = current.a ? `${current.a} ${para}` : para;
    }
  }
  if (current && current.q && current.a) faqs.push(current);

  return faqs
    .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
    .filter((f) => f.q.length > 3 && f.a.length > 15)
    .slice(0, 10);
}

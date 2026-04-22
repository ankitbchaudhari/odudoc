// Blog comments store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export interface Comment {
  id: string;
  postId?: string;
  postSlug?: string;
  name: string;
  email: string;
  content: string;
  approved: boolean;
  createdAt: string;
}

const now = () => new Date().toISOString();

const comments: Comment[] = [];
const { hydrate, flush } = bindPersistentArray<Comment>(
  "comments",
  comments,
  () => []
);
await hydrate();

// One-time cleanup: drop the demo blog comments (c1..c5 and c-seed-0..41)
// that shipped with the initial seed.
(function removeLegacySeedComments() {
  let dirty = false;
  for (let i = comments.length - 1; i >= 0; i--) {
    const id = comments[i].id;
    if (id === "c1" || id === "c2" || id === "c3" || id === "c4" || id === "c5" || id.startsWith("c-seed-")) {
      comments.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

export function listComments(opts: {
  approved?: boolean;
  limit?: number;
} = {}): Comment[] {
  let list = [...comments].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (opts.approved !== undefined) list = list.filter((c) => c.approved === opts.approved);
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function countComments(): number {
  return comments.length;
}

export function addComment(input: {
  postSlug?: string;
  postId?: string;
  name: string;
  email: string;
  content: string;
}): Comment {
  const c: Comment = {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    postSlug: input.postSlug,
    postId: input.postId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    content: input.content.trim(),
    approved: false,
    createdAt: now(),
  };
  comments.unshift(c);
  flush();
  return c;
}

export function setApproval(id: string, approved: boolean): Comment | null {
  const c = comments.find((x) => x.id === id);
  if (!c) return null;
  c.approved = approved;
  flush();
  return c;
}

export function removeComment(id: string): boolean {
  const idx = comments.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  comments.splice(idx, 1);
  flush();
  return true;
}

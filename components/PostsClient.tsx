"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  auth,
  type FeedPost,
  type Paginated,
  type User,
  type UserPosts,
} from "../lib/api";
import { Pager } from "./Pager";

const EMPTY: Paginated<FeedPost> = {
  data: [],
  page: 1,
  limit: 5,
  total: 0,
  totalPages: 0,
};

/**
 * Two views over the same posts, each backed by a different endpoint:
 *
 *  - the feed, GET /api/posts, searchable by author email or id;
 *  - one user's posts, GET /api/users/:id/posts, which is aggregation
 *    scenario 2 - a single User.aggregate() with one $lookup.
 *
 * `focusId` decides which one is on screen. It is set by the button on any
 * feed row (the feed already carries author.id, so no id has to be typed) and
 * by /posts?userId=<id>, the link from the Insights page.
 */
export function PostsClient() {
  const searchParams = useSearchParams();
  const [me, setMe] = useState<User | null>(null);
  // `term` is what the search box shows; `author` is what it last submitted.
  const [term, setTerm] = useState("");
  const [author, setAuthor] = useState("");
  const [feed, setFeed] = useState<Paginated<FeedPost>>(EMPTY);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focus, setFocus] = useState<UserPosts | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: "", body: "" });

  useEffect(() => {
    setMe(auth.user());
    const linked = searchParams.get("userId");
    if (linked) setFocusId(linked);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (focusId) {
        setFocus(await api.userPosts(focusId, { page, limit: 5 }));
      } else {
        setFeed(
          await api.listPosts({ page, limit: 5, author: author || undefined }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
      if (focusId) setFocus(null);
      else setFeed(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [focusId, author, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function search(value: string) {
    setFocusId(null);
    setFocus(null);
    setTerm(value);
    setAuthor(value);
    setPage(1);
  }

  function openScenarioTwo(userId: string) {
    setFocusId(userId);
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToFeed() {
    setFocusId(null);
    setFocus(null);
    setPage(1);
  }

  async function createPost(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createPost(draft);
      setDraft({ title: "", body: "" });
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    }
  }


  if (focusId) {
    return (
      <>
        <h1>Posts by one user</h1>
    
        {error && <p className="error">{error}</p>}

        <button type="button" onClick={backToFeed}>
          ← All posts
        </button>

        {loading ? (
          <p className="muted" style={{ marginTop: "1rem" }}>
            Loading…
          </p>
        ) : (
          focus && (
            <>
              <h2 style={{ marginBottom: 0 }}>
                {focus.user.name}{" "}
                <span className="muted">({focus.user.email})</span>
              </h2>
              <p className="muted" style={{ marginTop: "0.2rem" }}>
                {focus.total} post(s)
              </p>

              {focus.posts.length === 0 ? (
                <p className="muted">This user has not posted yet.</p>
              ) : (
                focus.posts.map((post) => (
                  <div className="card" key={post.id}>
                    <strong>{post.title}</strong>
                    <p style={{ margin: "0.4rem 0", whiteSpace: "pre-wrap" }}>
                      {post.body}
                    </p>
                    <span className="muted">
                      {new Date(post.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}

              <Pager
                page={focus.page}
                totalPages={focus.totalPages}
                total={focus.total}
                onChange={setPage}
              />
            </>
          )
        )}
      </>
    );
  }

  /* ---------- the feed ---------- */

  return (
    <>
      <h1>Posts</h1>    

      {error && <p className="error">{error}</p>}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          search(term.trim());
        }}
      >
        <input
          placeholder="Search by user email or user id (blank = all posts)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          style={{ flex: "1 1 300px" }}
        />
        <button type="submit">Search</button>
        {author && (
          <button type="button" onClick={() => search("")}>
            Clear
          </button>
        )}
      </form>

      {me && (
        <form
          onSubmit={createPost}
          className="card"
          style={{ marginTop: "1rem" }}
        >
          <h2>Write a post</h2>
          <label>
            Title
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </label>
          <label>
            Body
            <textarea
              rows={2}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              required
            />
          </label>
          <button type="submit" style={{ marginTop: "0.5rem" }}>
            Publish
          </button>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : feed.data.length === 0 ? (
        <p className="muted">
          {author ? "This user has not posted yet." : "No posts yet."}
        </p>
      ) : (
        feed.data.map((post) => (
          <div className="card" key={post.id}>
            <strong>{post.title}</strong>
            <p style={{ margin: "0.4rem 0", whiteSpace: "pre-wrap" }}>
              {post.body}
            </p>
            <div className="row">
              <span className="muted">
                {post.author.name} · {new Date(post.createdAt).toLocaleString()}
              </span>
              {/* Narrow the feed to this author... */}
              <button type="button" onClick={() => search(post.author.email)}>
                {post.author.email}
              </button>
              {/* ...or hand their id to the scenario-2 pipeline. */}
              <button
                type="button"
                onClick={() => openScenarioTwo(post.author.id)}
              >
                Their posts via $lookup
              </button>
            </div>
          </div>
        ))
      )}

      <Pager
        page={feed.page}
        totalPages={feed.totalPages}
        total={feed.total}
        onChange={setPage}
      />
    </>
  );
}

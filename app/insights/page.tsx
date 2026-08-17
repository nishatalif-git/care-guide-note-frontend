"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  auth,
  type InterestGroup,
  type Paginated,
  type User,
} from "../../lib/api";
import { Pager } from "../../components/Pager";

const EMPTY: Paginated<InterestGroup> = {
  data: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};


export default function InsightsPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [result, setResult] = useState<Paginated<InterestGroup>>(EMPTY);
  const [page, setPage] = useState(1);
  const [interest, setInterest] = useState("");
  const [applied, setApplied] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = auth.user();
    if (!current) {
      router.replace("/login");
      return;
    }
    if (current.role !== "admin") {
      router.replace("/notes");
      return;
    }
    setMe(current);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await api.usersByInterest({
          page,
          limit: 10,
          interest: applied || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  if (!me) return <p>Checking access…</p>;

  return (
    <>
      <h1>Users grouped by interest</h1>
   
      {error && <p className="error">{error}</p>}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setApplied(interest.trim().toLowerCase());
        }}
      >
        <input
          placeholder="Filter by one interest, e.g. chess"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <button type="submit">Apply</button>
        <button
          type="button"
          onClick={() => {
            setInterest("");
            setApplied("");
            setPage(1);
          }}
        >
          Clear
        </button>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : result.data.length === 0 ? (
        <p className="muted">No interests matched.</p>
      ) : (
        result.data.map((group) => (
          <div className="card" key={group.interest}>
            <div className="row">
              <strong>{group.interest}</strong>
              <span className="muted">{group.count} user(s)</span>
            </div>
            <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
              {group.users.map((u) => (
                <li key={u.id} className="muted">
                  {u.name} - {u.email}{" "}
                  <a href={`/posts?userId=${u.id}`}>posts</a>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <Pager
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        onChange={setPage}
      />
    </>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth, type Note, type Paginated, type User } from '../../lib/api';
import { Pager } from '../../components/Pager';

const EMPTY: Paginated<Note> = { data: [], page: 1, limit: 10, total: 0, totalPages: 0 };

export default function NotesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<Paginated<Note>>(EMPTY);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = auth.user();
    if (!current) {
      router.replace('/login');
      return;
    }
    setUser(current);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.listNotes({ page, limit: 10, all: showAll || undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [page, showAll]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setContent('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api.updateNote(editingId, { title, content });
      } else {
        await api.createNote({ title, content });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.deleteNote(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }

  if (!user) return <p>Redirecting…</p>;

  return (
    <>
      <h1>Notes</h1>

      {error && <p className="error">{error}</p>}

      <form onSubmit={submit} className="card">
        <h2>{editingId ? 'Edit note' : 'New note'}</h2>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </label>
        <label>
          Content
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </label>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button type="submit">{editingId ? 'Save changes' : 'Create note'}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {user.role === 'admin' && (
        <label className="row">
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={showAll}
            onChange={(e) => {
              setShowAll(e.target.checked);
              setPage(1);
            }}
          />
          Show everyone&apos;s notes (admin)
        </label>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : result.data.length === 0 ? (
        <p className="muted">No notes yet.</p>
      ) : (
        result.data.map((note) => {
          const mine = note.owner === user.id;
          return (
            <div className="card" key={note.id}>
              <strong>{note.title}</strong>
              <p style={{ whiteSpace: 'pre-wrap', margin: '0.4rem 0' }}>{note.content}</p>
              <div className="row">
                <span className="muted">
                  {new Date(note.createdAt).toLocaleString()}
                  {!mine && ' · owned by another user'}
                </span>
                {mine && (
                  <button
                    onClick={() => {
                      setEditingId(note.id);
                      setTitle(note.title);
                      setContent(note.content);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Edit
                  </button>
                )}
                {(mine || user.role === 'admin') && (
                  <button onClick={() => remove(note.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })
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

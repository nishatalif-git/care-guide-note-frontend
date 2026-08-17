"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  auth,
  type Paginated,
  type Role,
  type User,
} from "../../../lib/api";
import { Pager } from "../../../components/Pager";

const EMPTY: Paginated<User> = {
  data: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [result, setResult] = useState<Paginated<User>>(EMPTY);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as Role,
    interests: "",
  });

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
      setResult(await api.listUsers({ page, limit: 10 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "user", interests: "" });
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "", // blank means "keep the current password"
      role: user.role,
      interests: user.interests.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const interests = form.interests
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (editingId) {
        await api.updateUser(editingId, {
          name: form.name,
          email: form.email,
          role: form.role,
          interests,
          // Only send a password when the admin actually typed a new one.
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await api.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          interests,
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  }

  async function remove(user: User) {
    if (!confirm(`Delete ${user.email}? Their notes and posts go too.`)) return;
    setError(null);
    try {
      await api.deleteUser(user.id);
      if (editingId === user.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  if (!me) return <p>Checking access…</p>;

  return (
    <>
      <h1>Users</h1>

      {error && <p className="error">{error}</p>}

      <form onSubmit={submit} className="card">
        <h2>{editingId ? "Edit user" : "Add user"}</h2>
        <div className="row">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ flex: "1 1 140px" }}
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={{ flex: "1 1 180px" }}
          />
          <input
            placeholder={
              editingId ? "New password (blank = unchanged)" : "Password (min 8)"
            }
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
            minLength={8}
            style={{ flex: "1 1 160px" }}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            // Demoting yourself would lock you out of this screen mid-session.
            disabled={editingId === me.id}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <input
            placeholder="Interests (comma separated)"
            value={form.interests}
            onChange={(e) => setForm({ ...form, interests: e.target.value })}
            style={{ flex: "1 1 200px" }}
          />
          <button type="submit">{editingId ? "Save changes" : "Create"}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Interests</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {result.data.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.interests.join(", ") || "-"}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="row">
                    <button onClick={() => startEdit(user)}>Edit</button>
                    <button
                      onClick={() => remove(user)}
                      disabled={user.id === me.id}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

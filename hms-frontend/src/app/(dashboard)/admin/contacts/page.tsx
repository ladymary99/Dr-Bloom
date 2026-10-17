"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Contact = {
  id: number;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type Paginated = {
  data: Contact[];
  current_page: number;
  last_page: number;
  total: number;
};

export default function AdminContactsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/admin/contacts", { params: { page: currentPage } });
      setResult(response.data);
    } catch {
      setError("Could not load contact messages. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  async function markRead(contact: Contact) {
    setActionError(null);
    try {
      await api.patch(`/admin/contacts/${contact.id}/read`);
      await load(page);
    } catch {
      setActionError("Could not mark this message as read. Please try again.");
    }
  }

  async function deleteContact(contact: Contact) {
    if (!confirm(`Delete the message from ${contact.name}?`)) return;
    setActionError(null);
    try {
      await api.delete(`/admin/contacts/${contact.id}`);
      await load(page);
    } catch {
      setActionError("Could not delete this message. Please try again.");
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Contact Messages</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Messages submitted through the public contact form.
          {result ? <span className="ml-2 tabular-nums">{result.total} total</span> : null}
        </p>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--muted)]">Loading contact messages…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-red-600">{error}</p>
            <button onClick={() => load(page)} className="mt-3 text-sm font-medium text-[var(--primary)] hover:underline">
              Try again
            </button>
          </div>
        ) : !result?.data.length ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">No contact messages yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                  <th className="px-6 py-4">Received</th>
                  <th className="px-6 py-4">From</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((contact) => (
                  <tr key={contact.id} className="border-b border-[var(--border)]/60 align-top last:border-0 hover:bg-[var(--primary-tint)]/10">
                    <td className="whitespace-nowrap px-6 py-4 text-xs tabular-nums text-[var(--muted)]">
                      {new Date(contact.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--ink)]">{contact.name}</div>
                      <a href={`mailto:${contact.email}`} className="text-xs text-[var(--primary)] hover:underline">
                        {contact.email}
                      </a>
                    </td>
                    <td className="max-w-md whitespace-pre-wrap px-6 py-4 text-[var(--muted)]">{contact.message}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${contact.is_read ? "bg-[var(--primary-tint)]/15 text-[var(--muted)]" : "bg-amber-100 text-amber-700"}`}>
                        {contact.is_read ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        {!contact.is_read && (
                          <button onClick={() => markRead(contact)} className="text-xs font-medium text-[var(--primary)] hover:underline">
                            Mark read
                          </button>
                        )}
                        <button onClick={() => deleteContact(contact)} className="text-xs font-medium text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
            <span className="text-sm tabular-nums text-[var(--muted)]">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button
                disabled={result.current_page === 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                disabled={result.current_page === result.last_page || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { KeyboardEvent, useState } from "react";

type ScanResult = {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  language: string | null;
};

export default function Home() {
  const [githubUrl, setGithubUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleScan() {
    console.log("Button clicked!");
    const trimmedUrl = githubUrl.trim();

    if (!trimmedUrl) {
      setError("Please enter a GitHub repository URL.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: trimmedUrl }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to scan this repository. Please check the URL and try again.";
        console.log("Scan request failed:", { status: response.status, data });
        setError(message);
        return;
      }

      setResult(data as ScanResult);
    } catch (scanError) {
      console.log("Scan request error:", scanError);
      setError(
        "Could not reach the backend. Make sure the API server is running.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      void handleScan();
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            RepoLens Scanner
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Paste a GitHub repository URL to fetch its public stats.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="url"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://github.com/owner/repository"
            className="w-full flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={isLoading}
            className="rounded-xl bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {isLoading ? "Scanning..." : "Scan Repository"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {result && (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Scan Results
            </h2>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {result.owner}/{result.repo}
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Description
                </dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {result.description || "No description provided."}
                </dd>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Stars
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {result.stars.toLocaleString()}
                </dd>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950 sm:col-span-2">
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Language
                </dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {result.language || "Not specified"}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}

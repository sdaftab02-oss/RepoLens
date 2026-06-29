"use client";

import { KeyboardEvent, useState } from "react";

type ScanResult = {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  language: string | null;
};

type Passport = {
  project_summary: string;
  file_tree: string[];
  tech_stack: string[];
};

export default function Home() {
  const [githubUrl, setGithubUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingPassport, setIsGeneratingPassport] = useState(false);

  const isBusy = isScanning || isGeneratingPassport;

  async function handleScan() {
    const trimmedUrl = githubUrl.trim();

    if (!trimmedUrl) {
      setError("Please enter a GitHub repository URL.");
      setResult(null);
      return;
    }

    setIsScanning(true);
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
      setIsScanning(false);
    }
  }

  async function handlePassport() {
    const trimmedUrl = githubUrl.trim();

    if (!trimmedUrl) {
      setError("Please enter a GitHub repository URL.");
      setPassport(null);
      return;
    }

    setIsGeneratingPassport(true);
    setError(null);
    setPassport(null);

    try {
      const response = await fetch("/api/passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: trimmedUrl }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to generate a passport for this repository. Please check the URL and try again.";
        console.log("Passport request failed:", {
          status: response.status,
          data,
        });
        setError(message);
        return;
      }

      setPassport(data as Passport);
    } catch (passportError) {
      console.log("Passport request error:", passportError);
      setError(
        "Could not reach the backend. Make sure the API server is running.",
      );
    } finally {
      setIsGeneratingPassport(false);
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
            disabled={isBusy}
          />
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={isBusy}
            className="rounded-xl bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {isScanning ? "Scanning..." : "Scan Repository"}
          </button>
          <button
            type="button"
            onClick={() => void handlePassport()}
            disabled={isBusy}
            className="rounded-xl border border-zinc-900 bg-white px-6 py-3 font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-100 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {isGeneratingPassport ? "Generating..." : "Generate Passport"}
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

        {passport && (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Codebase Passport
            </h2>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tech Stack
              </h3>
              {passport.tech_stack.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {passport.tech_stack.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                  No tech stack detected.
                </p>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Project Summary
              </h3>
              <p className="mt-2 whitespace-pre-line text-zinc-900 dark:text-zinc-100">
                {passport.project_summary || "No README summary available."}
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                File Tree
              </h3>
              {passport.file_tree.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-900 dark:text-zinc-100">
                  {passport.file_tree.map((path) => (
                    <li key={path} className="font-mono text-sm">
                      {path}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                  No files found.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

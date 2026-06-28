export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          RepoLens
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Frontend is running. Connect this app to the FastAPI backend to get
          started.
        </p>
      </div>
    </main>
  );
}

"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>We couldn’t load this page</h1>
      <p>
        Please check that the application database is running and try again.
      </p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}

import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className="button" href="/overview">
        Back to overview
      </Link>
    </main>
  );
}

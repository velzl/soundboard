import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="hero">
        <span className="hero-kicker">Not found</span>
        <h1>This profile wandered off the map.</h1>
        <p className="lede">
          The page you tried to reach does not exist yet, or the username is not part of the current mock dataset.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/leaderboard">
            Explore leaderboard
          </Link>
          <Link className="button button-secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

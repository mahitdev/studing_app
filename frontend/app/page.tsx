import Link from "next/link";
import LandingClient from "../components/LandingClient";

export default function Home() {
  return (
    <main className="landing dark-landing">
      <header className="landing-nav">
        <h1>Discipline OS</h1>
        <div className="nav-links">
          <Link href="/signin">Sign In</Link>
          <Link href="/signup">Sign Up</Link>
          <LandingClient />
        </div>
      </header>

      <section className="hero-wrap">
        <div className="hero-copy">
          <p className="chip">Student Accountability Platform</p>
          <h2>Track Hard. Stay Ruthless. Win Consistently.</h2>
          <p>
            Built for discipline, not excuses. Daily goals, momentum, reality reports, streak pressure,
            deep analytics, and behavior systems that keep you locked in.
          </p>
          <div className="cta-row">
            <Link className="cta" href="/signup">Start Free</Link>
            <Link className="ghost" href="/signin">I already have an account</Link>
          </div>
        </div>

        <div className="hero-visual">
          <img src="/images/study-hero.svg" alt="Study dashboard illustration" />
          <div className="mini-graph">
            <span style={{ height: "35%" }} />
            <span style={{ height: "54%" }} />
            <span style={{ height: "48%" }} />
            <span style={{ height: "72%" }} />
            <span style={{ height: "92%" }} />
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <h3>Momentum Engine</h3>
          <p>Streak + momentum + comeback mode to prevent drop-off.</p>
        </article>
        <article>
          <h3>Reality Analytics</h3>
          <p>Heatmaps, weekly reports, quality tags, and energy patterns.</p>
        </article>
        <article>
          <h3>Behavior Change</h3>
          <p>Start ritual, time pressure, reflection loops, and anti-cheat focus checks.</p>
        </article>
      </section>
    </main>
  );
}

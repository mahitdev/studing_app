import Link from "next/link";
import LandingClient from "../components/LandingClient";

export default function Home() {
  return (
    <main className="landing dark-landing long-landing">
      <header className="landing-nav">
        <h1 className="glow-title">Discipline OS</h1>
        <div className="nav-links">
          <Link href="/signin">Sign In</Link>
          <Link href="/signup">Sign Up</Link>
          <LandingClient />
        </div>
      </header>

      <section className="hero-wrap">
        <div className="hero-copy">
          <p className="chip">Student Accountability Platform</p>
          <h2 className="glow-headline">Track Hard. Stay Ruthless. Win Consistently.</h2>
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

      <section className="showcase-row">
        <article className="showcase-card">
          <h3 className="glow-sub">Ritual-First Dashboard</h3>
          <p>Start your day ritual, time pressure cues, and consistency score all above the fold.</p>
          <img src="/images/dashboard-showcase.svg" alt="Dashboard showcase" />
        </article>
        <article className="showcase-card">
          <h3 className="glow-sub">Focused Session Arena</h3>
          <p>Animated timer, anti-cheat checks, pause penalties, and session quality grading.</p>
          <img src="/images/focus-showcase.svg" alt="Focus session showcase" />
        </article>
      </section>

      <section className="metrics-band">
        <article>
          <h4>Weekly Reality Report</h4>
          <p>You wasted 2 days this week.</p>
        </article>
        <article>
          <h4>Future Projection</h4>
          <p>Keep this up and you are ahead of 90% students.</p>
        </article>
        <article>
          <h4>Energy Pattern</h4>
          <p>You are strongest at 10 PM and quit most at 6 PM.</p>
        </article>
      </section>

      <section className="wide-visual">
        <div className="wide-copy">
          <p className="chip">Analytics + Accountability</p>
          <h3 className="glow-sub">From Random Effort To Structured Progress</h3>
          <p>
            Heatmap trends, quality tags, comeback mode, micro-goals, and social pressure keep your system honest.
          </p>
          <div className="cta-row">
            <Link className="cta" href="/signup">Create My Plan</Link>
            <Link className="ghost" href="/dashboard">Preview Dashboard</Link>
          </div>
        </div>
        <img src="/images/analytics-showcase.svg" alt="Analytics showcase" />
      </section>

      <section className="feature-grid">
        <article>
          <h3>Glow UI + Dark Mode</h3>
          <p>Night-first visuals built for long study hours with less eye strain.</p>
        </article>
        <article>
          <h3>Behavior Loop</h3>
          <p>Trigger to action to reward loop engineered for discipline retention.</p>
        </article>
        <article>
          <h3>Social Pressure</h3>
          <p>See who is studying now, add friends, and convert peer pressure into output.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <p>Discipline is a system. Build it daily.</p>
        <div className="cta-row">
          <Link className="cta" href="/signup">Start Now</Link>
          <Link className="ghost" href="/signin">Continue</Link>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";
import LandingClient from "../components/LandingClient";
import LandingWaitlistForm from "../components/LandingWaitlistForm";

export default function Home() {
  return (
    <main className="premium-landing">
      <div className="bg-blob blob-a" />
      <div className="bg-blob blob-b" />
      <div className="bg-blob blob-c" />
      <header className="premium-nav reveal">
        <div className="brand">GrindLock</div>
        <div className="premium-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#testimonials">Testimonials</a>
          <Link href="/signin">Sign In</Link>
          <LandingClient />
        </div>
      </header>

      <section className="premium-hero reveal">
        <div className="hero-content">
          <p className="hero-label">Student Productivity Tracker</p>
          <h1>Build focus. Stay consistent. Grow daily.</h1>
          <p className="hero-sub">A calm space to track your progress and stay on track.</p>
          <div className="hero-cta">
            <Link className="cta magnetic pulse-focus" href="/signup">Start Your Journey</Link>
            <Link className="ghost magnetic" href="#how">See How It Works</Link>
            <span className="cta-sparkle" aria-hidden>*</span>
          </div>
          <LandingWaitlistForm />
        </div>

        <div className="hero-mockup-wrap">
          <article className="hero-mockup">
            <div className="mockup-top">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <div className="mockup-grid">
              <div className="mock-timer">
                <p>Focus Timer</p>
                <h3>45:00</h3>
              </div>
              <div className="mock-streak">
                <p>Streak</p>
                <h3>12 days</h3>
              </div>
              <div className="mock-ring">
                <div>
                  <strong className="countup" data-target="78">0%</strong>
                  <span>Goal</span>
                </div>
              </div>
              <div className="mock-progress">
                <p>Progress</p>
                <div><span /></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="features" className="premium-section reveal">
        <div className="section-head">
          <p>Core Features</p>
          <h2>Built for consistency, not motivation spikes</h2>
        </div>
        <div className="feature-cards">
          <article className="interactive-card">
            <span className="icon-chip">FT</span>
            <h3>Focus Tracking</h3>
            <p>Track real deep-work time with session quality and anti-cheat checks.</p>
          </article>
          <article className="interactive-card">
            <span className="icon-chip">SS</span>
            <h3>Streak System</h3>
            <p>Use momentum, recovery mode, and streak pressure to stay accountable.</p>
          </article>
          <article className="interactive-card">
            <span className="icon-chip">SA</span>
            <h3>Smart Analytics</h3>
            <p>See weak days, effort vs result, and long-term trend insights.</p>
          </article>
          <article className="interactive-card">
            <span className="icon-chip">SR</span>
            <h3>Session Replay</h3>
            <p>Review exact daily blocks to understand where focus was won or lost.</p>
          </article>
        </div>
      </section>

      <section id="how" className="premium-section reveal">
        <div className="section-head">
          <p>How It Works</p>
          <h2>Three steps. One disciplined system.</h2>
        </div>
        <div className="how-grid">
          <article>
            <span>1</span>
            <h3>Set your goal</h3>
            <p>Choose daily targets and lock in your preferred study window.</p>
          </article>
          <article>
            <span>2</span>
            <h3>Start focus sessions</h3>
            <p>Run Pomodoro, deep work, or custom sessions with precision tracking.</p>
          </article>
          <article>
            <span>3</span>
            <h3>Build streak</h3>
            <p>Use pressure, analytics, and weekly reports to stay consistent.</p>
          </article>
        </div>
      </section>

      <section id="testimonials" className="premium-section reveal">
        <div className="section-head">
          <p>Testimonials</p>
          <h2>Used by students who execute daily</h2>
        </div>
        <div className="testimonials-grid">
          <article>
            <p>"The streak pressure is exactly what I needed to stop skipping study days."</p>
            <h4>Priya, CS Student</h4>
          </article>
          <article>
            <p>"Effort vs result made me realize I was studying long but not studying smart."</p>
            <h4>Rohit, UPSC Aspirant</h4>
          </article>
          <article>
            <p>"Clean UI, fast timer, and recovery mode kept me from quitting after bad days."</p>
            <h4>Aman, Engineering Student</h4>
          </article>
        </div>
      </section>

      <footer className="premium-footer reveal">
        <div>
          <h3>GrindLock</h3>
          <p>Discipline-first productivity tracker.</p>
        </div>
        <div className="footer-links">
          <Link href="/signup">Start Tracking</Link>
          <Link href="/signin">Sign In</Link>
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
        </div>
        <div className="footer-social">
          <a href="/">X</a>
          <a href="/">In</a>
          <a href="/">Gh</a>
        </div>
      </footer>
    </main>
  );
}

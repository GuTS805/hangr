"use client";

import "./sg.css";
import { useState } from "react";

const COLORS = [
  { name: "Green",       hex: "#58CC02", bg: "rgb(88,204,2)" },
  { name: "Green Hover", hex: "#4BB200", bg: "rgb(75,178,0)" },
  { name: "Blue",        hex: "#1CB0F6", bg: "rgb(28,176,246)" },
  { name: "Dark Blue",   hex: "#100F3E", bg: "rgb(16,15,62)" },
  { name: "Red",         hex: "#FF4B4B", bg: "#FF4B4B" },
  { name: "Orange",      hex: "#FF9600", bg: "#FF9600" },
  { name: "Golden",      hex: "#FFC800", bg: "#FFC800" },
  { name: "Footer Green",hex: "#4EC604", bg: "#4EC604" },
  { name: "Gray Text",   hex: "#4B4B4B", bg: "rgb(75,75,75)" },
  { name: "Gray Light",  hex: "#777777", bg: "rgb(119,119,119)" },
  { name: "Nav Text",    hex: "#AFAFAF", bg: "rgb(175,175,175)" },
  { name: "Border",      hex: "#E5E5E5", bg: "rgb(229,229,229)" },
];

const NAV_LINKS = ["Colors", "Type", "Buttons", "Cards", "Components"];

const FLAGS = {
  es: "https://d35aaqx5ub95lt.cloudfront.net/vendor/59a90a2cedd48b751a8fd22014768fd7.svg",
  fr: "https://d35aaqx5ub95lt.cloudfront.net/vendor/482fda142ee4abd728ebf4ccce5d3307.svg",
  de: "https://d35aaqx5ub95lt.cloudfront.net/vendor/c71db846ffab7e0a74bc6971e34ad82e.svg",
  ja: "https://d35aaqx5ub95lt.cloudfront.net/vendor/edea4fa18ff3e7d8c0282de3f102aaed.svg",
};

export default function StyleGuide() {
  const [t1, setT1] = useState(true);
  const [t2, setT2] = useState(false);

  return (
    <div className="sg">

      {/* ── Navbar ── */}
      <nav className="sg-nav">
        <div className="sg-nav-inner">
          <div className="sg-nav-left">
            <img
              src="https://d35aaqx5ub95lt.cloudfront.net/images/splash/f92d5f2f7d56636846861c458c0d0b6c.svg"
              width={140} height={33} alt="Duolingo"
            />
            <div className="sg-nav-divider" />
            <span className="sg-nav-guide">Style Guide</span>
          </div>
          <div className="sg-nav-right">
            {NAV_LINKS.map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="sg-nav-link">{l}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="sg-hero">
        <h1>duolingo design</h1>
        <p>A comprehensive visual reference for the Duolingo design system covering colors, typography, button variants, cards, and UI components.</p>
        <div className="sg-hero-btns">
          <button className="sg-btn sg-btn-primary">Get Started</button>
          <button className="sg-btn sg-btn-secondary">I Already Have an Account</button>
        </div>
      </section>

      {/* ── Grid ── */}
      <div className="sg-grid">

        {/* Panel 1 — Color Palette */}
        <section className="sg-panel" id="colors">
          <div className="sg-label">Color Palette</div>
          <div className="sg-swatches">
            {COLORS.map((c) => (
              <div key={c.name} className="sg-swatch">
                <div className="sg-swatch-color" style={{ background: c.bg }} />
                <div className="sg-swatch-name">{c.name}</div>
                <div className="sg-swatch-hex">{c.hex}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Panel 2 — Typography */}
        <section className="sg-panel" id="type">
          <div className="sg-label">Typography</div>
          <div className="sg-type-stack">

            <div className="sg-type-row">
              <div className="sg-type-meta">
                <span className="sg-type-sz">48px</span>
                <span className="sg-type-wt">Feather Bold</span>
              </div>
              <span style={{ fontFamily: "'Feather Bold','Nunito',sans-serif", fontSize: 48, color: "var(--green)", fontWeight: "normal", lineHeight: 1 }}>
                Display
              </span>
            </div>

            <div className="sg-type-row">
              <div className="sg-type-meta">
                <span className="sg-type-sz">32px</span>
                <span className="sg-type-wt">Bold 700</span>
              </div>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--gray-text)", lineHeight: 1 }}>
                Heading One
              </span>
            </div>

            <div className="sg-type-row">
              <div className="sg-type-meta">
                <span className="sg-type-sz">28px</span>
                <span className="sg-type-wt">Feather Bold</span>
              </div>
              <span style={{ fontFamily: "'Feather Bold','Nunito',sans-serif", fontSize: 28, color: "var(--green)", fontWeight: "normal", lineHeight: 1 }}>
                heading two
              </span>
            </div>

            <div className="sg-type-row" style={{ alignItems: "flex-start" }}>
              <div className="sg-type-meta" style={{ paddingTop: 3 }}>
                <span className="sg-type-sz">18px</span>
                <span className="sg-type-wt">Medium 500</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 500, color: "var(--gray-light)", lineHeight: 1.6, flex: 1 }}>
                Body text for paragraphs and descriptions with comfortable reading line-height.
              </span>
            </div>

            <div className="sg-type-row">
              <div className="sg-type-meta">
                <span className="sg-type-sz">14px</span>
                <span className="sg-type-wt">Bold 700</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--nav-text)", letterSpacing: "0.5px" }}>
                Caption Label
              </span>
            </div>

            <div className="sg-type-row">
              <div className="sg-type-meta">
                <span className="sg-type-sz">12px</span>
                <span className="sg-type-wt">Semi 600</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-light)" }}>
                Small utility text for metadata and hints
              </span>
            </div>

          </div>
        </section>

        {/* Panel 3 — Button Variants */}
        <section className="sg-panel" id="buttons">
          <div className="sg-label">Button Variants</div>
          <div className="sg-btn-rows">

            <div className="sg-btn-row">
              <span className="sg-btn-row-lbl">Primary</span>
              <button className="sg-btn sg-btn-primary">Get Started</button>
              <button className="sg-btn sg-btn-primary sg-btn-sm">Small</button>
              <button className="sg-btn sg-btn-primary sg-btn-disabled">Disabled</button>
            </div>

            <div className="sg-btn-row">
              <span className="sg-btn-row-lbl">Secondary</span>
              <button className="sg-btn sg-btn-secondary">Learn More</button>
              <button className="sg-btn sg-btn-secondary sg-btn-sm">Small</button>
              <button className="sg-btn sg-btn-secondary sg-btn-disabled">Disabled</button>
            </div>

            <div className="sg-btn-row">
              <span className="sg-btn-row-lbl">Danger</span>
              <button className="sg-btn sg-btn-danger">Delete</button>
              <button className="sg-btn sg-btn-danger sg-btn-sm">Remove</button>
            </div>

            <div className="sg-btn-row">
              <span className="sg-btn-row-lbl">Ghost</span>
              <button className="sg-btn-ghost">View All</button>
            </div>

          </div>
        </section>

        {/* Panel 4 — Dark Theme Buttons */}
        <section className="sg-panel sg-panel-dark">
          <div className="sg-label">Dark Theme</div>
          <div className="sg-btn-rows">

            <div className="sg-btn-row">
              <button className="sg-btn sg-btn-primary">Get Started</button>
              <button className="sg-btn sg-btn-white">Try 1 Week Free</button>
            </div>

            <div className="sg-btn-row">
              <button className="sg-btn sg-btn-primary sg-btn-sm">Get Started</button>
              <button className="sg-btn sg-btn-white sg-btn-sm">Try 1 Week Free</button>
            </div>

          </div>
        </section>

        {/* Panel 5 — Cards */}
        <section className="sg-panel" id="cards">
          <div className="sg-label">Cards</div>
          <div className="sg-cards">

            <div className="sg-card">
              <img
                src="https://images.pexels.com/photos/4145354/pexels-photo-4145354.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop"
                className="sg-card-img" alt=""
              />
              <div className="sg-card-body">
                <span className="sg-card-tag" style={{ color: "var(--green)", background: "rgba(88,204,2,0.10)" }}>New</span>
                <div className="sg-card-title">Spanish for Beginners</div>
                <div className="sg-card-desc">Start your language journey with interactive lessons designed to build fluency.</div>
              </div>
              <div className="sg-card-foot">
                <span className="sg-card-units">12 Units</span>
                <button className="sg-card-action">Start</button>
              </div>
            </div>

            <div className="sg-card">
              <img
                src="https://images.pexels.com/photos/267669/pexels-photo-267669.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop"
                className="sg-card-img" alt=""
              />
              <div className="sg-card-body">
                <span className="sg-card-tag" style={{ color: "var(--blue)", background: "rgba(28,176,246,0.10)" }}>Popular</span>
                <div className="sg-card-title">French Conversations</div>
                <div className="sg-card-desc">Practice real-world dialogue and improve pronunciation with native speakers.</div>
              </div>
              <div className="sg-card-foot">
                <span className="sg-card-units">8 Units</span>
                <button className="sg-card-action">Continue</button>
              </div>
            </div>

          </div>
        </section>

        {/* Panel 6 — Dark Cards */}
        <section className="sg-panel sg-panel-dark">
          <div className="sg-label">Dark Theme Cards</div>
          <div className="sg-cards">

            <div className="sg-card sg-card-dark">
              <div className="sg-card-body">
                <span className="sg-card-tag" style={{ color: "#FFC800", background: "rgba(255,200,0,0.15)" }}>Super</span>
                <div className="sg-card-title">Unlimited Hearts</div>
                <div className="sg-card-desc">Keep learning without interruption with Super Duolingo benefits.</div>
              </div>
              <div className="sg-card-foot">
                <span className="sg-card-units">Premium</span>
                <button className="sg-card-action">Upgrade</button>
              </div>
            </div>

            <div className="sg-card sg-card-dark">
              <div className="sg-card-body">
                <span className="sg-card-tag" style={{ color: "#FF9600", background: "rgba(255,150,0,0.15)" }}>Pro</span>
                <div className="sg-card-title">Mastery Quizzes</div>
                <div className="sg-card-desc">Challenge yourself with advanced assessments to test your skill level.</div>
              </div>
              <div className="sg-card-foot">
                <span className="sg-card-units">Advanced</span>
                <button className="sg-card-action">Try Now</button>
              </div>
            </div>

          </div>
        </section>

        {/* Panel 7 — Components */}
        <section className="sg-panel" id="components">
          <div className="sg-label">Components</div>
          <div className="sg-comp-stack">

            {/* Badges */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Badges</span>
              <div className="sg-badges">
                <span className="sg-badge" style={{ color: "var(--green)",  background: "rgba(88,204,2,0.12)" }}>Completed</span>
                <span className="sg-badge" style={{ color: "var(--blue)",   background: "rgba(28,176,246,0.12)" }}>In Progress</span>
                <span className="sg-badge" style={{ color: "var(--red)",    background: "rgba(255,75,75,0.12)" }}>Failed</span>
                <span className="sg-badge" style={{ color: "var(--orange)", background: "rgba(255,150,0,0.12)" }}>Streak</span>
                <span className="sg-badge" style={{ color: "#b8920f",       background: "rgba(255,200,0,0.15)" }}>Premium</span>
              </div>
            </div>

            {/* Input */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Input + Button</span>
              <div className="sg-input-row">
                <input className="sg-input" placeholder="Enter your email…" />
                <button className="sg-btn sg-btn-primary">Subscribe</button>
              </div>
            </div>

            {/* Toggle */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Toggle</span>
              <div className="sg-toggles">
                <label className="sg-toggle-row" onClick={() => setT1(!t1)}>
                  <div className={`sg-track ${t1 ? "on" : ""}`}><div className="sg-thumb" /></div>
                  <span className="sg-toggle-lbl">Sound effects</span>
                </label>
                <label className="sg-toggle-row" onClick={() => setT2(!t2)}>
                  <div className={`sg-track ${t2 ? "on" : ""}`}><div className="sg-thumb" /></div>
                  <span className="sg-toggle-lbl">Animations</span>
                </label>
              </div>
            </div>

            {/* Progress */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Progress</span>
              <div className="sg-progress-list">
                {[
                  { pct: 85, fill: "var(--green)" },
                  { pct: 60, fill: "var(--blue)" },
                  { pct: 35, fill: "var(--orange)" },
                ].map(({ pct, fill }) => (
                  <div key={pct} className="sg-progress-row">
                    <div className="sg-progress-bar">
                      <div className="sg-progress-fill" style={{ width: `${pct}%`, background: fill }} />
                    </div>
                    <span className="sg-progress-val">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tooltip & Streak */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Tooltips &amp; Streak</span>
              <div className="sg-tts">
                <div className="sg-tip-wrap">
                  <button className="sg-tip-trigger">Hover me</button>
                  <div className="sg-tip-bubble">You earned 10 XP! 🎉</div>
                </div>
                <div className="sg-streak">
                  <span style={{ fontSize: 18 }}>🔥</span>
                  <span>42</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Panel 8 — Dark Components */}
        <section className="sg-panel sg-panel-dark">
          <div className="sg-label">Dark Theme Components</div>
          <div className="sg-comp-stack">

            {/* Language pills */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Language Pills</span>
              <div className="sg-pills">
                {[
                  { code: "es", label: "Spanish", flag: FLAGS.es, active: true },
                  { code: "fr", label: "French",  flag: FLAGS.fr },
                  { code: "de", label: "German",  flag: FLAGS.de },
                  { code: "ja", label: "Japanese",flag: FLAGS.ja },
                ].map(({ code, label, flag, active }) => (
                  <button key={code} className={`sg-pill ${active ? "active" : ""}`}>
                    <img src={flag} alt={label} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar group */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Avatar Group</span>
              <div className="sg-av-group">
                <div className="sg-av-stack">
                  <img className="sg-av" src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" />
                  <img className="sg-av" src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" />
                  <img className="sg-av" src="https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop" alt="" />
                  <div className="sg-av-more">+5</div>
                </div>
                <span className="sg-av-txt">8 learners active</span>
              </div>
            </div>

            {/* Dark progress */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Progress</span>
              <div className="sg-progress-list sg-progress-dark">
                {[
                  { pct: 72, fill: "var(--golden)" },
                  { pct: 45, fill: "var(--green)" },
                ].map(({ pct, fill }) => (
                  <div key={pct} className="sg-progress-row">
                    <div className="sg-progress-bar">
                      <div className="sg-progress-fill" style={{ width: `${pct}%`, background: fill }} />
                    </div>
                    <span className="sg-progress-val">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dark badges */}
            <div className="sg-comp-group">
              <span className="sg-comp-lbl">Badges</span>
              <div className="sg-badges">
                <span className="sg-badge" style={{ color: "#7ADB2E", background: "rgba(88,204,2,0.15)" }}>Mastered</span>
                <span className="sg-badge" style={{ color: "#4DC4F8", background: "rgba(28,176,246,0.15)" }}>Review</span>
                <span className="sg-badge" style={{ color: "#FFC800", background: "rgba(255,200,0,0.15)" }}>Crown</span>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}

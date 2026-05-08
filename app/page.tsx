'use client';

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openEntry, setOpenEntry] = useState<number | null>(null);
  const toggleEntry = (i: number) => setOpenEntry(prev => prev === i ? null : i);
  const heroLineRef = useRef<HTMLHeadingElement>(null);
  const heroInnerRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Fit text first, then run intro animation sequentially to avoid measurement conflict
  useEffect(() => {
    const heroLine = heroLineRef.current;
    const heroInner = heroInnerRef.current;
    if (!heroLine || !heroInner) return;

    let rafId: number;

    function fitText() {
      heroInner!.style.transform = ''; // must clear any scale before measuring
      const targetW = document.documentElement.clientWidth * 0.70;
      const range = document.createRange();
      range.selectNodeContents(heroLine!);
      let lo = 10, hi = 600;
      while (hi - lo > 0.25) {
        const mid = (lo + hi) / 2;
        heroLine!.style.fontSize = mid + 'px';
        if (range.getBoundingClientRect().width <= targetW) lo = mid;
        else hi = mid;
      }
      heroLine!.style.fontSize = lo + 'px';
    }

    document.fonts.ready.then(() => {
      fitText();

      // With transform-origin: left center, scale(S) expands from left edge.
      // translateX(-70%) at scale 4 shifts viewport to show "szeto." portion.
      // Text slides in from right as a block, then zooms out.
      // translateX(tx) scale(S) means: zoom S-fold around element center, then shift tx vw.
      const DURATION   = 4000;
      const SLIDE_FRAC = 0.65; // 65% slide (~2.6s), 35% zoom-out (~1.4s — faster)
      const SCALE   = 1.5;
      const START_TX =  150; // vw — "hi," starts fully off-screen right
      const END_TX   = -15;  // vw — centers "szeto." on screen before zoom-out
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      let start = 0;

      function frame(now: number) {
        const raw = Math.min(1, (now - start) / DURATION);
        let scale: number, tx: number;

        if (raw < SLIDE_FRAC) {
          const p = ease(raw / SLIDE_FRAC);
          scale = SCALE;
          tx = START_TX + (END_TX - START_TX) * p; // 150vw → -55vw
        } else {
          const p = ease((raw - SLIDE_FRAC) / (1 - SLIDE_FRAC));
          scale = SCALE - (SCALE - 1) * p; // 2 → 1
          tx = END_TX * (1 - p);           // -55vw → 0
        }

        heroInner!.style.transform = `translateX(${tx}vw) scale(${scale})`;

        if (raw < 1) {
          rafId = requestAnimationFrame(frame);
        } else {
          heroInner!.style.transform = '';
        }
      }

      // Park text off-screen immediately so there's no flash during the delay
      heroInner!.style.transform = `translateX(${START_TX}vw) scale(${SCALE})`;
      setTimeout(() => {
        start = performance.now(); // capture start time right before first frame
        rafId = requestAnimationFrame(frame);
      }, 550);
    });

    const onResize = () => { cancelAnimationFrame(rafId); fitText(); };
    window.addEventListener('resize', onResize, { passive: true });
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', onResize); };
  }, []);

  // Scroll-driven chrome — dark at rest, silver sweeps as hero scrolls out
  useEffect(() => {
    const el = heroLineRef.current;
    if (!el) return;

    function updateChrome() {
      const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.5));
      const pos = (-120 + progress * 340).toFixed(2);
      el!.style.backgroundImage =
        `radial-gradient(ellipse 100% 120% at ${pos}% 60%, #1a4fd4 0%, #002fa7 25%, #001a7a 55%, #000838 80%, #201c18 100%)`;
    }

    updateChrome();
    window.addEventListener('scroll', updateChrome, { passive: true });
    return () => window.removeEventListener('scroll', updateChrome);
  }, []);

  // Custom cursor + spotlight
  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    let mouseX = -80, mouseY = -80, ringX = -80, ringY = -80;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top  = mouseY + 'px';
      const lx = (e.clientX / window.innerWidth  * 100).toFixed(1) + '%';
      const ly = (e.clientY / window.innerHeight * 100).toFixed(1) + '%';
      document.documentElement.style.setProperty('--light-x', lx);
      document.documentElement.style.setProperty('--light-y', ly);
    };

    function tick() {
      ringX += (mouseX - ringX) * 0.13;
      ringY += (mouseY - ringY) * 0.13;
      ring!.style.left = ringX + 'px';
      ring!.style.top  = ringY + 'px';
      rafId = requestAnimationFrame(tick);
    }

    document.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(tick);

    const interactables = document.querySelectorAll('a, button, .project');
    interactables.forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.transform = 'translate(-50%,-50%) scale(2.5)';
        ring!.style.borderColor = 'rgba(32,28,24,0.5)';
      });
      el.addEventListener('mouseleave', () => {
        dot.style.transform = 'translate(-50%,-50%) scale(1)';
        ring!.style.borderColor = 'rgba(32,28,24,0.28)';
      });
    });

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Nav scroll + active link
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function onScroll() {
      nav!.classList.toggle('scrolled', window.scrollY > 48);
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach(s => {
        if (window.scrollY >= (s as HTMLElement).offsetTop - 130) current = s.id;
      });
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = Number((entry.target as HTMLElement).dataset.delay || 0) * 130;
        setTimeout(() => entry.target.classList.add('in-view'), delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div id="cursor" ref={cursorDotRef} />
      <div id="cursor-follower" ref={cursorRingRef} />

      {/* ── NAV ── */}
      <nav id="nav" ref={navRef}>
        <a href="#hero" className="nav-logo">bs.</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.4rem' }}>
          {/* Links slide in from right */}
          <div style={{
            display: 'flex',
            gap: '2.4rem',
            alignItems: 'center',
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateX(0)' : 'translateX(16px)',
            pointerEvents: menuOpen ? 'all' : 'none',
            transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            <a href="#about"   className="nav-link" onClick={() => setMenuOpen(false)}>about</a>
            <a href="#work"    className="nav-link" onClick={() => setMenuOpen(false)}>work</a>
            <a href="#resume"  className="nav-link" onClick={() => setMenuOpen(false)}>resume</a>
            <a href="#contact" className="nav-link" onClick={() => setMenuOpen(false)}>contact</a>
          </div>
          {/* Two vertical lines → X */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ position: 'relative', width: '16px', height: '16px', background: 'none', border: 'none', cursor: 'none', flexShrink: 0 }}
          >
            <span style={{
              position: 'absolute',
              width: '1px',
              height: '16px',
              background: '#201c18',
              top: '50%',
              left: menuOpen ? '50%' : '4px',
              transform: menuOpen ? 'translate(-50%, -50%) rotate(45deg)' : 'translateY(-50%)',
              transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), left 0.4s cubic-bezier(0.22,1,0.36,1)',
            }} />
            <span style={{
              position: 'absolute',
              width: '1px',
              height: '16px',
              background: '#201c18',
              top: '50%',
              left: menuOpen ? '50%' : '11px',
              transform: menuOpen ? 'translate(-50%, -50%) rotate(-45deg)' : 'translateY(-50%)',
              transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), left 0.4s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" id="hero">
        <div className="hero-inner" ref={heroInnerRef}>
          <h1 className="hero-line" ref={heroLineRef}>hi, i&apos;m bowie szeto.</h1>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="section" id="about">
        <p className="eyebrow">01 — about</p>
        <p className="about-statement reveal">
          I think in stories,<br />work in numbers.
        </p>
        <div className="about-grid">
          <div className="about-main">
            <p className="about-lead reveal">
              <span style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}>你好!</span> I&apos;m Bowie — a strategist, analyst, and creative based between Hong Kong and San Diego.
            </p>
            <p className="about-body reveal">
              I study Business Economics at UCSD&apos;s Rady School of Management, where I&apos;ve built a practice around financial modeling, operational strategy, and brand storytelling. I&apos;m drawn to the places where precision meets taste — where a good spreadsheet and a sharp editorial eye point toward the same answer.
              <br /><br />
              Fashion, data, and narrative are my three obsessions. I&apos;m happiest when I get to use all three at once.
            </p>
          </div>
          <aside className="about-aside">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/headshot.jpg" alt="Bowie Szeto" className="about-photo" />
            <div className="meta-row">
              <span className="meta-label">based in</span>
              <span className="meta-val">hong kong</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">focus</span>
              <span className="meta-val">strategy · analytics · editorial</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">interests</span>
              <span className="meta-val">fashion · data · narrative</span>
            </div>
          </aside>
        </div>
      </section>

      {/* ── WORK ── */}
      <section className="section" id="work">
        <p className="eyebrow">02 — selected work</p>
        <div className="work-list">

          <article className="project reveal" data-delay="0">
            <span className="proj-num">01</span>
            <div className="proj-body">
              <h3 className="proj-name">seasonal fashion insights</h3>
              <p className="proj-desc">Analyzed runway and consumer data to shape a seasonal merchandising framework for a premium fashion label — translating audience behavior into refined commercial positioning.</p>
              <ul className="proj-tags">
                <li>fashion</li><li>market analysis</li><li>strategy</li>
              </ul>
            </div>
            <span className="proj-arrow">→</span>
          </article>

          <article className="project reveal" data-delay="1">
            <span className="proj-num">02</span>
            <div className="proj-body">
              <h3 className="proj-name">revenue optimization system</h3>
              <p className="proj-desc">Built a profitability model and executive dashboard to prioritize high-margin growth opportunities — clean KPIs surfaced from complex SQL, presented with intentional visual clarity.</p>
              <ul className="proj-tags">
                <li>finance</li><li>SQL</li><li>dashboards</li>
              </ul>
            </div>
            <span className="proj-arrow">→</span>
          </article>

          <article className="project reveal" data-delay="2">
            <span className="proj-num">03</span>
            <div className="proj-body">
              <h3 className="proj-name">luxury collection narrative</h3>
              <p className="proj-desc">Defined a refined launch concept and visual story for a high-end fashion drop — audience behavior, commercial targets, and editorial voice unified into a single direction.</p>
              <ul className="proj-tags">
                <li>brand strategy</li><li>editorial</li><li>creative direction</li>
              </ul>
            </div>
            <span className="proj-arrow">→</span>
          </article>

          <article className="project reveal" data-delay="3">
            <span className="proj-num">04</span>
            <div className="proj-body">
              <h3 className="proj-name">strategic performance cockpit</h3>
              <p className="proj-desc">Designed a polished analytics view for business decision-making — an executive-facing system where every number has context, every chart earns its place.</p>
              <ul className="proj-tags">
                <li>analytics</li><li>consulting</li><li>visualization</li>
              </ul>
            </div>
            <span className="proj-arrow">→</span>
          </article>

        </div>
      </section>

      {/* ── RESUME ── */}
      <section className="section" id="resume">
        <p className="eyebrow">03 — résumé</p>
        <div className="resume-grid">

          <div className="resume-col">
            <h3 className="resume-col-label">experience</h3>

            {[
              {
                year: <>Jul 2025 –<br />Jan 2026</>,
                role: 'Finance & Business Operations Analyst',
                org: 'Ame Gemella',
                bullets: [
                  'Designed P&L, FP&A dashboards, and revenue forecasting model to analyze e-commerce fees and inform financial planning',
                  'Drove data-driven decision making, implementing cost-plus pricing strategy and scenario testing for the launch of 2 new products',
                  'Supported month-end financial reporting by conducting variance analysis and providing actionable recommendations to improve profitability',
                  'Created digital marketing materials that generated 50K+ views and 615 interactions, a 10x increase month-over-month',
                ],
              },
              {
                year: <>Dec 2023 –<br />Mar 2026</>,
                role: 'Made TO Order Manager',
                org: 'Triton Outfitters',
                bullets: [
                  'Closed 30+ orders generating over $70,000 in revenue using QuickBooks and Shopify to create custom invoices and collect payment',
                  "Reduced costs by 15% on applicable student orders by negotiating exemptions from UCSD's trademark licensing fees",
                  'Reconciled $20,000+ in procurement expenses monthly using SAP to create financial reports tracking COGS and payment receipts',
                  'Onboarded and managed a team of 3 sales associates, training them on order fulfillment and overseeing order delegation',
                ],
              },
              {
                year: <>Jun 2024 –<br />Jun 2025</>,
                role: 'President',
                org: 'Alpha Kappa Psi',
                bullets: [
                  'Managed a $10,000 chapter fund and worked with the VP of Finance to organize fundraisers and budget for events and national fees',
                  'Organized a multi-channel marketing campaign that brought in 1,000+ prospective members to recruitment events',
                  'Oversaw 8 Executive Committee members in key functions including philanthropy events and inter-chapter mixers',
                  'Planned and coordinated a 5-week educational program for potential new members with industry presentations and professional development workshops',
                ],
              },
            ].map((entry, i) => (
              <div key={i} className="r-entry reveal" data-delay={i} style={{ cursor: 'none' }}>
                <span className="r-year">{entry.year}</span>
                <div>
                  <button
                    onClick={() => toggleEntry(i)}
                    style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'none', padding: 0, textAlign: 'left' }}
                  >
                    <div>
                      <h4 className="r-role">{entry.role}</h4>
                      <p className="r-org">{entry.org}</p>
                    </div>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, marginLeft: '1rem', transition: 'transform 0.4s var(--ease)', transform: openEntry === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <polyline points="1,5 5,1 9,5" stroke="var(--faint)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <div style={{ display: 'grid', gridTemplateRows: openEntry === i ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s var(--ease)' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <ul className="r-bullets" style={{ marginTop: '0.6rem' }}>
                        {entry.bullets.map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="resume-col">
            <h3 className="resume-col-label">education</h3>
            <div className="r-entry reveal">
              <span className="r-year">2022 – 2026</span>
              <div>
                <h4 className="r-role">UC San Diego · Rady School of Management</h4>
                <p className="r-org">B.S. Business Economics, Minor in Finance</p>
              </div>
            </div>

            <h3 className="resume-col-label" style={{ marginTop: '2.8rem' }}>core skills</h3>
            <p className="resume-skills reveal">
              SQL · profitability analysis · executive dashboards ·
              market trends · consulting frameworks · business storytelling ·
              brand strategy · visual analytics
            </p>
          </div>

        </div>
        <div className="resume-cta reveal">
          <a href="/resume.pdf" className="btn-outline" download>download résumé ↓</a>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="section section--contact" id="contact">
        <p className="eyebrow">04 — contact</p>
        <h2 className="contact-hl reveal">let&apos;s build<br />something.</h2>
        <div className="contact-links reveal">
          <a href="mailto:szetobowie8@gmail.com" className="contact-link">email</a>
          <a href="https://www.linkedin.com/in/szetobowie/" className="contact-link" target="_blank" rel="noopener noreferrer">linkedin</a>
          <a href="https://github.com/bowieszeto" className="contact-link" target="_blank" rel="noopener noreferrer">github</a>
        </div>
        <footer className="site-footer">
          <p>© 2025 bowie szeto</p>
        </footer>
      </section>
    </>
  );
}

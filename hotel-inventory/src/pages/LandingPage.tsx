import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const landingStyles = `
  .landing-page {
    --lp-primary: #0f172a;
    --lp-primary-light: #1e293b;
    --lp-accent: #3b82f6;
    --lp-accent-light: #60a5fa;
    --lp-success: #10b981;
    --lp-warning: #f59e0b;
    --lp-danger: #ef4444;
    --lp-bg: #f8fafc;
    --lp-card: #ffffff;
    --lp-text: #334155;
    --lp-text-light: #94a3b8;
    --lp-border: #e2e8f0;

    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--lp-bg);
    color: var(--lp-text);
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }

  .landing-page *, .landing-page *::before, .landing-page *::after {
    box-sizing: border-box;
  }

  /* Navigation */
  .lp-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    z-index: 100;
    padding: 0 2rem;
  }

  .lp-nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }

  .lp-nav-logo {
    color: white;
    font-weight: 700;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lp-nav-links { display: flex; gap: 8px; align-items: center; }

  .lp-nav-links a {
    color: #94a3b8;
    text-decoration: none;
    font-size: 0.85rem;
    padding: 6px 14px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .lp-nav-links a:hover {
    color: white;
    background: rgba(255,255,255,0.1);
  }

  .lp-nav-login {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    background: var(--lp-accent) !important;
    color: white !important;
    padding: 8px 20px !important;
    border-radius: 8px !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    transition: all 0.2s !important;
    margin-left: 8px;
  }

  .lp-nav-login:hover {
    background: #2563eb !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59,130,246,0.4);
  }

  .lp-nav-login-mobile {
    display: none;
  }

  .lp-hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--lp-accent);
    color: white;
    padding: 14px 32px;
    border-radius: 12px;
    font-size: 1.05rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s;
    box-shadow: 0 4px 20px rgba(59,130,246,0.3);
  }

  .lp-hero-cta:hover {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(59,130,246,0.5);
    color: white;
  }

  .lp-hero-cta svg { transition: transform 0.2s; }
  .lp-hero-cta:hover svg { transform: translateX(4px); }

  /* Sections */
  .lp-slide {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 2rem 2rem;
  }

  .lp-slide-content {
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
  }

  /* Hero */
  .lp-hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    color: white;
    position: relative;
    overflow: hidden;
  }

  .lp-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }

  .lp-hero::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -10%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  .lp-hero .lp-slide-content { position: relative; z-index: 1; }

  .lp-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(59,130,246,0.2);
    border: 1px solid rgba(59,130,246,0.3);
    color: var(--lp-accent-light);
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 2rem;
  }

  .lp-hero h1 {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .lp-hero h1 .lp-gradient {
    background: linear-gradient(90deg, var(--lp-accent-light), var(--lp-success));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lp-hero p {
    font-size: 1.25rem;
    color: #94a3b8;
    max-width: 600px;
    margin-bottom: 2.5rem;
  }

  .lp-hero-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-top: 3rem;
  }

  .lp-hero-stat {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 1.5rem;
    text-align: center;
  }

  .lp-hero-stat-value {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
  }

  .lp-hero-stat-label {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  /* Section headers */
  .lp-section-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .lp-section-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--lp-accent);
    color: white;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .lp-section-header h2 {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--lp-primary);
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
  }

  .lp-section-header p {
    color: var(--lp-text-light);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  /* Problems */
  .lp-problems-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .lp-problem-card {
    background: white;
    border: 1px solid var(--lp-border);
    border-radius: 16px;
    padding: 2rem;
    display: flex;
    gap: 1rem;
    transition: all 0.3s;
  }

  .lp-problem-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
  }

  .lp-problem-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .lp-problem-icon.red { background: #fef2f2; color: var(--lp-danger); }
  .lp-problem-icon.orange { background: #fff7ed; color: var(--lp-warning); }
  .lp-problem-icon.yellow { background: #fefce8; color: #ca8a04; }
  .lp-problem-icon.purple { background: #faf5ff; color: #9333ea; }

  .lp-problem-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--lp-primary); margin-bottom: 0.5rem; }
  .lp-problem-card p { font-size: 0.9rem; color: var(--lp-text-light); margin: 0; }

  /* Features */
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .lp-feature-card {
    background: white;
    border: 1px solid var(--lp-border);
    border-radius: 16px;
    padding: 2rem;
    transition: all 0.3s;
  }

  .lp-feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    border-color: var(--lp-accent);
  }

  .lp-feature-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
  }

  .lp-feature-icon.blue { background: #eff6ff; }
  .lp-feature-icon.green { background: #ecfdf5; }
  .lp-feature-icon.amber { background: #fffbeb; }
  .lp-feature-icon.violet { background: #f5f3ff; }
  .lp-feature-icon.rose { background: #fff1f2; }
  .lp-feature-icon.cyan { background: #ecfeff; }

  .lp-feature-card h3 { font-size: 1.05rem; font-weight: 700; color: var(--lp-primary); margin-bottom: 0.5rem; }
  .lp-feature-card p { font-size: 0.88rem; color: var(--lp-text-light); line-height: 1.5; margin: 0; }

  /* Comparison table */
  .lp-comparison-table { width: 100%; background: white; border-radius: 20px; overflow: hidden; border: 1px solid var(--lp-border); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  .lp-comparison-table table { width: 100%; border-collapse: collapse; }
  .lp-comparison-table thead { background: var(--lp-primary); color: white; }
  .lp-comparison-table th { padding: 1.25rem 1.5rem; text-align: left; font-weight: 600; font-size: 0.9rem; }
  .lp-comparison-table td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--lp-border); font-size: 0.9rem; }
  .lp-comparison-table tr:last-child td { border-bottom: none; }
  .lp-comparison-table tr:hover { background: #f8fafc; }
  .lp-check { color: var(--lp-success); font-weight: 700; font-size: 1.2rem; }

  /* ROI */
  .lp-roi-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
  .lp-roi-left { background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 20px; padding: 2.5rem; color: white; }
  .lp-roi-left h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; }
  .lp-roi-item { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .lp-roi-item:last-child { border-bottom: none; }
  .lp-roi-item-icon { width: 40px; height: 40px; background: rgba(16,185,129,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lp-roi-item-value { font-size: 1.3rem; font-weight: 700; color: var(--lp-success); }
  .lp-roi-item-label { font-size: 0.85rem; color: #94a3b8; }
  .lp-roi-right { display: flex; flex-direction: column; gap: 1.5rem; }
  .lp-roi-card { background: white; border: 1px solid var(--lp-border); border-radius: 16px; padding: 1.75rem; }
  .lp-roi-card h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--lp-text-light); margin-bottom: 0.5rem; }
  .lp-roi-card .lp-value { font-size: 2rem; font-weight: 800; color: var(--lp-primary); }
  .lp-roi-card .lp-value.green { color: var(--lp-success); }
  .lp-roi-card .lp-detail { font-size: 0.85rem; color: var(--lp-text-light); margin-top: 0.5rem; }

  /* Investment */
  .lp-investment-center { display: flex; flex-direction: column; align-items: center; gap: 2rem; }
  .lp-price-card { background: white; border: 2px solid var(--lp-accent); border-radius: 24px; padding: 3rem 4rem; text-align: center; position: relative; box-shadow: 0 10px 60px rgba(59,130,246,0.15); }
  .lp-price-card-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--lp-accent); color: white; padding: 6px 20px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
  .lp-price-label { font-size: 0.9rem; color: var(--lp-text-light); margin-bottom: 0.5rem; }
  .lp-price-amount { font-size: 4rem; font-weight: 900; color: var(--lp-primary); line-height: 1; }
  .lp-price-amount span { font-size: 1.5rem; font-weight: 500; color: var(--lp-text-light); }
  .lp-price-period { font-size: 0.95rem; color: var(--lp-text-light); margin-top: 0.5rem; }
  .lp-price-includes { margin-top: 2rem; text-align: left; }
  .lp-price-includes h4 { font-size: 0.85rem; font-weight: 600; color: var(--lp-primary); margin-bottom: 1rem; }
  .lp-price-check { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 0.9rem; color: var(--lp-text); }
  .lp-price-check-icon { color: var(--lp-success); font-weight: 700; }

  .lp-context-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; width: 100%; }
  .lp-context-card { background: white; border: 1px solid var(--lp-border); border-radius: 16px; padding: 1.75rem; text-align: center; }
  .lp-context-card .lp-emoji { font-size: 2rem; margin-bottom: 0.75rem; }
  .lp-context-card h4 { font-size: 0.95rem; font-weight: 700; color: var(--lp-primary); margin-bottom: 0.25rem; }
  .lp-context-card p { font-size: 0.82rem; color: var(--lp-text-light); margin: 0; }

  /* CTA */
  .lp-cta-section { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: white; text-align: center; padding: 6rem 2rem; }
  .lp-cta-section h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; }
  .lp-cta-section > div > p { color: #94a3b8; font-size: 1.15rem; margin-bottom: 2.5rem; max-width: 600px; margin-left: auto; margin-right: auto; }
  .lp-cta-benefits { display: flex; justify-content: center; gap: 3rem; margin-bottom: 3rem; flex-wrap: wrap; }
  .lp-cta-benefit { display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 0.95rem; }
  .lp-cta-benefit-icon { color: var(--lp-success); }

  /* Complexity */
  .lp-tech-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
  .lp-tech-card { background: white; border: 1px solid var(--lp-border); border-radius: 16px; padding: 2rem; }
  .lp-tech-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1.25rem; }
  .lp-tech-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lp-tech-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--lp-primary); margin: 0; }
  .lp-tech-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; color: var(--lp-text-light); }
  .lp-tech-list li { display: flex; gap: 8px; }
  .lp-tech-list .lp-bullet { font-weight: 600; }

  /* Animations */
  @keyframes lpFadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lp-animate { animation: lpFadeInUp 0.6s ease-out forwards; }

  /* Responsive */
  @media (max-width: 768px) {
    .lp-hero h1 { font-size: 2.25rem; }
    .lp-hero-stats { grid-template-columns: 1fr; }
    .lp-problems-grid { grid-template-columns: 1fr; }
    .lp-features-grid { grid-template-columns: 1fr; }
    .lp-roi-container { grid-template-columns: 1fr; }
    .lp-context-row { grid-template-columns: 1fr; }
    .lp-tech-grid { grid-template-columns: 1fr; }
    .lp-price-card { padding: 2rem; }
    .lp-price-amount { font-size: 3rem; }
    .lp-nav-links { display: none; }
    .lp-nav-login-mobile {
      display: inline-flex !important;
      align-items: center;
      gap: 6px;
      background: var(--lp-accent);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
    }
    .lp-hero-cta { font-size: 0.95rem; padding: 12px 24px; }
    .lp-comparison-table { overflow-x: auto; }
    .lp-cta-section h2 { font-size: 1.8rem; }
  }
`

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-animate')
          }
        })
      },
      { threshold: 0.1 }
    )

    const el = containerRef.current
    if (el) {
      el.querySelectorAll('.lp-problem-card, .lp-feature-card, .lp-roi-card, .lp-context-card, .lp-roi-left, .lp-tech-card').forEach((node) => {
        observer.observe(node)
      })
    }

    // Active nav link on scroll
    const handleScroll = () => {
      if (!el) return
      const sections = el.querySelectorAll('.lp-slide, .lp-cta-section')
      const navLinks = el.querySelectorAll('.lp-nav-links a:not(.lp-nav-login)')
      let current = ''
      sections.forEach((section) => {
        const top = (section as HTMLElement).offsetTop - 100
        if (window.scrollY >= top) current = section.getAttribute('id') || ''
      })
      navLinks.forEach((link) => {
        const anchor = link as HTMLAnchorElement
        anchor.style.color = anchor.getAttribute('href') === '#' + current ? 'white' : '#94a3b8'
      })
    }

    window.addEventListener('scroll', handleScroll)

    // Smooth scroll for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault()
        const id = target.getAttribute('href')!.slice(1)
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    el?.addEventListener('click', handleAnchorClick)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
      el?.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return (
    <div className="landing-page" ref={containerRef}>
      <style>{landingStyles}</style>

      {/* Navigation */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-logo">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            Inventario Tiempo Real
          </div>
          <div className="lp-nav-links">
            <a href="#inicio">Inicio</a>
            <a href="#problema">Problema</a>
            <a href="#solucion">Solución</a>
            <a href="#funciones">Funciones</a>
            <a href="#complejidad">Tecnología</a>
            <a href="#roi">ROI</a>
            <a href="#inversion">Inversión</a>
            <Link to="/login" className="lp-nav-login">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Iniciar Sesión
            </Link>
          </div>
          <Link to="/login" className="lp-nav-login-mobile">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Ingresar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-slide lp-hero" id="inicio">
        <div className="lp-slide-content">
          <div className="lp-hero-badge">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Sistema desarrollado a medida para Casa Sanz &amp; Hotel Bidasoa
          </div>
          <h1>
            Control Total de<br/>
            Inventario <span className="lp-gradient">en Tiempo Real</span>
          </h1>
          <p>
            Plataforma web inteligente que centraliza el inventario de 3 ubicaciones,
            automatiza alertas basadas en ventas reales y elimina el descontrol de stock.
          </p>
          <Link to="/login" className="lp-hero-cta">
            Acceder al Sistema
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </Link>
          <div className="lp-hero-stats">
            <div className="lp-hero-stat">
              <div className="lp-hero-stat-value" style={{ color: 'var(--lp-accent-light)' }}>3</div>
              <div className="lp-hero-stat-label">Ubicaciones gestionadas<br/>(Bodega + 2 Bares)</div>
            </div>
            <div className="lp-hero-stat">
              <div className="lp-hero-stat-value" style={{ color: 'var(--lp-success)' }}>906</div>
              <div className="lp-hero-stat-label">Recetas del POS analizadas<br/>(datos reales 2024-2025)</div>
            </div>
            <div className="lp-hero-stat">
              <div className="lp-hero-stat-value" style={{ color: 'var(--lp-warning)' }}>24/7</div>
              <div className="lp-hero-stat-label">Monitoreo continuo<br/>con alertas por email</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="lp-slide" id="problema">
        <div className="lp-slide-content">
          <div className="lp-section-header">
            <div className="lp-section-number">1</div>
            <h2>El Problema Actual</h2>
            <p>Situaciones que generan pérdidas operativas y económicas día a día</p>
          </div>
          <div className="lp-problems-grid">
            <div className="lp-problem-card">
              <div className="lp-problem-icon red">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3>Quiebres de stock inesperados</h3>
                <p>Productos agotados en pleno servicio. El bartender descubre que no hay vodka o espumante a las 9pm un viernes. Se pierden ventas directas y se afecta la experiencia del cliente.</p>
              </div>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon orange">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div>
                <h3>Pedidos a bodega informales</h3>
                <p>Solicitudes por WhatsApp, papeles o de boca en boca. Se pierden, se olvidan o se duplican. No hay trazabilidad de quién pidió qué ni cuándo fue aprobado.</p>
              </div>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon yellow">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <div>
                <h3>Cero visibilidad entre ubicaciones</h3>
                <p>No se sabe cuánto stock hay en cada bar ni en la bodega hasta ir físicamente a contar. Imposible planificar compras o redistribuir productos eficientemente.</p>
              </div>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon purple">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <div>
                <h3>Decisiones sin datos</h3>
                <p>Las compras se basan en intuición, no en consumo real. No se sabe qué productos rotan más, cuánto se vende un fin de semana vs. un lunes, ni cuál es el stock mínimo seguro.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solución */}
      <section className="lp-slide" id="solucion" style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)' }}>
        <div className="lp-slide-content">
          <div className="lp-section-header">
            <div className="lp-section-number">2</div>
            <h2>La Solución</h2>
            <p>Un sistema centralizado, inteligente y accesible desde cualquier dispositivo</p>
          </div>
          <div className="lp-comparison-table">
            <table>
              <thead>
                <tr><th>Aspecto</th><th>Hoy (sin sistema)</th><th>Con el Sistema</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Control de stock</strong></td><td>Conteo manual, planillas sueltas</td><td><span className="lp-check">✓</span> Inventario digital en tiempo real por ubicación</td></tr>
                <tr><td><strong>Pedidos internos</strong></td><td>WhatsApp, papeles, verbal</td><td><span className="lp-check">✓</span> Flujo formal: Solicitud → Aprobación → Entrega</td></tr>
                <tr><td><strong>Alertas de stock bajo</strong></td><td>Se enteran cuando ya falta</td><td><span className="lp-check">✓</span> Alertas automáticas por email antes del quiebre</td></tr>
                <tr><td><strong>Traspasos entre bares</strong></td><td>Sin registro, sin control</td><td><span className="lp-check">✓</span> Transferencias trazables con confirmación</td></tr>
                <tr><td><strong>Análisis de ventas</strong></td><td>Datos del POS sin procesar</td><td><span className="lp-check">✓</span> 906 recetas analizadas, promedios diarios calculados</td></tr>
                <tr><td><strong>Historial / Auditoría</strong></td><td>No existe</td><td><span className="lp-check">✓</span> Log completo de cada movimiento y responsable</td></tr>
                <tr><td><strong>Acceso remoto</strong></td><td>Hay que estar en el lugar</td><td><span className="lp-check">✓</span> Web responsiva, accesible desde celular o PC</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="lp-slide" id="funciones">
        <div className="lp-slide-content">
          <div className="lp-section-header">
            <div className="lp-section-number">3</div>
            <h2>Funcionalidades Principales</h2>
            <p>Todo lo que incluye la plataforma, ya desarrollado y funcionando</p>
          </div>
          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-icon blue"><svg width="28" height="28" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div>
              <h3>Dashboard Ejecutivo</h3>
              <p>Vista general con métricas clave: productos totales, stock bajo, agotados y solicitudes pendientes. Todo en un vistazo.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon green"><svg width="28" height="28" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>
              <h3>Inventario Multi-ubicación</h3>
              <p>Stock en tiempo real de Bodega, Bar Casa Sanz y Bar Hotel Bidasoa. Búsqueda, filtros por categoría y ordenamiento.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon amber"><svg width="28" height="28" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
              <h3>Alertas Inteligentes</h3>
              <p>Umbrales de stock mínimo calculados desde datos reales del POS (2 años de ventas). Notificaciones por email automáticas.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon violet"><svg width="28" height="28" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg></div>
              <h3>Sistema de Solicitudes</h3>
              <p>Flujo completo: bartender solicita → bodeguero aprueba → se entrega. Con notas, estados y trazabilidad total.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon rose"><svg width="28" height="28" fill="none" stroke="#e11d48" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg></div>
              <h3>Transferencias entre Ubicaciones</h3>
              <p>Mover stock de bodega a bares o entre bares. Con confirmación del receptor y registro completo.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon cyan"><svg width="28" height="28" fill="none" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
              <h3>Análisis de Ventas POS</h3>
              <p>906 recetas del POS analizadas. Filtros por grupo, búsqueda, métricas 2024 vs 2025, promedios diarios y exportación CSV.</p>
            </div>
          </div>
          <div className="lp-features-grid" style={{ marginTop: '2rem' }}>
            <div className="lp-feature-card">
              <div className="lp-feature-icon blue"><svg width="28" height="28" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
              <h3>Gestión de Usuarios</h3>
              <p>3 roles (Admin, Bodeguero, Bartender) con permisos diferenciados. Cada rol ve solo lo que necesita.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon green"><svg width="28" height="28" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
              <h3>Historial de Actividad</h3>
              <p>Auditoría inmutable: quién hizo qué, cuándo y dónde. Útil para control interno y rendición de cuentas.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon amber"><svg width="28" height="28" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg></div>
              <h3>Responsive / Móvil</h3>
              <p>Funciona perfecto en celular, tablet y computador. Los bartenders pueden usarlo desde su teléfono en el bar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Complejidad Técnica */}
      <section className="lp-slide" id="complejidad" style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)' }}>
        <div className="lp-slide-content">
          <div className="lp-section-header">
            <div className="lp-section-number">4</div>
            <h2>¿Por qué es un sistema complejo?</h2>
            <p>No es una planilla Excel. Es una plataforma profesional con la misma tecnología que usan empresas como Netflix, Airbnb y Shopify.</p>
          </div>
          <div className="lp-tech-grid">
            <div className="lp-tech-card">
              <div className="lp-tech-card-header">
                <div className="lp-tech-icon" style={{ background: '#eff6ff' }}><svg width="24" height="24" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
                <h3>Arquitectura profesional</h3>
              </div>
              <ul className="lp-tech-list">
                <li><span className="lp-bullet" style={{ color: 'var(--lp-accent)' }}>›</span> Base de datos PostgreSQL con seguridad a nivel de fila (RLS)</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-accent)' }}>›</span> Autenticación encriptada y control de sesiones</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-accent)' }}>›</span> API en tiempo real con actualizaciones instantáneas</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-accent)' }}>›</span> Funciones serverless para alertas automáticas por email</li>
              </ul>
            </div>
            <div className="lp-tech-card">
              <div className="lp-tech-card-header">
                <div className="lp-tech-icon" style={{ background: '#ecfdf5' }}><svg width="24" height="24" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg></div>
                <h3>Interfaz moderna</h3>
              </div>
              <ul className="lp-tech-list">
                <li><span className="lp-bullet" style={{ color: 'var(--lp-success)' }}>›</span> React 19 + TypeScript (estándar de la industria)</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-success)' }}>›</span> Diseño responsivo: celular, tablet y escritorio</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-success)' }}>›</span> Búsqueda, filtros, ordenamiento y exportación CSV</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-success)' }}>›</span> Dashboard con métricas en tiempo real</li>
              </ul>
            </div>
          </div>
          <div className="lp-tech-grid">
            <div className="lp-tech-card">
              <div className="lp-tech-card-header">
                <div className="lp-tech-icon" style={{ background: '#faf5ff' }}><svg width="24" height="24" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg></div>
                <h3>Lógica de negocio avanzada</h3>
              </div>
              <ul className="lp-tech-list">
                <li><span className="lp-bullet" style={{ color: '#9333ea' }}>›</span> 3 roles con permisos diferenciados (RBAC)</li>
                <li><span className="lp-bullet" style={{ color: '#9333ea' }}>›</span> Flujos de aprobación de solicitudes multi-paso</li>
                <li><span className="lp-bullet" style={{ color: '#9333ea' }}>›</span> Transferencias con confirmación bidireccional</li>
                <li><span className="lp-bullet" style={{ color: '#9333ea' }}>›</span> Auditoría inmutable de cada acción del sistema</li>
              </ul>
            </div>
            <div className="lp-tech-card">
              <div className="lp-tech-card-header">
                <div className="lp-tech-icon" style={{ background: '#fffbeb' }}><svg width="24" height="24" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
                <h3>Inteligencia basada en datos</h3>
              </div>
              <ul className="lp-tech-list">
                <li><span className="lp-bullet" style={{ color: 'var(--lp-warning)' }}>›</span> 906 recetas del POS procesadas y mapeadas</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-warning)' }}>›</span> Cálculo de stock mínimo por velocidad de venta</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-warning)' }}>›</span> Factor fin de semana (1.4x) para alertas precisas</li>
                <li><span className="lp-bullet" style={{ color: 'var(--lp-warning)' }}>›</span> Conversión ml/unidad automática por categoría</li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: '2rem', background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 16, padding: '2rem', color: 'white', textAlign: 'center' }}>
            <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Equivalente en el mercado</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>Un sistema de esta complejidad se cotiza entre <span style={{ color: 'var(--lp-accent-light)' }}>$8.000.000 - $15.000.000</span> en desarrollo a medida</p>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Fuente: cotizaciones promedio de consultoras de software en Chile para sistemas ERP/inventario personalizados con múltiples ubicaciones, roles y análisis de datos</p>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="lp-slide" id="roi">
        <div className="lp-slide-content">
          <div className="lp-section-header">
            <div className="lp-section-number">5</div>
            <h2>Retorno de Inversión</h2>
            <p>El sistema se paga solo evitando una fracción de las pérdidas actuales</p>
          </div>
          <div className="lp-roi-container">
            <div className="lp-roi-left">
              <h3>Pérdidas que el sistema previene</h3>
              <div className="lp-roi-item">
                <div className="lp-roi-item-icon"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div>
                <div><div className="lp-roi-item-value">$500.000 - $1.500.000</div><div className="lp-roi-item-label">Ventas perdidas por quiebres de stock en fines de semana y eventos (2 bares)</div></div>
              </div>
              <div className="lp-roi-item">
                <div className="lp-roi-item-icon"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
                <div><div className="lp-roi-item-value">$300.000 - $800.000</div><div className="lp-roi-item-label">Mermas, pérdidas y desperdicios por falta de control y trazabilidad</div></div>
              </div>
              <div className="lp-roi-item">
                <div className="lp-roi-item-icon"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                <div><div className="lp-roi-item-value">$150.000 - $300.000</div><div className="lp-roi-item-label">Horas-hombre en conteos manuales, WhatsApp y coordinación ineficiente</div></div>
              </div>
              <div className="lp-roi-item">
                <div className="lp-roi-item-icon"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
                <div><div className="lp-roi-item-value">$200.000 - $500.000</div><div className="lp-roi-item-label">Sobrestock y compras innecesarias por no conocer el consumo real</div></div>
              </div>
            </div>
            <div className="lp-roi-right">
              <div className="lp-roi-card">
                <h4>Inversión mensual</h4>
                <div className="lp-value">$200.000 - $250.000 <span style={{ fontSize: '0.8rem', color: 'var(--lp-text-light)' }}>/mes</span></div>
                <div className="lp-detail">Operación, mantenimiento, hosting, soporte y mejoras continuas del sistema</div>
              </div>
              <div className="lp-roi-card">
                <h4>Pérdidas evitables estimadas (mensual)</h4>
                <div className="lp-value green">$1.150.000 - $3.100.000</div>
                <div className="lp-detail">Suma conservadora de ventas perdidas, mermas, tiempo y sobrestock entre las 3 ubicaciones</div>
              </div>
              <div className="lp-roi-card" style={{ borderColor: 'var(--lp-success)', background: '#ecfdf5' }}>
                <h4>El sistema se paga con solo evitar...</h4>
                <div className="lp-value green" style={{ fontSize: '2rem' }}>1 quiebre de stock al mes</div>
                <div className="lp-detail">Un viernes sin espumante o vodka en el bar genera más pérdida que el costo anual completo del sistema</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inversión */}
      <section className="lp-slide" id="inversion">
        <div className="lp-slide-content">
          <div className="lp-section-header">
            <div className="lp-section-number">6</div>
            <h2>Inversión Mensual</h2>
            <p>Una fracción del costo de un empleado, con impacto en toda la operación</p>
          </div>
          <div className="lp-investment-center">
            <div className="lp-price-card">
              <div className="lp-price-card-badge">Sistema completo — ya desarrollado y funcionando</div>
              <div className="lp-price-label">Inversión mensual</div>
              <div className="lp-price-amount">$200.000 <span>- $250.000</span></div>
              <div className="lp-price-period">pesos chilenos al mes</div>
              <div className="lp-price-includes">
                <h4>Incluye todo:</h4>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Plataforma completa con 9 módulos funcionando</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Base de datos en la nube con respaldos automáticos</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Autenticación segura y control de roles</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Alertas automáticas por email (stock bajo)</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Hosting web 24/7 (acceso desde cualquier dispositivo)</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Datos de ventas POS integrados (906 recetas, 2 años)</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Soporte técnico y mantenimiento continuo</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Mejoras y actualizaciones incluidas</div>
                <div className="lp-price-check"><span className="lp-price-check-icon">✓</span> Usuarios ilimitados, sin costo por persona</div>
              </div>
            </div>
            <div className="lp-context-row">
              <div className="lp-context-card"><div className="lp-emoji">💼</div><h4>Menos que medio sueldo mínimo</h4><p>Cuesta menos que medio empleado pero mejora la productividad de todo el equipo de bares y bodega</p></div>
              <div className="lp-context-card"><div className="lp-emoji">📈</div><h4>1 quiebre de stock evitado</h4><p>Un viernes sin espumante o gin genera más pérdida en una noche que el costo de todo un mes</p></div>
              <div className="lp-context-card"><div className="lp-emoji">💻</div><h4>vs. Desarrollo a medida</h4><p>Un sistema equivalente cuesta $8-15 millones en desarrollo. Aquí se paga solo la operación mensual</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-section" id="cierre">
        <div className="lp-slide-content" style={{ textAlign: 'center' }}>
          <h2>El sistema ya está listo.<br/>Solo falta activarlo.</h2>
          <p>
            No hay desarrollo pendiente. No hay riesgo de proyecto fallido.
            La plataforma está construida, probada y lista para producción.
          </p>
          <div className="lp-cta-benefits">
            <div className="lp-cta-benefit"><span className="lp-cta-benefit-icon">✓</span> Implementación inmediata</div>
            <div className="lp-cta-benefit"><span className="lp-cta-benefit-icon">✓</span> Sin contratos largos</div>
            <div className="lp-cta-benefit"><span className="lp-cta-benefit-icon">✓</span> Cancelable en cualquier momento</div>
            <div className="lp-cta-benefit"><span className="lp-cta-benefit-icon">✓</span> Soporte y mejoras incluidas</div>
          </div>
          <Link to="/login" className="lp-hero-cta" style={{ fontSize: '1.15rem', padding: '16px 40px', marginBottom: '2.5rem' }}>
            Acceder al Sistema
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </Link>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2rem', maxWidth: 750, margin: '0 auto' }}>
            <p style={{ color: '#e2e8f0', fontSize: '1.05rem', marginBottom: 0, fontStyle: 'italic' }}>
              "Por $200.000-$250.000 al mes se obtiene control total del inventario de 3 ubicaciones,
              alertas inteligentes calculadas con 2 años de datos reales del POS,
              un sistema de solicitudes y transferencias con trazabilidad completa,
              y análisis de ventas para tomar decisiones informadas.<br/><br/>
              La pregunta no es si se puede pagar — sino cuánto cuesta cada mes seguir sin él."
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

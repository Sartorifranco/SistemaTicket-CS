import React from 'react';
import { isWorldCupThemeActive } from '../../config/worldCupTheme';
import { COMPANY_CONFIG } from '../../config/branding';
import './WorldCupArgentinaTheme.css';

const CONFETTI_COLORS = ['#74ACDF', '#FFFFFF', '#F6B40E', '#5A9FD4', '#FFD54F'];

type FlagSize = 'sm' | 'md' | 'lg';

const OLA_BARS = Array.from({ length: 9 }, (_, i) => i);

const VIENTO_STREAMS = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    top: `${12 + i * 14}%`,
    delay: `${i * 0.7}s`,
    duration: `${8 + i * 1.5}s`,
    scale: 0.7 + (i % 3) * 0.15,
}));

/** Confetti sutil en login (pocas piezas, no invasivo) */
const CONFETTI_LOGIN = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${(i * 4.6 + 1) % 98}%`,
    delay: `${(i * 0.4) % 7}s`,
    duration: `${7 + (i % 5)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: 6 + (i % 3),
    height: 10 + (i % 2),
}));

const CONFETTI_APP = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    left: `${(i * 2.9 + 1) % 99}%`,
    delay: `${(i * 0.35) % 12}s`,
    duration: `${10 + (i % 8)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: 5 + (i % 5),
    height: 8 + (i % 4),
}));

const APP_BG_STARS = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    top: `${8 + (i * 9) % 85}%`,
    left: `${3 + (i * 11) % 92}%`,
    delay: `${(i * 0.4) % 3}s`,
    size: 0.7 + (i % 3) * 0.15,
}));

const APP_BG_EMOJIS = [
    { emoji: '⚽', top: '18%', left: '4%', delay: '0s' },
    { emoji: '🏆', top: '72%', left: '6%', delay: '0.6s' },
    { emoji: '⚽', top: '45%', right: '18%', delay: '1s' },
    { emoji: '🏆', top: '82%', right: '22%', delay: '0.3s' },
    { emoji: '★', top: '12%', right: '8%', delay: '0.8s', isStar: true },
    { emoji: '★', top: '58%', left: '88%', delay: '1.2s', isStar: true },
];

const CONFETTI_BANNER = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 8.5 + 3) % 96}%`,
    delay: `${(i * 0.4) % 6}s`,
    duration: `${8 + (i % 4)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

/* ─── Helpers de clases condicionales ─── */

export function getWorldCupLoginPanelClass(): string {
    return isWorldCupThemeActive() ? 'wc-login-card' : '';
}

export function getWorldCupLoginPageClass(): string {
    return isWorldCupThemeActive() ? 'wc-login-page wc-argentina-root' : 'bg-gray-900';
}

export function getWorldCupSubmitButtonClass(): string {
    if (!isWorldCupThemeActive()) {
        return 'group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400';
    }
    return 'wc-btn-argentina group relative w-full flex justify-center py-2 sm:py-3 px-4 text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 disabled:bg-gray-400 disabled:border-gray-300';
}

export function getWorldCupSubmitButtonLabel(loading: boolean): string {
    if (loading) return 'Iniciando sesión...';
    if (isWorldCupThemeActive()) return '⚽ ¡Vamos, ingresar!';
    return 'Iniciar Sesión';
}

export function getWorldCupRegisterLinkClass(): string {
    const base = 'block font-medium';
    if (isWorldCupThemeActive()) {
        return `${base} wc-link-argentina hover:opacity-80`;
    }
    return `${base} text-red-600 hover:text-red-500`;
}

export function getWorldCupInputClass(defaultClass: string): string {
    if (!isWorldCupThemeActive()) return defaultClass;
    return `${defaultClass} wc-input-argentina`;
}

/* ─── Bandera argentina CSS (reutilizable) ─── */

export const WorldCupFlagArgentina: React.FC<{ size?: FlagSize; className?: string }> = ({
    size = 'md',
    className = '',
}) => (
    <div className={`wc-flag-3d-wrap wc-flag-3d-wrap--${size} ${className}`.trim()} aria-hidden="true">
        <div className={`wc-flag-argentina wc-flag-argentina--${size}`}>
            <div className="wc-flag-argentina__stripe wc-flag-argentina__stripe--top" />
            <div className="wc-flag-argentina__stripe wc-flag-argentina__stripe--mid">
                <div className={`wc-sol-de-mayo wc-sol-de-mayo--${size}`} />
            </div>
            <div className="wc-flag-argentina__stripe wc-flag-argentina__stripe--bottom" />
        </div>
    </div>
);

/* ─── Login: La Albiceleste Viva (pantalla completa) ─── */

export const WorldCupLoginPanelFestive: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-seleccion-atmosphere wc-argentina-root" aria-hidden="true">
            {/* Reflectores tipo estadio */}
            <div className="wc-seleccion-spot wc-seleccion-spot--tl" />
            <div className="wc-seleccion-spot wc-seleccion-spot--tr" />
            <div className="wc-seleccion-spot wc-seleccion-spot--bl" />
            <div className="wc-seleccion-spot wc-seleccion-spot--br" />

            {/* Bandera gigante con tela ondulante */}
            <div className="wc-seleccion-cloth">
                <div className="wc-seleccion-cloth__ripple wc-seleccion-cloth__ripple--1" />
                <div className="wc-seleccion-cloth__ripple wc-seleccion-cloth__ripple--2" />
                <div className="wc-seleccion-cloth__ripple wc-seleccion-cloth__ripple--3" />
                <div className="wc-seleccion-cloth__stripe wc-seleccion-cloth__stripe--celeste-top">
                    <span className="wc-seleccion-cloth__edge wc-seleccion-cloth__edge--bottom" />
                </div>
                <div className="wc-seleccion-cloth__stripe wc-seleccion-cloth__stripe--blanco">
                    <span className="wc-seleccion-cloth__edge wc-seleccion-cloth__edge--top" />
                    <span className="wc-seleccion-cloth__edge wc-seleccion-cloth__edge--bottom" />
                    <div className="wc-seleccion-sol-gigante">
                        <div className="wc-seleccion-sol-gigante__core" />
                        <div className="wc-seleccion-sol-gigante__rays" />
                        <div className="wc-seleccion-sol-gigante__corona" />
                    </div>
                </div>
                <div className="wc-seleccion-cloth__stripe wc-seleccion-cloth__stripe--celeste-bottom">
                    <span className="wc-seleccion-cloth__edge wc-seleccion-cloth__edge--top" />
                </div>
            </div>

            {/* Viento albiceleste — estelas de tela */}
            <div className="wc-seleccion-viento">
                {VIENTO_STREAMS.map((v) => (
                    <span
                        key={v.id}
                        className="wc-seleccion-viento__stream"
                        style={{
                            top: v.top,
                            animationDelay: v.delay,
                            animationDuration: v.duration,
                            transform: `scaleX(${v.scale})`,
                        }}
                    />
                ))}
            </div>

            {/* Rayo celeste (destello esporádico) */}
            <svg className="wc-seleccion-rayo" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <linearGradient id="wc-rayo-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#74ACDF" stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                <path
                    className="wc-seleccion-rayo__bolt"
                    d="M 220 0 L 195 95 L 235 95 L 175 210 L 205 120 L 168 120 Z"
                    fill="url(#wc-rayo-grad)"
                />
            </svg>

            {/* Triada campeona: 78 · 86 · 22 + estrella 2026 (banda superior, fuera del login) */}
            <svg className="wc-seleccion-triada" viewBox="0 0 400 110" preserveAspectRatio="xMidYMin meet">
                <defs>
                    <linearGradient id="wc-triada-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F6B40E" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#FFD54F" stopOpacity="1" />
                        <stop offset="100%" stopColor="#F6B40E" stopOpacity="0.2" />
                    </linearGradient>
                </defs>
                <path
                    className="wc-seleccion-triada__triangle"
                    d="M 28 88 L 200 10 L 372 88 Z"
                    fill="none"
                    stroke="url(#wc-triada-gold)"
                    strokeWidth="2.5"
                />
                <path
                    className="wc-seleccion-triada__energy wc-seleccion-triada__energy--seq"
                    d="M 28 88 L 200 10"
                    fill="none"
                    stroke="#FFD54F"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    className="wc-seleccion-triada__energy wc-seleccion-triada__energy--seq"
                    d="M 200 10 L 372 88"
                    fill="none"
                    stroke="#FFD54F"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    className="wc-seleccion-triada__energy wc-seleccion-triada__energy--seq"
                    d="M 372 88 L 28 88"
                    fill="none"
                    stroke="#FFD54F"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    className="wc-seleccion-triada__dream"
                    d="M 200 52 L 200 26"
                    fill="none"
                    stroke="#74ACDF"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                />
                <g className="wc-seleccion-triada__node wc-seleccion-triada__node--78">
                    <circle cx="28" cy="88" r="13" />
                    <circle className="wc-seleccion-triada__halo" cx="28" cy="88" r="20" />
                    <text x="28" y="93" textAnchor="middle">78</text>
                </g>
                <g className="wc-seleccion-triada__node wc-seleccion-triada__node--86">
                    <circle cx="200" cy="10" r="15" />
                    <circle className="wc-seleccion-triada__halo" cx="200" cy="10" r="24" />
                    <text x="200" y="16" textAnchor="middle">86</text>
                </g>
                <g className="wc-seleccion-triada__node wc-seleccion-triada__node--22">
                    <circle cx="372" cy="88" r="13" />
                    <circle className="wc-seleccion-triada__halo" cx="372" cy="88" r="20" />
                    <text x="372" y="93" textAnchor="middle">22</text>
                </g>
                <g className="wc-seleccion-triada__node wc-seleccion-triada__node--26">
                    <circle cx="200" cy="52" r="9" strokeDasharray="4 3" />
                    <circle className="wc-seleccion-triada__halo wc-seleccion-triada__halo--26" cx="200" cy="52" r="16" />
                    <text x="200" y="56" textAnchor="middle">26</text>
                </g>
            </svg>

            {/* Arco del potrero: una pelota, un sueño */}
            <svg className="wc-seleccion-arco" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
                <ellipse className="wc-seleccion-arco__apex" cx="200" cy="28" rx="18" ry="10" />
                <path
                    className="wc-seleccion-arco__path"
                    d="M 20 360 Q 200 20 380 360"
                    fill="none"
                />
                <path
                    className="wc-seleccion-arco__glow"
                    d="M 20 360 Q 200 20 380 360"
                    fill="none"
                />
                <text className="wc-seleccion-arco__ball" fontSize="28">
                    ⚽
                    <animateMotion
                        dur="7s"
                        repeatCount="indefinite"
                        path="M 20 360 Q 200 20 380 360"
                        keyPoints="0;1;0"
                        keyTimes="0;0.5;1"
                        calcMode="spline"
                        keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                    />
                </text>
            </svg>

            {/* Arco de potrero al fondo */}
            <svg className="wc-seleccion-potrero" viewBox="0 0 400 90" preserveAspectRatio="xMidYMax meet">
                <line className="wc-seleccion-potrero__linea" x1="0" y1="68" x2="400" y2="68" />
                <path
                    className="wc-seleccion-potrero__arco"
                    d="M 145 68 L 145 28 L 255 28 L 255 68"
                    fill="none"
                />
                <line className="wc-seleccion-potrero__travesano" x1="125" y1="28" x2="275" y2="28" />
            </svg>

            {/* La ola de la hinchada (synchronized bars) */}
            <div className="wc-seleccion-ola">
                {OLA_BARS.map((i) => (
                    <span
                        key={i}
                        className={`wc-seleccion-ola__bar wc-seleccion-ola__bar--${i % 3}`}
                        style={{ animationDelay: `${i * 0.09}s` }}
                    />
                ))}
            </div>

            {/* Pulso del cántico — anillos desde abajo */}
            <div className="wc-seleccion-canto">
                <span className="wc-seleccion-canto__ring" />
                <span className="wc-seleccion-canto__ring wc-seleccion-canto__ring--2" />
            </div>

            {/* Confetti sutil */}
            <div className="wc-seleccion-confetti">
                {CONFETTI_LOGIN.map((c) => (
                    <span
                        key={c.id}
                        className="wc-seleccion-confetti__piece"
                        style={{
                            left: c.left,
                            animationDelay: c.delay,
                            animationDuration: c.duration,
                            backgroundColor: c.color,
                            width: c.width,
                            height: c.height,
                        }}
                    />
                ))}
            </div>

            {/* Enfoque central: la tarjeta respira, el fondo arde alrededor */}
            <div className="wc-seleccion-vignette" />
            <div className="wc-seleccion-horizon" />
        </div>
    );
};

/* ─── Login: hero con bandera CSS ─── */

export const WorldCupLoginHero: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-login-hero wc-argentina-root">
            <WorldCupFlagArgentina size="md" />
            <p className="wc-login-hero__title">¡VAMOS ARGENTINA!</p>
            <p className="wc-login-hero__subtitle">🇦🇷 Mundial 2026 · DALE QUE VAMOS 🇦🇷</p>
            <p className="wc-login-hero__subtext">
                Con la misma pasión, entrá a {COMPANY_CONFIG.shortName}
            </p>
        </div>
    );
};

/* ─── Estrellas campeón ─── */

type ChampionSize = 'sm' | 'md' | 'lg';

interface WorldCupChampionStarsProps {
    size?: ChampionSize;
    showYears?: boolean;
}

export const WorldCupChampionStars: React.FC<WorldCupChampionStarsProps> = ({
    size = 'md',
    showYears = true,
}) => {
    const years = ['78', '86', '22'];
    const plainClass = showYears ? '' : ' wc-champion-stars--plain';

    return (
        <span className={`wc-champion-stars wc-champion-stars--${size} wc-argentina-root${plainClass}`} aria-hidden="true">
            {years.map((year) => (
                <span key={year} className="wc-champion-star">
                    ★
                    {showYears && <span className="wc-champion-star__year">{year}</span>}
                </span>
            ))}
        </span>
    );
};

/* ─── Sidebar festivo ─── */

export const WorldCupSidebarFestive: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-sidebar-festive wc-argentina-root" aria-hidden="true">
            <div className="wc-sidebar-festive__stripe" />
            <p className="wc-sidebar-festive__text">
                <span className="wc-sidebar-festive__flag">🇦🇷</span>
                ¡Vamos Argentina!
                <span className="ml-1 inline-block align-middle">
                    <WorldCupChampionStars size="sm" showYears={false} />
                </span>
            </p>
        </div>
    );
};

/* ─── Header ribbon ─── */

interface WorldCupHeaderRibbonProps {
    userName?: string;
}

export const WorldCupHeaderRibbon: React.FC<WorldCupHeaderRibbonProps> = ({ userName }) => {
    if (!isWorldCupThemeActive()) return null;

    const name = userName || 'Usuario';

    return (
        <div className="wc-header-ribbon wc-argentina-root" role="status">
            <span className="wc-header-ribbon__flags" aria-hidden="true">🇦🇷</span>
            <span>
                {name}, dale que vamos · Mundial 2026
            </span>
            <WorldCupChampionStars size="sm" showYears={false} />
            <span className="wc-header-ribbon__flags" aria-hidden="true">🇦🇷</span>
        </div>
    );
};

/* ─── Fondo festivo del área main (dashboard y páginas autenticadas) ─── */

export const WorldCupAppBackground: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-app-bg wc-argentina-root" aria-hidden="true">
            <div className="wc-app-bg__shimmer" />
            <div className="wc-app-bg__stripes" />
            <div className="wc-app-bg__glow wc-app-bg__glow--1" />
            <div className="wc-app-bg__glow wc-app-bg__glow--2" />
            <div className="wc-app-bg__glow wc-app-bg__glow--3" />

            {CONFETTI_APP.map((c) => (
                <span
                    key={c.id}
                    className="wc-app-confetti__piece"
                    style={{
                        left: c.left,
                        animationDelay: c.delay,
                        animationDuration: c.duration,
                        backgroundColor: c.color,
                        width: c.width,
                        height: c.height,
                    }}
                />
            ))}

            {APP_BG_STARS.map((s) => (
                <span
                    key={s.id}
                    className="wc-app-bg__star"
                    style={{
                        top: s.top,
                        left: s.left,
                        animationDelay: s.delay,
                        fontSize: `${s.size}rem`,
                    }}
                >
                    ★
                </span>
            ))}

            {APP_BG_EMOJIS.map((e, i) => (
                <span
                    key={`app-emoji-${i}`}
                    className={e.isStar ? 'wc-app-bg__star' : 'wc-app-bg__emoji'}
                    style={{
                        top: e.top,
                        left: e.left,
                        right: e.right,
                        animationDelay: e.delay,
                    }}
                >
                    {e.emoji}
                </span>
            ))}

            <div className="wc-app-bg__flag wc-app-bg__flag--hero">
                <WorldCupFlagArgentina size="lg" />
            </div>
            <div className="wc-app-bg__flag wc-app-bg__flag--corner">
                <WorldCupFlagArgentina size="sm" />
            </div>
        </div>
    );
};

/* ─── Banner dashboard ─── */

interface WorldCupDashboardBannerProps {
    pageTitle: string;
    userName?: string;
}

export const WorldCupDashboardBanner: React.FC<WorldCupDashboardBannerProps> = ({
    pageTitle,
    userName,
}) => {
    if (!isWorldCupThemeActive()) return null;

    const name = userName || 'Usuario';

    return (
        <div className="wc-dashboard-banner wc-argentina-root" role="status">
            <div className="wc-dashboard-banner__top-stripe" aria-hidden="true" />
            <div className="wc-dashboard-banner__confetti" aria-hidden="true">
                {CONFETTI_BANNER.map((c) => (
                    <span
                        key={c.id}
                        className="wc-dashboard-banner__confetti-piece"
                        style={{
                            left: c.left,
                            top: `${(c.id * 7) % 60}%`,
                            animationDelay: c.delay,
                            animationDuration: c.duration,
                            backgroundColor: c.color,
                        }}
                    />
                ))}
            </div>
            <div className="wc-dashboard-banner__content">
                <div className="wc-dashboard-banner__left">
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="wc-dashboard-banner__flags" aria-hidden="true">🇦🇷</span>
                        <span className="wc-dashboard-banner__flags" aria-hidden="true" style={{ animationDelay: '0.5s' }}>🇦🇷</span>
                        <p className="wc-dashboard-banner__greeting">¡Hola, {name}!</p>
                    </div>
                    <p className="wc-dashboard-banner__cheer">¡Vamos Argentina!</p>
                    <p className="wc-dashboard-banner__subtitle">
                        {pageTitle} — Mundial 2026 · 3 ⭐ campeones del mundo
                    </p>
                    <div className="mt-2">
                        <WorldCupChampionStars size="md" />
                    </div>
                </div>
                <div className="wc-dashboard-banner__emojis" aria-hidden="true">
                    <span>⚽</span>
                    <span>🏆</span>
                </div>
            </div>
        </div>
    );
};

export { isWorldCupThemeActive };

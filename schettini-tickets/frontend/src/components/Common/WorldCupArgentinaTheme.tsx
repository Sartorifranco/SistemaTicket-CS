import React from 'react';
import { isWorldCupThemeActive } from '../../config/worldCupTheme';
import { COMPANY_CONFIG } from '../../config/branding';
import './WorldCupArgentinaTheme.css';

const CONFETTI_COLORS = ['#74ACDF', '#FFFFFF', '#F6B40E', '#5A9FD4', '#FFD54F'];

const CONFETTI_LOGIN = Array.from({ length: 52 }, (_, i) => ({
    id: i,
    left: `${(i * 1.95 + 1) % 99}%`,
    delay: `${(i * 0.22) % 6}s`,
    duration: `${4 + (i % 4)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: 7 + (i % 5),
    height: 11 + (i % 4),
    variant: i % 3,
}));

const CONFETTI_LOGIN_BURST = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 4.2 + 0.5) % 100}%`,
    delay: `${(i * 0.18) % 4}s`,
    duration: `${2.5 + (i % 3)}s`,
    color: CONFETTI_COLORS[(i + 2) % CONFETTI_COLORS.length],
    width: 5 + (i % 3),
    height: 9 + (i % 2),
}));

const LOGIN_FLAGS = [
    { top: '4%', left: '3%', delay: '0s', scale: 1.3 },
    { top: '12%', left: '22%', delay: '0.4s', scale: 1 },
    { top: '8%', right: '6%', delay: '1s', scale: 1.2 },
    { top: '20%', right: '20%', delay: '1.6s', scale: 0.9 },
    { top: '48%', left: '4%', delay: '0.8s', scale: 1.1 },
    { top: '55%', left: '88%', delay: '2s', scale: 1.25 },
    { top: '72%', left: '8%', delay: '0.2s', scale: 1.15 },
    { top: '68%', right: '10%', delay: '1.2s', scale: 1 },
    { top: '82%', left: '35%', delay: '0.6s', scale: 1.2 },
    { top: '88%', right: '28%', delay: '1.8s', scale: 0.95 },
    { top: '32%', left: '92%', delay: '0.3s', scale: 1.1 },
    { top: '38%', left: '14%', delay: '1.4s', scale: 1.05 },
];

const LOGIN_EMOJIS = [
    { emoji: '⚽', top: '10%', left: '68%', delay: '0s', size: 2.2 },
    { emoji: '🏆', top: '18%', left: '8%', delay: '0.5s', size: 2.4 },
    { emoji: '⚽', top: '52%', left: '78%', delay: '0.2s', size: 1.9 },
    { emoji: '🏆', top: '58%', left: '18%', delay: '0.9s', size: 2.1 },
    { emoji: '⚽', top: '75%', left: '62%', delay: '0.4s', size: 2.3 },
    { emoji: '🏆', top: '80%', left: '82%', delay: '1.1s', size: 2 },
    { emoji: '⚽', top: '28%', left: '42%', delay: '0.7s', size: 1.7 },
    { emoji: '🏆', top: '42%', right: '6%', delay: '0.3s', size: 2.5 },
    { emoji: '⚽', top: '90%', left: '52%', delay: '1.3s', size: 2 },
    { emoji: '⚽', top: '6%', left: '48%', delay: '0.6s', size: 1.8 },
];

const LOGIN_STARS = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    top: `${(i * 7 + 3) % 92}%`,
    left: `${(i * 9 + 2) % 94}%`,
    delay: `${(i * 0.25) % 2.5}s`,
    size: 1 + (i % 4) * 0.25,
    showYear: i < 6,
    year: ['78', '86', '22', '78', '86', '22'][i],
}));

const LOGIN_CSS_FLAGS: { top?: string; bottom?: string; left?: string; right?: string; size: FlagSize; delay: string }[] = [
    { top: '5%', left: '2%', size: 'md', delay: '0s' },
    { top: '6%', right: '3%', size: 'lg', delay: '0.8s' },
    { bottom: '8%', left: '3%', size: 'lg', delay: '0.4s' },
    { bottom: '6%', right: '2%', size: 'md', delay: '1.2s' },
    { top: '45%', left: '1%', size: 'sm', delay: '0.6s' },
    { top: '40%', right: '1%', size: 'sm', delay: '1s' },
];

const LOGIN_CHEERS = [
    { text: '¡DALE!', top: '14%', left: '16%', rotate: -14, delay: '0s' },
    { text: '¡VAMOS!', top: '24%', right: '12%', rotate: 10, delay: '0.5s' },
    { text: '⭐ ⭐ ⭐', top: '62%', left: '10%', rotate: -6, delay: '1s' },
    { text: '¡ARGENTINA!', bottom: '18%', right: '14%', rotate: 8, delay: '0.3s' },
    { text: 'MUNDIAL 2026', top: '50%', left: '6%', rotate: -10, delay: '0.8s' },
    { text: '¡DALE QUE VAMOS!', bottom: '12%', left: '20%', rotate: 5, delay: '1.2s' },
];

const LOGIN_SPARKLES = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    top: `${(i * 11 + 5) % 95}%`,
    left: `${(i * 7 + 3) % 97}%`,
    delay: `${(i * 0.15) % 2}s`,
    size: 3 + (i % 4),
}));

type FlagSize = 'sm' | 'md' | 'lg';

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

/* ─── Login: overlay festivo pantalla completa ─── */

export const WorldCupLoginPanelFestive: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-login-festive wc-argentina-root" aria-hidden="true">
            <div className="wc-login-festive__aurora" />
            <div className="wc-login-festive__shimmer" />
            <div className="wc-login-festive__stripes" />
            <div className="wc-login-festive__stripes wc-login-festive__stripes--gold" />
            <div className="wc-login-festive__pulse wc-login-festive__pulse--1" />
            <div className="wc-login-festive__pulse wc-login-festive__pulse--2" />
            <div className="wc-login-festive__pulse wc-login-festive__pulse--3" />
            <div className="wc-login-festive__glow wc-login-festive__glow--1" />
            <div className="wc-login-festive__glow wc-login-festive__glow--2" />
            <div className="wc-login-festive__glow wc-login-festive__glow--3" />
            <div className="wc-login-festive__glow wc-login-festive__glow--4" />
            <div className="wc-login-festive__glow wc-login-festive__glow--5" />

            {CONFETTI_LOGIN.map((c) => (
                <span
                    key={c.id}
                    className={`wc-confetti-piece${c.variant === 1 ? ' wc-confetti-piece--swirl' : c.variant === 2 ? ' wc-confetti-piece--wide' : ''}`}
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
            {CONFETTI_LOGIN_BURST.map((c) => (
                <span
                    key={`burst-${c.id}`}
                    className="wc-confetti-piece wc-confetti-piece--burst"
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
            {LOGIN_SPARKLES.map((s) => (
                <span
                    key={`spark-${s.id}`}
                    className="wc-login-sparkle"
                    style={{
                        top: s.top,
                        left: s.left,
                        animationDelay: s.delay,
                        width: s.size,
                        height: s.size,
                    }}
                />
            ))}
            {LOGIN_CHEERS.map((c, i) => (
                <span
                    key={`cheer-${i}`}
                    className="wc-login-cheer"
                    style={{
                        top: c.top,
                        left: c.left,
                        right: c.right,
                        bottom: c.bottom,
                        animationDelay: c.delay,
                        transform: `rotate(${c.rotate}deg)`,
                    }}
                >
                    {c.text}
                </span>
            ))}
            {LOGIN_CSS_FLAGS.map((f, i) => (
                <div
                    key={`css-flag-${i}`}
                    className="wc-login-css-flag"
                    style={{
                        top: f.top,
                        bottom: f.bottom,
                        left: f.left,
                        right: f.right,
                        animationDelay: f.delay,
                    }}
                >
                    <WorldCupFlagArgentina size={f.size} />
                </div>
            ))}
            {LOGIN_FLAGS.map((f, i) => (
                <span
                    key={`flag-${i}`}
                    className="wc-login-flag"
                    style={{
                        top: f.top,
                        left: f.left,
                        right: f.right,
                        animationDelay: f.delay,
                        fontSize: `${(f.scale ?? 1) * 1.75}rem`,
                    }}
                >
                    🇦🇷
                </span>
            ))}
            {LOGIN_EMOJIS.map((e, i) => (
                <span
                    key={`emoji-${i}`}
                    className="wc-login-emoji"
                    style={{
                        top: e.top,
                        left: e.left,
                        right: e.right,
                        animationDelay: e.delay,
                        fontSize: `${e.size}rem`,
                    }}
                >
                    {e.emoji}
                </span>
            ))}
            {LOGIN_STARS.map((s) => (
                <span
                    key={s.id}
                    className="wc-login-star"
                    style={{
                        top: s.top,
                        left: s.left,
                        animationDelay: s.delay,
                        fontSize: `${s.size}rem`,
                    }}
                >
                    ★{s.showYear && <span className="wc-login-star__year">{s.year}</span>}
                </span>
            ))}
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

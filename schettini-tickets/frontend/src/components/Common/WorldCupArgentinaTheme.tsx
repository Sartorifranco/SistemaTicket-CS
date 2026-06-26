import React from 'react';
import { isWorldCupThemeActive } from '../../config/worldCupTheme';
import { COMPANY_CONFIG } from '../../config/branding';
import './WorldCupArgentinaTheme.css';

const CONFETTI_COLORS = ['#74ACDF', '#FFFFFF', '#F6B40E', '#5A9FD4', '#FFD54F'];

const CONFETTI_LOGIN = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${(i * 3.7 + 2) % 98}%`,
    delay: `${(i * 0.35) % 8}s`,
    duration: `${5 + (i % 5)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: 6 + (i % 4),
    height: 10 + (i % 3),
}));

const CONFETTI_APP = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 5.3 + 1) % 99}%`,
    delay: `${(i * 0.5) % 10}s`,
    duration: `${12 + (i % 6)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

const CONFETTI_BANNER = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 8.5 + 3) % 96}%`,
    delay: `${(i * 0.4) % 6}s`,
    duration: `${8 + (i % 4)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

const LOGIN_FLAGS = [
    { top: '8%', left: '5%', delay: '0s' },
    { top: '25%', right: '8%', delay: '1s' },
    { top: '55%', left: '12%', delay: '2s' },
    { top: '70%', right: '15%', delay: '0.5s' },
    { top: '40%', left: '85%', delay: '1.5s' },
    { top: '85%', left: '45%', delay: '2.5s' },
];

const LOGIN_EMOJIS = [
    { emoji: '⚽', top: '15%', left: '75%', delay: '0s' },
    { emoji: '🏆', top: '60%', left: '8%', delay: '0.8s' },
    { emoji: '⚽', top: '78%', left: '70%', delay: '1.2s' },
    { emoji: '🏆', top: '35%', left: '55%', delay: '0.4s' },
];

const LOGIN_STARS = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    top: `${10 + (i * 11) % 80}%`,
    left: `${5 + (i * 13) % 90}%`,
    delay: `${(i * 0.3) % 2}s`,
}));

/* ─── Helpers de clases condicionales ─── */

export function getWorldCupLoginPanelClass(): string {
    return isWorldCupThemeActive() ? 'wc-login-panel relative overflow-hidden' : '';
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

/* ─── Login: overlay festivo del panel ─── */

export const WorldCupLoginPanelFestive: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-login-festive wc-argentina-root" aria-hidden="true">
            <div className="wc-login-festive__shimmer" />
            <div className="wc-login-festive__stripes" />
            <div className="wc-login-festive__glow wc-login-festive__glow--1" />
            <div className="wc-login-festive__glow wc-login-festive__glow--2" />
            <div className="wc-login-festive__glow wc-login-festive__glow--3" />
            {CONFETTI_LOGIN.map((c) => (
                <span
                    key={c.id}
                    className="wc-confetti-piece"
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
            {LOGIN_FLAGS.map((f, i) => (
                <span
                    key={`flag-${i}`}
                    className="wc-login-flag"
                    style={{
                        top: f.top,
                        left: f.left,
                        right: f.right,
                        animationDelay: f.delay,
                    }}
                >
                    🇦🇷
                </span>
            ))}
            {LOGIN_EMOJIS.map((e, i) => (
                <span
                    key={`emoji-${i}`}
                    className="wc-login-emoji"
                    style={{ top: e.top, left: e.left, animationDelay: e.delay }}
                >
                    {e.emoji}
                </span>
            ))}
            {LOGIN_STARS.map((s) => (
                <span
                    key={s.id}
                    className="wc-login-star"
                    style={{ top: s.top, left: s.left, animationDelay: s.delay }}
                >
                    ★
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
            <div className="wc-flag-3d-wrap">
                <div className="wc-flag-argentina" aria-hidden="true">
                    <div className="wc-flag-argentina__stripe wc-flag-argentina__stripe--top" />
                    <div className="wc-flag-argentina__stripe wc-flag-argentina__stripe--mid">
                        <div className="wc-sol-de-mayo" />
                    </div>
                    <div className="wc-flag-argentina__stripe wc-flag-argentina__stripe--bottom" />
                </div>
            </div>
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

/* ─── Confetti app ─── */

export const WorldCupAppConfetti: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <div className="wc-app-confetti wc-argentina-root" aria-hidden="true">
            {CONFETTI_APP.map((c) => (
                <span
                    key={c.id}
                    className="wc-app-confetti__piece"
                    style={{
                        left: c.left,
                        animationDelay: c.delay,
                        animationDuration: c.duration,
                        backgroundColor: c.color,
                    }}
                />
            ))}
        </div>
    );
};

/* ─── Banderas en esquinas ─── */

export const WorldCupAppCornerFlags: React.FC = () => {
    if (!isWorldCupThemeActive()) return null;

    return (
        <>
            <span className="wc-corner-decor wc-corner-decor--tl wc-argentina-root" aria-hidden="true">🇦🇷</span>
            <span className="wc-corner-decor wc-corner-decor--tr wc-argentina-root" aria-hidden="true">🇦🇷</span>
            <span className="wc-corner-decor wc-corner-decor--bl wc-argentina-root" aria-hidden="true">⚽</span>
            <span className="wc-corner-decor wc-corner-decor--br wc-argentina-root" aria-hidden="true">🏆</span>
        </>
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

/** Tema visual temporal Argentina · Mundial 2026 (1 may – 20 jul 2026). */

export const WORLD_CUP_LABEL = 'Mundial 2026';

/** 1/05/2026 00:00 (hora local del cliente) */
const WORLD_CUP_START = new Date(2026, 4, 1, 0, 0, 0, 0);

/** 20/07/2026 23:59:59.999 (hora local del cliente) */
const WORLD_CUP_END = new Date(2026, 6, 20, 23, 59, 59, 999);

/**
 * Evalúa si el tema festivo está activo según fecha del cliente.
 * Override opcional: REACT_APP_WORLD_CUP_THEME=true|false
 */
export function isWorldCupThemeActive(): boolean {
    const envOverride = process.env.REACT_APP_WORLD_CUP_THEME;

    if (envOverride === 'true') return true;
    if (envOverride === 'false') return false;

    const now = new Date();
    return now >= WORLD_CUP_START && now <= WORLD_CUP_END;
}

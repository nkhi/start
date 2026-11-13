/**
 * Application configuration constants
 */

const isHttps = window.location.protocol === 'https:';
const protocol = isHttps ? 'https:' : 'http:';
const hostname = window.location.hostname;

// API base URL - configurable via env for multi-device access (moved to port 4000, Cap uses 3000)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    || `${protocol}//${hostname}:${isHttps ? 4443 : 4000}`;

// Memos URL - configurable via env for multi-device access
export const MEMOS_URL = import.meta.env.VITE_MEMOS_URL
    || `${protocol}//${hostname}:${isHttps ? 5231 : 5230}`;

// Immich URL - configurable via env for multi-device access
export const IMMICH_URL = import.meta.env.VITE_IMMICH_URL
    || `${protocol}//${hostname}:${isHttps ? 2284 : 2283}`;

// Cap URL - configurable via env for multi-device access
export const CAP_URL = import.meta.env.VITE_CAP_URL
    || `${protocol}//${hostname}:${isHttps ? 3001 : 3000}`;

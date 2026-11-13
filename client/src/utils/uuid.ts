import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a standard UUID v4 string.
 *
 * Note: We use the `uuid` library instead of `crypto.randomUUID()` because
 * browsers only expose `crypto.randomUUID()` in Secure Contexts (HTTPS or
 * `http://localhost`). When accessing this app over Tailscale via plain HTTP
 * (e.g. `http://100.64.0.1:5173`), the browser treats it as an insecure
 * context and `crypto.randomUUID` is undefined. `uuid` relies on
 * `crypto.getRandomValues()`, which works in both localhost and Tailscale
 * HTTP contexts.
 */
export function generateUUID(): string {
  return uuidv4();
}


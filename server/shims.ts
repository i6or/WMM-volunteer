import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Polyfill __dirname and __filename for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Export for injection
export { __filename, __dirname };

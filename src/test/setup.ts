import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom doesn't implement scrolling.
Object.defineProperty(window, 'scrollTo', { value: vi.fn<() => void>(), writable: true });

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/* eslint-disable @next/next/no-img-element -- las fotos de prueba son <img> simples */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeferredPhoto } from './DeferredPhoto';

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

const BLUR = 'data:image/webp;base64,AAAA';
let observers: Array<{
  callback: Callback;
  options?: IntersectionObserverInit;
  disconnect: ReturnType<typeof vi.fn>;
}>;

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect = vi.fn();
      constructor(
        public callback: Callback,
        public options?: IntersectionObserverInit,
      ) {
        observers.push(this);
      }
      observe() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DeferredPhoto (D-02)', () => {
  it('muestra el marcador con el texto alternativo hasta que la foto se acerca a la pantalla', () => {
    render(
      <DeferredPhoto alt="Palmas de cera en el valle de Cocora" blur={BLUR}>
        <img src="/foto.webp" alt="Palmas de cera en el valle de Cocora" />
      </DeferredPhoto>,
    );
    const frame = screen.getByRole('img', { name: 'Palmas de cera en el valle de Cocora' });
    expect(frame.tagName).toBe('DIV');
    expect(frame.style.backgroundImage).toContain(BLUR);
    expect(document.querySelector('img[src="/foto.webp"]')).toBeNull();
    expect(observers[0]?.options?.rootMargin).toBe('300px 0px');
  });

  it('monta la foto al acercarse y deja de observar', () => {
    render(
      <DeferredPhoto alt="Palmas de cera" blur={BLUR}>
        <img src="/foto.webp" alt="Palmas de cera" />
      </DeferredPhoto>,
    );
    act(() => observers[0]!.callback([{ isIntersecting: true }]));
    expect(screen.getByRole('img', { name: 'Palmas de cera' }).getAttribute('src')).toBe(
      '/foto.webp',
    );
    expect(observers[0]!.disconnect).toHaveBeenCalled();
  });

  it('con texto alternativo vacío, el marcador es decorativo', () => {
    const { container } = render(
      <DeferredPhoto alt="" blur={BLUR}>
        <img src="/foto.webp" alt="" />
      </DeferredPhoto>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});

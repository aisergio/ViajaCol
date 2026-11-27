import { describe, expect, it } from 'vitest';
import { addCatalogItem, newTrip, toTripView } from '@/domain/trip';
import { catalogRef, catalogRefs, catalogTitle } from './catalog';
import { festivalsForTrip, tripMonths } from './context';

describe('tripMonths', () => {
  it('lista los meses que toca el viaje, también al cambiar de año', () => {
    expect(tripMonths('2026-12-30', '2027-01-02')).toEqual([12, 1]);
    expect(tripMonths('2026-08-01', '2026-08-03')).toEqual([8]);
  });
});

describe('festivalsForTrip (US7, escenario 2)', () => {
  it('un viaje en agosto sugiere la Feria de las Flores, con su enlace y su lugar', () => {
    const festivals = festivalsForTrip({ startDate: '2026-08-01', endDate: '2026-08-03' }, 'es');
    const flores = festivals.find((festival) => festival.slug === 'feria-de-las-flores');
    expect(flores).toMatchObject({
      name: 'Feria de las Flores',
      ref: { href: '/fiestas/feria-de-las-flores' },
    });
    expect(flores?.when.length).toBeGreaterThan(3);
    expect(flores?.ref.coords).toHaveLength(2);
  });

  it('solo trae fiestas de los meses del viaje y en el idioma pedido', () => {
    const august = festivalsForTrip({ startDate: '2026-08-01', endDate: '2026-08-03' }, 'en').map(
      (f) => f.slug,
    );
    const march = festivalsForTrip({ startDate: '2026-03-01', endDate: '2026-03-03' }, 'en').map(
      (f) => f.slug,
    );
    expect(august).toContain('feria-de-las-flores');
    expect(march).not.toContain('feria-de-las-flores');
  });
});

describe('referencias del catálogo', () => {
  it('da el nombre en el idioma pedido, el enlace, el lugar y las coordenadas', () => {
    expect(catalogTitle('fiesta', 'feria-de-manizales', 'en')).toBe('Manizales Fair');
    expect(catalogRef('sitio', 'monserrate', 'es')).toMatchObject({
      name: 'Cerro de Monserrate',
      href: '/sitios/monserrate',
    });
    expect(catalogRef('sitio', 'no-existe', 'es')).toBeNull();
  });

  it('arma el mapa de un viaje: las notas no cuentan y una ficha retirada queda en null', () => {
    const now = new Date('2026-11-27T15:00:00.000Z');
    let trip = toTripView(
      newTrip({
        sub: 's',
        tripId: 't',
        details: {
          name: 'X',
          startDate: '2026-12-01',
          endDate: '2026-12-02',
          travelers: 1,
          budget: 0,
        },
        now,
      }),
    );
    trip = addCatalogItem(
      trip,
      { id: 'a', kind: 'plato', slug: 'bandeja-paisa', title: 'Bandeja' },
      now,
    );
    trip = addCatalogItem(
      trip,
      { id: 'b', kind: 'sitio', slug: 'ya-no-existe', title: 'Viejo' },
      now,
    );
    const refs = catalogRefs(trip.items, 'es');
    expect(Object.keys(refs).sort()).toEqual(['plato:bandeja-paisa', 'sitio:ya-no-existe']);
    expect(refs['plato:bandeja-paisa']?.coords).toBeNull();
    expect(refs['sitio:ya-no-existe']).toBeNull();
  });
});

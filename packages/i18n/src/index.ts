import en from '../messages/en.json';
import es from '../messages/es.json';

export const messages = { es, en } as const;

export type Messages = typeof es;

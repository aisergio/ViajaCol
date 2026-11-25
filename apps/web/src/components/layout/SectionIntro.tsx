type Props = { title: string; intro: string; badge?: string };

/** Encabezado de sección: título, introducción y estado (mientras llega el contenido de la spec 004). */
export function SectionIntro({ title, intro, badge }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      {badge ? (
        <p className="mb-4 inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
          {badge}
        </p>
      ) : null}
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{intro}</p>
    </section>
  );
}

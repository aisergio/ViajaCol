/** Franja con los colores de la bandera (amarillo 50 %, azul 25 %, rojo 25 %): motivo de marca. */
export function TricolorStrip() {
  return (
    <div aria-hidden="true" className="flex h-1.5 w-full">
      <span className="w-1/2 bg-flag-yellow" />
      <span className="w-1/4 bg-flag-blue" />
      <span className="w-1/4 bg-flag-red" />
    </div>
  );
}

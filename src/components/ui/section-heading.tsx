/**
 * The eyebrow / heading / lede block that opens every numbered section.
 * The eyebrow string is derived in src/lib/navigation.ts, not written by hand — see
 * the note there about renumbering when Testimonials is hidden.
 */

interface SectionHeadingProps {
  eyebrow: string;
  /** Omit when passing `children` — an interpolated heading uses that instead. */
  title?: string;
  lede?: string;
  /** Referenced by the section's aria-labelledby, so each section is a named region. */
  headingId: string;
  /** Rendered instead of a plain string title, for interpolated counts. */
  children?: React.ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  headingId,
  children,
}: SectionHeadingProps) {
  return (
    <div className="mb-10">
      <p className="mb-2 font-mono text-xs tracking-[0.12em] uppercase text-accent">
        {eyebrow}
      </p>
      <h2
        id={headingId}
        className="mb-3 text-[clamp(1.6rem,3.5vw,2.1rem)] leading-tight font-semibold tracking-tight"
      >
        {children ?? title}
      </h2>
      {lede ? (
        <p className="max-w-[62ch] text-[1.05rem] text-dim">{lede}</p>
      ) : null}
    </div>
  );
}

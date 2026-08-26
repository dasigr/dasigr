/**
 * Pill list used for skill groups, stack tags on timeline entries, and project cards.
 * `primary` is a styling emphasis only — it never means a proficiency level (FR-3).
 */

export interface TagListItem {
  name: string;
  primary?: boolean;
}

interface TagListProps {
  items: readonly (TagListItem | string)[];
  className?: string;
}

export function TagList({ items, className = '' }: TagListProps) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => {
        const tag = typeof item === 'string' ? { name: item } : item;
        return (
          <li
            key={tag.name}
            className={
              tag.primary
                ? 'rounded-full border border-accent/35 bg-accent/10 px-[11px] py-1 text-sm whitespace-nowrap text-accent'
                : 'rounded-full border border-line bg-bg-alt px-[11px] py-1 text-sm whitespace-nowrap text-dim'
            }
          >
            {tag.name}
          </li>
        );
      })}
    </ul>
  );
}

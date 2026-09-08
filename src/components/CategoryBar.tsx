interface CategoryBarProps {
  categories: string[];
  /** "All" or a category name. */
  active: string;
  onSelect: (category: string) => void;
}

/** §31: horizontal chips — "All" first, then sorted distinct categories. */
export default function CategoryBar({ categories, active, onSelect }: CategoryBarProps) {
  return (
    <div className="pos-cats" role="group" aria-label="Product categories">
      {["All", ...categories].map((cat) => (
        <button
          key={cat}
          type="button"
          className="pos-cat"
          aria-pressed={active === cat}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

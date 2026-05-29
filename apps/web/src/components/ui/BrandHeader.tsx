type BrandHeaderProps = {
  brandName: string;
  centered?: boolean;
  showMark?: boolean;
  compact?: boolean;
};

export function BrandHeader({
  brandName,
  centered = false,
  compact = false,
  showMark = true,
}: BrandHeaderProps) {
  return (
    <div
      className={`brand-header${centered ? " brand-header-centered" : ""}${
        compact ? " brand-header-compact" : ""
      }`}
    >
      {showMark ? <span className="brand-mark" aria-hidden="true" /> : null}
      <span>{brandName}</span>
    </div>
  );
}

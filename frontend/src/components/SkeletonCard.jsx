function SkeletonCard() {
  return (
    <div className="pcard-skeleton">
      <div
        className="skeleton-block"
        style={{ width: 80, height: 80, borderRadius: "50%", flexShrink: 0 }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}
      >
        <div
          className="skeleton-block"
          style={{ height: 15, width: "55%", borderRadius: 4 }}
        />
        <div
          className="skeleton-block"
          style={{ height: 12, width: "38%", borderRadius: 3 }}
        />
        <div
          className="skeleton-block"
          style={{ height: 11, width: "70%", borderRadius: 3 }}
        />
      </div>
      <div
        className="skeleton-block"
        style={{ width: 54, height: 28, borderRadius: 999, flexShrink: 0 }}
      />
    </div>
  );
}

export default SkeletonCard;

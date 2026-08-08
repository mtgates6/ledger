export function iconElement(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0ea5e9, #0f172a)",
        borderRadius: size * 0.2,
      }}
    >
      <span
        style={{
          fontSize: size * 0.5,
          fontWeight: 700,
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        $
      </span>
    </div>
  );
}

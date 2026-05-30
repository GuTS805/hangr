export default function StyleGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "white", overflowY: "auto" }}>
      {children}
    </div>
  );
}

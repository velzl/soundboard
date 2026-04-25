type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="card stack stat-card">
      <span className="metric-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="muted">{detail}</span>
    </article>
  );
}

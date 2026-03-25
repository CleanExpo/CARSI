/**
 * AgentStats Component
 *
 * Displays key metrics about agent performance in card format.
 */

const BORDER_COLOURS: Record<string, string> = {
  blue: 'border-l-primary',
  green: 'border-l-emerald-500',
  purple: 'border-l-violet-500',
  orange: 'border-l-amber-500',
  yellow: 'border-l-yellow-500',
};

interface AgentStatsProps {
  stats: {
    total_agents: number
    active_agents: number
    total_tasks: number
    successful_tasks: number
    failed_tasks: number
    success_rate: number
    avg_iterations: number
    avg_duration_seconds: number
  }
}

export function AgentStats({ stats }: AgentStatsProps) {
  const cards = [
    {
      label: 'Active Agents',
      value: stats.active_agents,
      suffix: ` / ${stats.total_agents}`,
      color: 'blue',
    },
    {
      label: 'Success Rate',
      value: (stats.success_rate * 100).toFixed(1),
      suffix: '%',
      color: stats.success_rate > 0.8 ? 'green' : 'yellow',
    },
    {
      label: 'Total Tasks',
      value: stats.total_tasks,
      subtitle: `${stats.successful_tasks} successful`,
      color: 'purple',
    },
    {
      label: 'Avg Iterations',
      value: stats.avg_iterations.toFixed(1),
      subtitle: 'Self-corrections',
      color: stats.avg_iterations < 2 ? 'green' : 'orange',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border border-border bg-card p-6 shadow-sm border-l-4 ${BORDER_COLOURS[card.color] ?? 'border-l-border'}`}
        >
          <div className="mb-2 text-sm font-medium text-muted-foreground">
            {card.label}
          </div>
          <div className="text-3xl font-bold text-foreground">
            {card.value}
            {card.suffix && <span className="text-lg text-muted-foreground">{card.suffix}</span>}
          </div>
          {card.subtitle && (
            <div className="mt-1 text-sm text-muted-foreground/70">{card.subtitle}</div>
          )}
        </div>
      ))}
    </div>
  )
}

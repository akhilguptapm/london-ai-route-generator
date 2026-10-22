// Placeholder card shaped like a finished day, shown for days that haven't streamed in yet.
// Decorative only: the surrounding GenerationProgress announces progress to assistive tech.

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-slate-200 motion-safe:animate-pulse ${className}`} />;
}

export function DaySkeleton({ dayNumber }: { dayNumber: number }) {
  return (
    <div
      aria-hidden="true"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 animate-fade-in"
    >
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/80 text-white h-8 px-3 rounded-lg flex items-center justify-center font-bold text-sm whitespace-nowrap shrink-0">
            Day {dayNumber}
          </div>
          <Bar className="h-5 w-2/3 max-w-sm" />
        </div>
        <Bar className="h-3.5 w-full" />
        <Bar className="h-3.5 w-4/5" />
      </div>

      <div className="space-y-6 border-l-2 border-slate-200 ml-2 pl-5 sm:ml-4 sm:pl-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2.5">
            <Bar className="h-6 w-36" />
            <Bar className="h-5 w-1/2" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

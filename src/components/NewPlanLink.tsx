import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Sends someone who is looking at a saved or expired plan back to the planner. */
export function NewPlanLink() {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="min-w-0">
        <p className="font-bold text-slate-900">Want a different trip?</p>
        <p className="text-sm text-slate-600 mt-1">
          Go back to the planner and create a new plan.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-4 py-3 rounded-xl transition shrink-0"
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        Create a new plan
      </Link>
    </div>
  );
}

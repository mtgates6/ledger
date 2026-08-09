import { lock } from "@/app/unlock/actions";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 safe-top">
      <h1 className="text-lg font-semibold">{title}</h1>
      <form action={lock}>
        <button
          type="submit"
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Lock
        </button>
      </form>
    </header>
  );
}

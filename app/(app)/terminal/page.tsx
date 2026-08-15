import { Terminal } from "@/components/Terminal";

export default function TerminalPage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="font-display text-xl">Terminal</h2>
      <p className="text-sm text-muted">
        Connected to the runtime shell. Commands execute inside the compute environment, not on your local device.
      </p>
      <div className="flex-1 min-h-[360px]">
        <Terminal />
      </div>
    </div>
  );
}

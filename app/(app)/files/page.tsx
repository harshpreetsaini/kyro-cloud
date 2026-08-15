import { FileManager } from "@/components/FileManager";

export default function FilesPage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="font-display text-xl">Files</h2>
      <div className="flex-1 min-h-[360px]">
        <FileManager />
      </div>
    </div>
  );
}

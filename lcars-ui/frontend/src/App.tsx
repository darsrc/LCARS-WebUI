import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type Manifest = Record<string, unknown>;

const fetchManifest = async (): Promise<Manifest> => {
  const response = await axios.get<Manifest>("/lcars/manifest");
  return response.data;
};

export default function App() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["manifest"],
    queryFn: fetchManifest,
  });

  if (isLoading) {
    return <div className="p-6 text-primary">Loading LCARS manifest...</div>;
  }

  if (isError) {
    return (
      <div className="p-6 text-alert">
        Failed to load manifest: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold text-primary">LCARS Manifest Debug View</h1>
      <pre className="overflow-auto rounded border border-secondary bg-black/70 p-4 text-sm text-secondary">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}

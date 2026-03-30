interface JSONViewerProps {
  value: unknown;
}

export function JSONViewer({ value }: JSONViewerProps) {
  return (
    <pre className="glass-card max-h-[400px] overflow-auto p-4 text-xs text-emerald-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

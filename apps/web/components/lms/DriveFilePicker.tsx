interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface DriveFilePickerProps {
  files: DriveFile[];
  onSelect: (fileId: string) => void;
  selectedId?: string;
}

export function DriveFilePicker({ files, onSelect, selectedId }: DriveFilePickerProps) {
  if (files.length === 0) {
    return <p className="text-muted-foreground text-sm">No files found in Drive.</p>;
  }

  return (
    <ul className="space-y-2">
      {files.map((file) => {
        const isSelected = file.id === selectedId;
        return (
          <li key={file.id}>
            <button
              type="button"
              data-selected={isSelected ? true : undefined}
              onClick={() => onSelect(file.id)}
              className={`w-full rounded-sm border px-4 py-2 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/10 font-medium'
                  : 'hover:bg-muted/50'
              }`}
            >
              {file.name}
              <span className="text-muted-foreground ml-2 text-xs">{file.mimeType}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

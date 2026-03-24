interface DriveFileViewerProps {
  driveFileId: string;
  className?: string;
}

export function DriveFileViewer({ driveFileId, className }: DriveFileViewerProps) {
  const src = `https://drive.google.com/file/d/${driveFileId}/preview`;

  return (
    <iframe
      src={src}
      allow="autoplay"
      className={className ?? 'h-[600px] w-full rounded-lg border'}
      title="Google Drive file viewer"
    />
  );
}

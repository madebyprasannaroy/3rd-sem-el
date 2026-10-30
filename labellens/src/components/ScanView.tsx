"use client";

import EnhancedScanView, { type Field, type Photo } from "./scan/EnhancedScanView";

export type { Field, Photo };

export default function ScanView(props: {
  scanId: string;
  initialTitle?: string | null;
  initialStatus: string;
  initialFields: Field[];
  photos: Photo[];
  canEdit: boolean;
}) {
  return <EnhancedScanView {...props} />;
}

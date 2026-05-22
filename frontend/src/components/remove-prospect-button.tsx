"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

import { removeProspect } from "@/lib/prospects";

export function RemoveProspectButton({
  apiBaseUrl,
  prospectId,
}: {
  apiBaseUrl: string | undefined;
  prospectId: string;
}) {
  const router = useRouter();

  async function onRemove() {
    if (!apiBaseUrl) {
      return;
    }
    await removeProspect(
      apiBaseUrl,
      prospectId,
      "Determined N/A after later chapter review.",
    );
    router.refresh();
  }

  return (
    <button
      className="mt-2 inline-flex items-center gap-1 rounded-md border border-clay/25 px-2 py-1 text-xs font-semibold text-clay disabled:opacity-50"
      type="button"
      disabled={!apiBaseUrl}
      onClick={onRemove}
    >
      <XCircle className="h-3.5 w-3.5" />
      Remove
    </button>
  );
}

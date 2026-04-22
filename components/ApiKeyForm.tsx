"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type Provider = "openai" | "anthropic";

type StoredKey = {
  id: string;
  provider: Provider;
  keyName: string;
  masked: string;
  updatedAt: string;
};

type ApiKeyFormProps = {
  initialKeys: StoredKey[];
};

export function ApiKeyForm({ initialKeys }: ApiKeyFormProps) {
  const [keys, setKeys] = useState<StoredKey[]>(initialKeys);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState("Primary");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const emptyState = useMemo(() => keys.length === 0, [keys]);

  async function refreshKeys() {
    const response = await fetch("/api/api-keys", { method: "GET" });
    const data = (await response.json()) as { keys?: StoredKey[]; error?: string };

    if (!response.ok) {
      throw new Error(data.error || "Could not refresh API keys.");
    }

    setKeys(data.keys ?? []);
  }

  function saveKey() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey,
            keyName,
          }),
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Failed to save API key.");
        }

        await refreshKeys();
        setMessage(`${provider.toUpperCase()} key saved.`);
        setApiKey("");
        setKeyName("Primary");
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unknown error while saving key.");
      }
    });
  }

  function removeKey(providerToDelete: Provider) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/api-keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerToDelete }),
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete key.");
        }

        await refreshKeys();
        setMessage(`${providerToDelete.toUpperCase()} key removed.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unknown error while deleting key.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f1726] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Provider API keys</h2>
          <p className="mt-1 text-sm text-slate-300">
            Keys are encrypted at rest and only used for read-only weekly usage ingestion.
          </p>
        </div>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#0b1320]"
            >
              <Plus className="h-4 w-4" />
              Add key
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-slate-100">Save provider key</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-300">
                    Store a read-only key so weekly reports can run automatically.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 p-1 text-slate-300 hover:bg-white/5"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="mt-5 space-y-3">
                <label className="block text-sm text-slate-300">Provider</label>
                <Select.Root value={provider} onValueChange={(value) => setProvider(value as Provider)}>
                  <Select.Trigger className="inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0a1322] px-3 py-2 text-sm text-slate-100">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden rounded-lg border border-white/10 bg-[#111827] shadow-xl">
                      <Select.Viewport className="p-1">
                        <Select.Item
                          value="openai"
                          className="relative flex cursor-pointer items-center rounded-md px-8 py-2 text-sm text-slate-100 outline-none hover:bg-white/5"
                        >
                          <Select.ItemText>openai</Select.ItemText>
                          <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                            <Check className="h-4 w-4 text-cyan-300" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Item
                          value="anthropic"
                          className="relative flex cursor-pointer items-center rounded-md px-8 py-2 text-sm text-slate-100 outline-none hover:bg-white/5"
                        >
                          <Select.ItemText>anthropic</Select.ItemText>
                          <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                            <Check className="h-4 w-4 text-cyan-300" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>

                <input
                  type="text"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="Key label"
                  className="w-full rounded-xl border border-white/10 bg-[#0a1322] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/60 placeholder:text-slate-500 focus:ring-2"
                />

                <textarea
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Paste API key"
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-[#0a1322] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/60 placeholder:text-slate-500 focus:ring-2"
                />
              </div>

              <button
                type="button"
                onClick={saveKey}
                disabled={isPending || !apiKey || !keyName}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#0b1320] disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save key
              </button>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {emptyState ? (
        <p className="mt-5 rounded-xl border border-dashed border-white/15 bg-[#0b1320] p-4 text-sm text-slate-300">
          No provider keys saved yet. Add OpenAI and/or Anthropic keys to enable weekly analysis.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1320] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium capitalize text-slate-100">{key.provider}</p>
                <p className="text-xs text-slate-400">
                  {key.keyName} · {key.masked}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeKey(key.provider)}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300/40 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  IMPORT_FIELDS,
  ColumnMapping,
  guessMapping,
  applyMapping,
  FieldKey,
} from "@/lib/csv";
import { commitImport, type ImportResult } from "@/app/actions";
import { money, qty } from "@/lib/format";

type Stage = "upload" | "map" | "done";

export function Importer() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  function handleFile(file: File) {
    setParseError(null);
    setFilename(file.name);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const hdrs = (res.meta.fields ?? []).filter(Boolean) as string[];
        if (hdrs.length === 0) {
          setParseError(
            "No columns found. The file needs a header row naming each column (e.g. Date, Item, Qty, Total).",
          );
          return;
        }
        const data = res.data.filter((r) =>
          Object.values(r).some((v) => v != null && String(v).trim() !== ""),
        );
        setHeaders(hdrs);
        setRows(data);
        setMapping(guessMapping(hdrs));
        setStage("map");
      },
      error: (err) => setParseError(err.message),
    });
  }

  const parsedPreview = useMemo(() => {
    return rows.slice(0, 8).map((r) => applyMapping(r, mapping));
  }, [rows, mapping]);

  const stats = useMemo(() => {
    let valid = 0;
    let skipped = 0;
    for (const r of rows) {
      const p = applyMapping(r, mapping);
      if (p.saleDate && p.item.trim()) valid++;
      else skipped++;
    }
    return { valid, skipped };
  }, [rows, mapping]);

  const canImport =
    !!mapping.saleDate && !!mapping.item && stats.valid > 0 && !pending;

  function setField(field: FieldKey, header: string) {
    setMapping((m) => {
      const next = { ...m };
      if (header === "") delete next[field];
      else next[field] = header;
      return next;
    });
  }

  function doImport() {
    const payload = {
      filename,
      mapping: mapping as Record<string, string>,
      rows: rows.map((r) => {
        const p = applyMapping(r, mapping);
        return {
          saleDate: p.saleDate ? p.saleDate.toISOString() : null,
          item: p.item,
          sku: p.sku,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          lineTotal: p.lineTotal,
          category: p.category,
        };
      }),
    };
    start(async () => {
      const res = await commitImport(JSON.stringify(payload));
      setResult(res);
      if (res.ok) {
        setStage("done");
        router.refresh();
      }
    });
  }

  function reset() {
    setStage("upload");
    setFilename("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setParseError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  /* ----------------------------- Upload ----------------------------- */
  if (stage === "upload") {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-strong/25 bg-card px-6 py-16 text-center transition-colors hover:border-gold hover:bg-gold-soft/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold-soft">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--gold-deep))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
              </svg>
            </div>
            <div className="font-serif text-lg">Bring the SD-card file</div>
            <div className="max-w-sm text-[13px] text-muted-foreground">
              Drop a CSV or text sales export here, or click to choose. We&apos;ll read the
              columns and let you confirm how they map before anything is saved.
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.txt,.tsv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <span className="btn btn-gold btn-sm mt-1">Choose file</span>
          </label>
          {parseError && (
            <div className="mt-3 rounded-lg border border-negative/30 bg-[hsl(var(--negative)/0.08)] px-4 py-3 text-[13px]" style={{ color: "hsl(0,55%,42%)" }}>
              {parseError}
            </div>
          )}
        </div>

        <aside className="card p-5">
          <h3 className="font-serif text-lg">The SD-card path</h3>
          <ol className="mt-3 space-y-3 text-[13px] text-muted-foreground">
            <li className="flex gap-3">
              <span className="badge badge-gold shrink-0">1</span>
              On the Royal 7000ML, run a <strong className="text-foreground">PLU / item sales report</strong> and save it to the SD card.
            </li>
            <li className="flex gap-3">
              <span className="badge badge-gold shrink-0">2</span>
              Put the SD card in your computer and drop the file here.
            </li>
            <li className="flex gap-3">
              <span className="badge badge-gold shrink-0">3</span>
              Confirm the column mapping once — Rodriguez remembers it for next time.
            </li>
          </ol>
          <div className="mt-4 rule-gold" />
          <p className="mt-3 text-[12px] text-muted-foreground">
            Don&apos;t have the exact format yet? Any CSV with a header row works. Once you
            share a real export, the mapping can be tuned to match it exactly.
          </p>
        </aside>
      </div>
    );
  }

  /* ------------------------------ Done ------------------------------ */
  if (stage === "done" && result?.ok) {
    return (
      <div className="card px-6 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold-soft">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--gold-deep))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="mt-4 font-serif text-2xl">The offering is recorded</h3>
        <p className="mt-2 text-[14px] text-muted-foreground">
          <strong className="text-foreground font-numeric">{result.imported}</strong> sales imported ·{" "}
          <strong className="text-foreground font-numeric">{result.matched}</strong> matched to items
          {result.skipped > 0 && (
            <> · <span className="font-numeric">{result.skipped}</span> skipped (no date/item)</>
          )}
        </p>
        {result.matched < result.imported && (
          <p className="mx-auto mt-2 max-w-md text-[13px] text-muted-foreground">
            {result.imported - result.matched} line(s) didn&apos;t match a catalog item, so their
            profit isn&apos;t counted. Reconcile them in The Ledger.
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <a href="/" className="btn btn-primary">View the dashboard</a>
          <a href="/sales" className="btn btn-ghost">Open the ledger</a>
          <button className="btn btn-ghost" onClick={reset}>Import another</button>
        </div>
      </div>
    );
  }

  /* ------------------------------ Map ------------------------------- */
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      {/* Mapping panel */}
      <div className="card h-fit p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg">Map the columns</h3>
          <button className="btn btn-sm btn-ghost" onClick={reset}>Start over</button>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          From <span className="font-numeric">{filename}</span>
        </p>
        <div className="mt-4 space-y-3">
          {IMPORT_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <label className="label flex items-center gap-1.5">
                {f.label}
                {f.required && <span style={{ color: "hsl(0,55%,42%)" }}>*</span>}
              </label>
              <select
                className="field h-9 max-w-[58%]"
                value={mapping[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
              >
                <option value="">— none —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 rule-gold" />
        <div className="mt-3 flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Ready to import</span>
          <span className="font-numeric font-semibold">{stats.valid} rows</span>
        </div>
        {stats.skipped > 0 && (
          <div className="mt-1 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Skipped (no date/item)</span>
            <span className="font-numeric">{stats.skipped}</span>
          </div>
        )}
        {(!mapping.saleDate || !mapping.item) && (
          <p className="mt-3 text-[12px]" style={{ color: "hsl(0,55%,42%)" }}>
            Date and Item name are required to import.
          </p>
        )}
        <button className="btn btn-primary mt-4 w-full" disabled={!canImport} onClick={doImport}>
          {pending ? "Recording…" : `Import ${stats.valid} sales`}
        </button>
        {result && !result.ok && (
          <p className="mt-2 text-[13px]" style={{ color: "hsl(0,55%,42%)" }}>{result.error}</p>
        )}
      </div>

      {/* Preview */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-serif text-lg">Preview</h3>
          <span className="text-[12px] text-muted-foreground">
            First {parsedPreview.length} of {rows.length} rows, as they&apos;ll be read
          </span>
        </div>
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[560px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>PLU</th>
                <th className="num">Qty</th>
                <th className="num">Price</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {parsedPreview.map((p, i) => (
                <tr key={i} className={!p.saleDate || !p.item ? "opacity-40" : ""}>
                  <td className="font-numeric text-[12px]">
                    {p.saleDate ? p.saleDate.toLocaleDateString() : "—"}
                  </td>
                  <td>{p.item || <span className="text-muted-foreground">—</span>}</td>
                  <td className="font-numeric text-[12px] text-muted-foreground">{p.sku ?? "—"}</td>
                  <td className="num">{qty(p.quantity)}</td>
                  <td className="num">{money(p.unitPrice)}</td>
                  <td className="num font-semibold">{money(p.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Cost &amp; profit are attached automatically for items whose name or PLU matches
          your catalog. Unmatched rows can be reconciled afterward.
        </p>
      </div>
    </div>
  );
}

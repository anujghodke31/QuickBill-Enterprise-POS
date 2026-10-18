import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, FileText, PackagePlus, ScanLine, TriangleAlert, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  GST_RATES,
  rupeesToPaise,
  type BillScanConfirmInput,
  type BillScanDTO,
  type BillScanLineDTO,
  type CategoryDTO,
  type SupplierDTO,
} from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SectionTitle,
  Skeleton,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Field, Input, Select } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatINR, formatRelative } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { AiSetupNotice, useAiStatus } from './ai-status';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

// ── Upload ───────────────────────────────────────────────────────────────────

function UploadArea({
  disabled,
  pdf,
  onScanned,
}: {
  disabled: boolean;
  /** False when the AI service takes images only. */
  pdf: boolean;
  onScanned: (scan: BillScanDTO) => void;
}) {
  const accept = pdf ? ACCEPT : ACCEPT.filter((type) => type !== 'application/pdf');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const choose = (f: File | undefined) => {
    if (!f) return;
    if (!accept.includes(f.type)) {
      setProblem(
        pdf
          ? 'That file type is not supported. Use a JPG, PNG or WebP photo, or a PDF.'
          : 'That file type is not supported. Use a JPG, PNG or WebP photo or screenshot.',
      );
      return;
    }
    if (f.size > MAX_BYTES) {
      setProblem(
        pdf
          ? 'That file is larger than 10 MB. Take a smaller photo or export a lighter PDF.'
          : 'That file is larger than 10 MB. Take a smaller photo.',
      );
      return;
    }
    setProblem(null);
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const scan = useMutation({
    mutationFn: (f: File) => {
      const body = new FormData();
      body.append('file', f);
      return api.post<BillScanDTO>('/ai/bill-scans', body);
    },
    onSuccess: (result) => {
      setFile(null);
      setPreview(null);
      onScanned(result);
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'The bill could not be read. Check your connection and try again.',
      ),
  });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && !scan.isPending) choose(e.dataTransfer.files[0]);
  };

  return (
    <Panel className="p-5">
      <input
        ref={input}
        type="file"
        accept={accept.join(',')}
        className="sr-only"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = '';
        }}
        disabled={disabled}
      />
      {scan.isPending && file ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:text-left">
          <FilePreview file={file} preview={preview} />
          <div>
            <p className="type-heading flex items-center justify-center gap-2 text-xl sm:justify-start">
              <Spinner className="size-5 text-peacock-600" /> Reading the bill…
            </p>
            <p className="mt-1 max-w-md text-ink-soft">
              Claude reads every line of the bill, then QuickBill matches each one to your catalog.
              This usually takes 10 to 30 seconds.
            </p>
          </div>
        </div>
      ) : file ? (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <FilePreview file={file} preview={preview} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-ink-faint">{(file.size / 1024).toFixed(0)} KB</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => scan.mutate(file)} disabled={disabled}>
                <ScanLine /> Read this bill
              </Button>
              <Button variant="secondary" onClick={() => input.current?.click()}>
                Choose another file
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex w-full flex-col items-center rounded-xl border-2 border-dashed border-line-strong px-6 py-12 text-center transition-colors hover:border-peacock-500 hover:bg-peacock-50/40 disabled:cursor-not-allowed disabled:opacity-50',
            dragging && 'border-peacock-500 bg-peacock-50/60',
          )}
        >
          <Upload className="size-8 text-peacock-600" />
          <span className="type-heading mt-3 text-lg">
            Drop a supplier bill here, or choose a file
          </span>
          <span className="mt-1 text-sm text-ink-soft">
            {pdf
              ? 'A clear photo or a PDF, up to 10 MB'
              : 'A clear photo or screenshot, up to 10 MB'}
          </span>
        </button>
      )}
      {problem && (
        <p role="alert" className="mt-4 rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
          {problem}
        </p>
      )}
      {!file && (
        <p className="mt-4 text-[13px] text-ink-faint">
          No bill to hand? The repository includes one at{' '}
          <code className="font-mono">docs/sample-bills/western-fmcg-invoice.pdf</code>
          {pdf ? '.' : '. Open it and upload a screenshot.'}
        </p>
      )}
    </Panel>
  );
}

function FilePreview({ file, preview }: { file: File; preview: string | null }) {
  return preview ? (
    <img
      src={preview}
      alt={file.name}
      className="h-40 w-32 shrink-0 rounded-lg border border-line object-cover"
    />
  ) : (
    <div className="grid h-40 w-32 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-faint">
      <FileText className="size-10" />
    </div>
  );
}

// ── Review ───────────────────────────────────────────────────────────────────

type LineAction = 'match' | 'create' | 'skip';

interface LineDraft {
  action: LineAction;
  productId: string;
  quantity: string;
  unitCost: string;
  taxRate: number;
  newName: string;
  newCategoryId: string;
  newPrice: string;
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

const toRupees = (paise: number) => (paise / 100).toFixed(2);

function initialDraft(line: BillScanLineDTO): LineDraft {
  const top = line.candidates[0];
  const productId = line.suggestedProductId ?? (top && top.score >= 0.35 ? top.productId : '');
  return {
    action: productId ? 'match' : 'create',
    productId,
    quantity: String(line.quantity),
    unitCost: toRupees(line.unitCost),
    taxRate: line.taxRate,
    newName: titleCase(line.description),
    newCategoryId: '',
    newPrice: String(Math.ceil((line.unitCost * 1.25) / 100)),
  };
}

function Confidence({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.6 ? 'bg-leaf-500' : score >= 0.4 ? 'bg-turmeric-500' : 'bg-chilli-500';
  return (
    <span
      className="flex items-center gap-2 text-[13px] text-ink-faint"
      title="How closely the printed name matches the product"
    >
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.07]">
        <span
          className={cn('block h-full rounded-full', color)}
          style={{ width: `${Math.max(6, pct)}%` }}
        />
      </span>
      {pct}% match
    </span>
  );
}

function parseRupees(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? rupeesToPaise(n) : null;
}

function Review({ scan, onDone }: { scan: BillScanDTO; onDone: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState(scan.supplier.matchedSupplierId ?? '');
  const [invoiceNo, setInvoiceNo] = useState(scan.invoiceNumber ?? '');
  const [invoiceDate, setInvoiceDate] = useState(scan.invoiceDate ?? '');
  const [lines, setLines] = useState<LineDraft[]>(() => scan.lines.map(initialDraft));
  const [errors, setErrors] = useState<string[]>([]);

  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<SupplierDTO[]>('/suppliers'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDTO[]>('/catalog/categories'),
  });

  const update = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const computedTotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        if (l.action === 'skip') return sum;
        const cost = parseRupees(l.unitCost) ?? 0;
        return sum + cost * (Number.parseInt(l.quantity, 10) || 0);
      }, 0),
    [lines],
  );
  const printedTotal = scan.totals.total;
  const allLinesTotal = scan.lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  const mismatch =
    printedTotal !== null &&
    Math.abs(allLinesTotal - printedTotal) > Math.max(100, printedTotal * 0.01);
  const receiving = lines.filter((l) => l.action !== 'skip').length;

  const confirm = useMutation({
    mutationFn: (input: BillScanConfirmInput) =>
      api.post<{ purchaseOrderId: string; createdProducts: number }>(
        `/ai/bill-scans/${scan.id}/confirm`,
        input,
      ),
    onSuccess: () => {
      toast.success('Stock received');
      void qc.invalidateQueries({ queryKey: ['bill-scans'] });
      void qc.invalidateQueries({ queryKey: ['bill-scan', scan.id] });
      void qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      void qc.invalidateQueries({ queryKey: ['ai', 'forecast'] });
      onDone();
    },
    onError: (error) => setErrors([error.message]),
  });

  const submit = () => {
    const problems: string[] = [];
    if (!supplierId) problems.push('Choose the supplier this bill is from.');
    const payload: BillScanConfirmInput['lines'] = lines.map((l, i) => {
      const n = i + 1;
      if (l.action === 'skip') return { action: 'skip' };
      const quantity = Number.parseInt(l.quantity, 10);
      const unitCost = parseRupees(l.unitCost);
      if (!quantity || quantity < 1) problems.push(`Line ${n}: enter a quantity of at least 1.`);
      if (unitCost === null) problems.push(`Line ${n}: enter the unit cost in rupees.`);
      if (l.action === 'match') {
        if (!l.productId)
          problems.push(`Line ${n}: pick the matching product, create one, or skip the line.`);
        return {
          action: 'match',
          productId: l.productId,
          quantity,
          unitCost: unitCost ?? 0,
          taxRate: l.taxRate,
        };
      }
      const price = parseRupees(l.newPrice);
      if (l.newName.trim().length < 2) problems.push(`Line ${n}: give the new product a name.`);
      if (!l.newCategoryId) problems.push(`Line ${n}: choose a category for the new product.`);
      if (!price) problems.push(`Line ${n}: set a selling price for the new product.`);
      return {
        action: 'create',
        name: l.newName.trim(),
        categoryId: l.newCategoryId,
        quantity,
        unitCost: unitCost ?? 0,
        price: price ?? 0,
        taxRate: l.taxRate,
      };
    });
    if (receiving === 0) problems.push('Every line is skipped. Keep at least one line to receive.');
    setErrors(problems);
    if (problems.length) return;
    confirm.mutate({
      supplierId,
      supplierInvoiceNo: invoiceNo.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      lines: payload,
    });
  };

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
          <Field
            label="Supplier"
            hint={
              scan.supplier.name
                ? `Printed as “${scan.supplier.name}”${scan.supplier.gstin ? `, GSTIN ${scan.supplier.gstin}` : ''}`
                : undefined
            }
            error={
              !scan.supplier.matchedSupplierId && !supplierId
                ? 'No supplier matched. Pick one from the list.'
                : undefined
            }
          >
            {(p) => (
              <Select {...p} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Choose a supplier</option>
                {suppliers.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Invoice number">
            {(p) => (
              <Input {...p} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            )}
          </Field>
          <Field label="Invoice date">
            {(p) => (
              <Input
                {...p}
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            )}
          </Field>
        </div>
        {scan.warnings.length > 0 && (
          <div className="mt-5 rounded-xl border border-turmeric-300 bg-turmeric-50 px-4 py-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-turmeric-800">
              <TriangleAlert className="size-4" /> Check these before receiving
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-6 text-ink-soft">
              {scan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="type-heading text-lg">
            {scan.lines.length} lines read from {scan.fileName}
          </h2>
          <p className="text-sm text-ink-faint">Unit costs include GST.</p>
        </div>
        <Table>
          <thead>
            <tr>
              <Th className="w-8">#</Th>
              <Th>As printed</Th>
              <Th className="w-24 text-right">Qty</Th>
              <Th className="w-32 text-right">Unit cost (₹)</Th>
              <Th className="w-24">GST</Th>
              <Th className="min-w-72">Product in QuickBill</Th>
              <Th className="text-right">Line total</Th>
            </tr>
          </thead>
          <tbody>
            {scan.lines.map((line, i) => {
              const draft = lines[i]!;
              const candidate = line.candidates.find((c) => c.productId === draft.productId);
              const lineTotal =
                draft.action === 'skip'
                  ? null
                  : (parseRupees(draft.unitCost) ?? 0) * (Number.parseInt(draft.quantity, 10) || 0);
              return (
                <tr key={i} className={cn(draft.action === 'skip' && 'opacity-50')}>
                  <Td className="text-ink-faint tabular-nums">{i + 1}</Td>
                  <Td className="min-w-52">
                    <p className="font-mono text-[13px] text-ink">{line.description}</p>
                    {line.unit && <p className="text-[13px] text-ink-faint">{line.unit}</p>}
                  </Td>
                  <Td>
                    <Input
                      inputMode="numeric"
                      className="h-9 text-right tabular-nums"
                      value={draft.quantity}
                      onChange={(e) => update(i, { quantity: e.target.value.replace(/\D/g, '') })}
                      aria-label={`Quantity for line ${i + 1}`}
                      disabled={draft.action === 'skip'}
                    />
                  </Td>
                  <Td>
                    <Input
                      inputMode="decimal"
                      className="h-9 text-right tabular-nums"
                      value={draft.unitCost}
                      onChange={(e) =>
                        update(i, { unitCost: e.target.value.replace(/[^\d.]/g, '') })
                      }
                      aria-label={`Unit cost for line ${i + 1}`}
                      disabled={draft.action === 'skip'}
                    />
                  </Td>
                  <Td>
                    <Select
                      className="[&_select]:h-9"
                      value={String(draft.taxRate)}
                      onChange={(e) => update(i, { taxRate: Number(e.target.value) })}
                      aria-label={`GST rate for line ${i + 1}`}
                      disabled={draft.action === 'skip'}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <Select
                      className="[&_select]:h-9"
                      value={draft.action === 'match' ? `p:${draft.productId}` : draft.action}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.startsWith('p:'))
                          update(i, { action: 'match', productId: v.slice(2) });
                        else update(i, { action: v as LineAction });
                      }}
                      aria-label={`Product for line ${i + 1}`}
                    >
                      {draft.action === 'match' && !draft.productId && (
                        <option value="p:">Choose a product</option>
                      )}
                      {line.candidates.map((c) => (
                        <option key={c.productId} value={`p:${c.productId}`}>
                          {c.name} ({c.sku})
                        </option>
                      ))}
                      <option value="create">Create a new product</option>
                      <option value="skip">Skip this line</option>
                    </Select>
                    {draft.action === 'match' && candidate && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Confidence score={candidate.score} />
                        {candidate.costPrice > 0 && (
                          <span className="text-[13px] text-ink-faint">
                            last cost {formatINR(candidate.costPrice)}
                          </span>
                        )}
                      </div>
                    )}
                    {draft.action === 'create' && (
                      <div className="mt-2 grid gap-2 rounded-lg border border-line bg-paper p-2 sm:grid-cols-2">
                        <Input
                          className="h-9 sm:col-span-2"
                          value={draft.newName}
                          onChange={(e) => update(i, { newName: e.target.value })}
                          aria-label={`New product name for line ${i + 1}`}
                          placeholder="Product name"
                        />
                        <Select
                          className="[&_select]:h-9"
                          value={draft.newCategoryId}
                          onChange={(e) => update(i, { newCategoryId: e.target.value })}
                          aria-label={`Category for line ${i + 1}`}
                        >
                          <option value="">Category</option>
                          {categories.data?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-faint">
                            ₹
                          </span>
                          <Input
                            inputMode="decimal"
                            className="h-9 pl-7 tabular-nums"
                            value={draft.newPrice}
                            onChange={(e) =>
                              update(i, { newPrice: e.target.value.replace(/[^\d.]/g, '') })
                            }
                            aria-label={`Selling price for line ${i + 1}`}
                            placeholder="Selling price"
                          />
                        </div>
                        <p className="text-[12px] text-ink-faint sm:col-span-2">
                          New products stay hidden from the shop until you publish them.
                        </p>
                      </div>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {lineTotal === null ? '—' : formatINR(lineTotal)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <div className="flex flex-col gap-1 border-t border-line px-4 py-4 text-sm sm:items-end">
          <p className="flex gap-6">
            <span className="text-ink-soft">Receiving</span>
            <span className="w-28 text-right font-semibold tabular-nums">
              {formatINR(computedTotal)}
            </span>
          </p>
          <p className="flex gap-6">
            <span className="text-ink-soft">Printed bill total</span>
            <span className="w-28 text-right tabular-nums">
              {printedTotal === null ? 'Not found' : formatINR(printedTotal)}
            </span>
          </p>
          {mismatch && printedTotal !== null && (
            <p className="mt-1 flex items-center gap-1.5 text-turmeric-800">
              <TriangleAlert className="size-4" />
              The lines add up to {formatINR(allLinesTotal)},{' '}
              {formatINR(Math.abs(allLinesTotal - printedTotal))}{' '}
              {allLinesTotal > printedTotal ? 'more' : 'less'} than the printed total. Check
              quantities and costs.
            </p>
          )}
        </div>
      </Panel>

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-chilli-100 bg-chilli-50 px-4 py-3 text-sm text-chilli-700"
        >
          <ul className="list-disc space-y-0.5 pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="text-sm text-ink-soft">
          Receiving adds stock now and records a purchase order marked as received.
        </p>
        <Button size="lg" onClick={submit} loading={confirm.isPending}>
          <PackagePlus />
          Receive {receiving} {receiving === 1 ? 'line' : 'lines'} into stock
        </Button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function RecentScans({ onOpen }: { onOpen: (id: string) => void }) {
  const scans = useQuery({
    queryKey: ['bill-scans'],
    queryFn: () => api.get<BillScanDTO[]>('/ai/bill-scans'),
  });
  if (scans.isPending) return <Skeleton className="h-32" />;
  if (scans.error) return <ErrorState error={scans.error} onRetry={() => void scans.refetch()} />;
  if (!scans.data.length) return null;
  return (
    <section>
      <SectionTitle>Recent scans</SectionTitle>
      <Panel>
        <ul className="divide-y divide-line">
          {scans.data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <FileText className="size-5 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.supplier.name ?? s.fileName}</p>
                <p className="text-[13px] text-ink-faint">
                  {s.lines.length} lines, scanned {formatRelative(s.createdAt)}
                  {s.invoiceNumber && `, invoice ${s.invoiceNumber}`}
                </p>
              </div>
              {s.status === 'CONFIRMED' ? (
                <>
                  <Badge tone="leaf">
                    <CircleCheck className="size-3.5" /> Received
                  </Badge>
                  {s.purchaseOrderId && (
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/purchasing/${s.purchaseOrderId}`}>View purchase order</Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Badge tone="turmeric">
                    <TriangleAlert className="size-3.5" /> Needs review
                  </Badge>
                  <Button variant="secondary" size="sm" onClick={() => onOpen(s.id)}>
                    Continue review
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}

export default function BillScanPage() {
  useDocumentTitle('Scan a bill');
  const qc = useQueryClient();
  const status = useAiStatus();
  const [params, setParams] = useSearchParams();
  const scanId = params.get('scan');

  const scan = useQuery({
    queryKey: ['bill-scan', scanId],
    queryFn: () => api.get<BillScanDTO>(`/ai/bill-scans/${scanId}`),
    enabled: !!scanId,
  });

  const open = (id: string) => setParams({ scan: id });
  const close = () => setParams({});
  const llmOff = status.data?.llm === false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan a supplier bill"
        description="Photograph or upload a supplier's invoice. Claude reads the lines, QuickBill matches them to your products, and you check everything before stock is added."
        actions={
          scanId ? (
            <Button variant="secondary" onClick={close}>
              Scan another bill
            </Button>
          ) : undefined
        }
      />

      {!scanId ? (
        <>
          {llmOff && <AiSetupNotice feature="Bill scanning" />}
          <UploadArea
            disabled={llmOff || status.isPending}
            pdf={status.data?.pdf ?? true}
            onScanned={(result) => {
              qc.setQueryData(['bill-scan', result.id], result);
              void qc.invalidateQueries({ queryKey: ['bill-scans'] });
              open(result.id);
            }}
          />
          <RecentScans onOpen={open} />
        </>
      ) : scan.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-80" />
        </div>
      ) : scan.error ? (
        <ErrorState error={scan.error} onRetry={() => void scan.refetch()} />
      ) : scan.data.status === 'CONFIRMED' ? (
        <Panel>
          <EmptyState
            icon={<CircleCheck className="text-leaf-600" />}
            title="This bill has been received"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {scan.data.purchaseOrderId && (
                  <Button asChild>
                    <Link to={`/admin/purchasing/${scan.data.purchaseOrderId}`}>
                      Open the purchase order
                    </Link>
                  </Button>
                )}
                <Button variant="secondary" onClick={close}>
                  Scan another bill
                </Button>
              </div>
            }
          >
            Its {scan.data.lines.length} lines were added to stock and recorded on a purchase order.
          </EmptyState>
        </Panel>
      ) : (
        <Review key={scan.data.id} scan={scan.data} onDone={() => void scan.refetch()} />
      )}
    </div>
  );
}

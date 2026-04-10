export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  MapPin,
  Truck,
  ArrowRightLeft,
  Hash
} from "lucide-react";

import { ApprovalActions } from "@/components/dashboard/approval-actions";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, formatPercentage } from "@/lib/utils";
import { getShipmentDetail, getShipmentAuditLogs } from "@/lib/repository";

export default async function ShipmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [shipment, auditLogs] = await Promise.all([
    getShipmentDetail(id),
    getShipmentAuditLogs(id)
  ]);

  if (!shipment) {
    notFound();
  }

  const invoice = shipment.documents.find((d) => d.doc_type === "invoice")?.extracted_data?.extracted_fields;
  const invoiceTotal = invoice && "total_amount" in invoice ? invoice.total_amount : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <PageHeader
        title={shipment.shipment_ref ?? shipment.bol_number ?? shipment.id.slice(0, 12)}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Shipments", href: "/dashboard/shipments" },
          { label: shipment.shipment_ref ?? "Detail" }
        ]}
        actions={
          <ApprovalActions
            shipmentId={shipment.id}
            canApprove={shipment.discrepancy_level !== "red"}
          />
        }
      />

      {/* Status header card */}
      <Card className="bg-white/90">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant="status" value={shipment.status} />
              <StatusBadge variant="severity" value={shipment.discrepancy_level} />
              <span className="text-sm text-[color:var(--muted)]">
                Match confidence: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {shipment.match_confidence?.toFixed(0) ?? "\u2014"}%
                </strong>
              </span>
            </div>
            <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-2">
                <Hash size={14} className="mt-0.5 text-[color:var(--muted)]" />
                <div>
                  <p className="text-xs text-[color:var(--muted)]">BOL Number</p>
                  <p className="font-medium">{shipment.bol_number ?? "\u2014"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Hash size={14} className="mt-0.5 text-[color:var(--muted)]" />
                <div>
                  <p className="text-xs text-[color:var(--muted)]">PRO Number</p>
                  <p className="font-medium">{shipment.pro_number ?? "\u2014"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Truck size={14} className="mt-0.5 text-[color:var(--muted)]" />
                <div>
                  <p className="text-xs text-[color:var(--muted)]">Carrier</p>
                  <p className="font-medium">
                    {shipment.carrier_name ?? "Unknown"}{" "}
                    {shipment.carrier_scac ? <span className="text-[color:var(--muted)]">({shipment.carrier_scac})</span> : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 text-[color:var(--muted)]" />
                <div>
                  <p className="text-xs text-[color:var(--muted)]">Lane</p>
                  <p className="font-medium">
                    {shipment.origin ?? "?"} &rarr; {shipment.destination ?? "?"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-[color:var(--muted)]">Invoice Total</p>
            <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatCurrency(invoiceTotal)}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
        {/* Left Column: Documents + Discrepancies */}
        <div className="space-y-6">
          {/* Documents Panel */}
          <Card className="bg-white/90">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Attached Documents
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {shipment.documents.length} Document{shipment.documents.length !== 1 ? "s" : ""}
                </h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {shipment.documents.length === 0 ? (
                <div className="col-span-full flex flex-col items-center py-10">
                  <FileText size={28} className="text-[color:var(--muted)]/40" />
                  <p className="mt-2 text-sm text-[color:var(--muted)]">No documents attached yet</p>
                </div>
              ) : (
                shipment.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent)]/10">
                          <FileText size={16} className="text-[color:var(--accent)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{doc.original_filename ?? doc.id.slice(0, 12)}</p>
                          <p className="text-xs text-[color:var(--muted)]">{doc.mime_type}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge variant="status" value={doc.status} />
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                          {doc.role}
                        </span>
                      </div>
                    </div>
                    {doc.doc_type && (
                      <p className="mt-2 text-xs text-[color:var(--muted)]">
                        Type: <span className="font-medium capitalize">{doc.doc_type.replace(/_/g, " ")}</span>
                        {doc.doc_type_confidence != null && (
                          <span> \u00b7 {(doc.doc_type_confidence * 100).toFixed(0)}% confidence</span>
                        )}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Discrepancy Table */}
          <Card className="bg-white/90">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Reconciliation
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {shipment.discrepancies.length} Discrepanc{shipment.discrepancies.length !== 1 ? "ies" : "y"}
              </h2>
            </div>
            {shipment.discrepancies.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-10">
                <CheckCircle2 size={28} className="text-[color:var(--success)]/40" />
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  No discrepancies detected. Upload paired documents to trigger reconciliation.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)]">
                      <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        Field
                      </th>
                      <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        Source Value
                      </th>
                      <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        Compare Value
                      </th>
                      <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        Variance
                      </th>
                      <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        Severity
                      </th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        Resolution
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipment.discrepancies.map((disc) => (
                      <tr key={disc.id} className="border-b border-[color:var(--border)] last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium capitalize">{disc.field_name.replace(/_/g, " ")}</p>
                        </td>
                        <td className="py-3 pr-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {disc.source_value ?? "\u2014"}
                        </td>
                        <td className="py-3 pr-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {disc.compare_value ?? "\u2014"}
                        </td>
                        <td className="py-3 pr-4">
                          <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {disc.variance_amount != null && (
                              <span className="block">{formatCurrency(disc.variance_amount)}</span>
                            )}
                            {disc.variance_pct != null && (
                              <span className="text-xs text-[color:var(--muted)]">{formatPercentage(disc.variance_pct)}</span>
                            )}
                            {disc.variance_amount == null && disc.variance_pct == null && "\u2014"}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge variant="severity" value={disc.severity} />
                        </td>
                        <td className="py-3">
                          <StatusBadge variant="resolution" value={disc.resolution} />
                          {disc.notes && (
                            <p className="mt-1 max-w-[200px] truncate text-xs text-[color:var(--muted)]">{disc.notes}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Audit Timeline */}
        <div className="space-y-6">
          <Card className="bg-[#17202a] text-white">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">
              Shipment Info
            </p>
            <h3 className="mt-1 text-lg font-semibold">Lane Details</h3>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-white/50">Origin</p>
                <p className="font-medium">{shipment.origin ?? "Unknown"}</p>
              </div>
              <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <ArrowRightLeft size={12} className="text-white/60" />
              </div>
              <div>
                <p className="text-white/50">Destination</p>
                <p className="font-medium">{shipment.destination ?? "Unknown"}</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/50">Shipper</p>
                <p className="font-medium">{shipment.shipper_name ?? "Unknown"}</p>
              </div>
              <div>
                <p className="text-white/50">Consignee</p>
                <p className="font-medium">{shipment.consignee_name ?? "Unknown"}</p>
              </div>
              <div>
                <p className="text-white/50">Created</p>
                <p className="font-medium">{formatDate(shipment.created_at)}</p>
              </div>
            </div>
          </Card>

          {/* Audit Trail / Timeline */}
          <Card className="bg-white/90">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Timeline
            </p>
            <h3 className="mt-1 text-lg font-semibold">Audit Trail</h3>
            {auditLogs.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-8">
                <Clock size={24} className="text-[color:var(--muted)]/40" />
                <p className="mt-2 text-sm text-[color:var(--muted)]">No audit events yet</p>
              </div>
            ) : (
              <div className="relative mt-4">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[color:var(--border)]" />
                <div className="space-y-4">
                  {auditLogs.map((log) => {
                    const isApproval = log.action.includes("approved");
                    const isDispute = log.action.includes("disputed");
                    return (
                      <div key={log.id} className="relative flex gap-3 pl-0">
                        <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--surface)] ring-2 ring-[color:var(--border)]">
                          {isApproval ? (
                            <CheckCircle2 size={12} className="text-[color:var(--success)]" />
                          ) : isDispute ? (
                            <AlertTriangle size={12} className="text-[color:var(--danger)]" />
                          ) : (
                            <Clock size={12} className="text-[color:var(--muted)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                          <p className="text-sm font-medium capitalize">
                            {log.action.replace(/_/g, " ")}
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                            {formatDate(log.created_at)}
                          </p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-1 rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs text-[color:var(--muted)]">
                              {Object.entries(log.details).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  <span className="font-medium capitalize">{key}:</span>{" "}
                                  {typeof value === "string" ? value : JSON.stringify(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

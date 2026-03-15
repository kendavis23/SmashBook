/**
 * PricingRulesTable
 *
 * Displays and manages all pricing rules for a club.
 * Supports:
 *   - Listing existing rules (label, day, time window, base price, surge/low-demand, incentive)
 *   - Adding new rules via an inline form
 *   - Editing an existing rule
 *   - Deleting a rule
 *   - Saving all changes via PUT /api/v1/clubs/{clubId}/pricing-rules
 *
 * API:
 *   GET  /api/v1/clubs/{clubId}/pricing-rules
 *   PUT  /api/v1/clubs/{clubId}/pricing-rules
 */

import React, { useEffect, useState } from "react";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface PricingRule {
  label: string;
  day_of_week: number;
  start_time: string;       // "HH:MM"
  end_time: string;         // "HH:MM"
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  price_per_slot: string;   // decimal string
  surge_trigger_pct?: string | null;
  surge_max_pct?: string | null;
  low_demand_trigger_pct?: string | null;
  low_demand_min_pct?: string | null;
  incentive_price?: string | null;
  incentive_label?: string | null;
  incentive_expires_at?: string | null;
}

const EMPTY_RULE: PricingRule = {
  label: "",
  day_of_week: 0,
  start_time: "08:00",
  end_time: "22:00",
  valid_from: null,
  valid_until: null,
  is_active: true,
  price_per_slot: "",
  surge_trigger_pct: null,
  surge_max_pct: null,
  low_demand_trigger_pct: null,
  low_demand_min_pct: null,
  incentive_price: null,
  incentive_label: null,
  incentive_expires_at: null,
};

interface Props {
  clubId: string;
  currency?: string;
}

type FormState = PricingRule & { _editIndex?: number };

export function PricingRulesTable({ clubId, currency = "GBP" }: Props) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_RULE });

  // ---- fetch ---------------------------------------------------------------

  useEffect(() => {
    fetch(`/api/v1/clubs/${clubId}/pricing-rules`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load pricing rules (${r.status})`);
        return r.json();
      })
      .then((data: PricingRule[]) => {
        setRules(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [clubId]);

  // ---- save ----------------------------------------------------------------

  async function saveRules(updated: PricingRule[]) {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/v1/clubs/${clubId}/pricing-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `Save failed (${res.status})`);
      }
      const saved: PricingRule[] = await res.json();
      setRules(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // ---- form helpers --------------------------------------------------------

  function openAddForm() {
    setForm({ ...EMPTY_RULE });
    setShowForm(true);
  }

  function openEditForm(index: number) {
    setForm({ ...rules[index], _editIndex: index });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm({ ...EMPTY_RULE });
  }

  function handleFormChange(field: keyof PricingRule, value: string | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value === "" ? null : value }));
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { _editIndex, ...rule } = form;
    const updated =
      _editIndex !== undefined
        ? rules.map((r, i) => (i === _editIndex ? rule : r))
        : [...rules, rule];
    setRules(updated);
    closeForm();
  }

  function handleDelete(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  // ---- render --------------------------------------------------------------

  if (loading) return <p>Loading pricing rules…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Pricing Rules</h3>
        <button onClick={openAddForm} disabled={showForm}>+ Add Rule</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Saved successfully.</p>}

      {rules.length === 0 && !showForm && (
        <p style={{ color: "#666" }}>No pricing rules configured. Add one to get started.</p>
      )}

      {rules.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Day</th>
              <th style={thStyle}>Window</th>
              <th style={thStyle}>Base ({currency})</th>
              <th style={thStyle}>Surge</th>
              <th style={thStyle}>Low-Demand</th>
              <th style={thStyle}>Incentive</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, i) => (
              <tr key={i} style={{ opacity: rule.is_active ? 1 : 0.45 }}>
                <td style={tdStyle}>{rule.label}</td>
                <td style={tdStyle}>{DAY_NAMES[rule.day_of_week]}</td>
                <td style={tdStyle}>{rule.start_time}–{rule.end_time}</td>
                <td style={tdStyle}>{rule.price_per_slot}</td>
                <td style={tdStyle}>
                  {rule.surge_trigger_pct
                    ? `≥${rule.surge_trigger_pct}% → +${rule.surge_max_pct}%`
                    : "—"}
                </td>
                <td style={tdStyle}>
                  {rule.low_demand_trigger_pct
                    ? `≤${rule.low_demand_trigger_pct}% → -${rule.low_demand_min_pct}%`
                    : "—"}
                </td>
                <td style={tdStyle}>
                  {rule.incentive_price
                    ? `${rule.incentive_price}${rule.incentive_label ? ` (${rule.incentive_label})` : ""}`
                    : "—"}
                </td>
                <td style={tdStyle}>{rule.is_active ? "Yes" : "No"}</td>
                <td style={tdStyle}>
                  <button onClick={() => openEditForm(i)} style={{ marginRight: 4 }}>Edit</button>
                  <button onClick={() => handleDelete(i)} style={{ color: "red" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <form onSubmit={handleFormSubmit} style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 6 }}>
          <h4 style={{ margin: "0 0 12px" }}>{form._editIndex !== undefined ? "Edit Rule" : "New Rule"}</h4>

          <div style={rowStyle}>
            <label style={labelStyle}>Label *</label>
            <input
              required
              value={form.label}
              onChange={(e) => handleFormChange("label", e.target.value)}
              placeholder="e.g. Peak, Off-Peak, Happy Hour"
              style={inputStyle}
            />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Day *</label>
            <select
              value={form.day_of_week}
              onChange={(e) => handleFormChange("day_of_week", e.target.value)}
              style={inputStyle}
            >
              {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Start Time *</label>
            <input
              required
              type="time"
              value={form.start_time}
              onChange={(e) => handleFormChange("start_time", e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>End Time *</label>
            <input
              required
              type="time"
              value={form.end_time}
              onChange={(e) => handleFormChange("end_time", e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Base Price ({currency}) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.price_per_slot}
              onChange={(e) => handleFormChange("price_per_slot", e.target.value)}
              style={inputStyle}
            />
          </div>

          <fieldset style={{ margin: "12px 0", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 4 }}>
            <legend style={{ fontSize: 12, color: "#555" }}>Surge Pricing (optional — set both or neither)</legend>
            <div style={rowStyle}>
              <label style={labelStyle}>Trigger utilisation %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.surge_trigger_pct ?? ""}
                onChange={(e) => handleFormChange("surge_trigger_pct", e.target.value)}
                placeholder="e.g. 80"
                style={inputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Max surge %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.surge_max_pct ?? ""}
                onChange={(e) => handleFormChange("surge_max_pct", e.target.value)}
                placeholder="e.g. 25"
                style={inputStyle}
              />
            </div>
          </fieldset>

          <fieldset style={{ margin: "12px 0", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 4 }}>
            <legend style={{ fontSize: 12, color: "#555" }}>Low-Demand Pricing (optional — set both or neither)</legend>
            <div style={rowStyle}>
              <label style={labelStyle}>Trigger utilisation %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.low_demand_trigger_pct ?? ""}
                onChange={(e) => handleFormChange("low_demand_trigger_pct", e.target.value)}
                placeholder="e.g. 20"
                style={inputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Min discount %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.low_demand_min_pct ?? ""}
                onChange={(e) => handleFormChange("low_demand_min_pct", e.target.value)}
                placeholder="e.g. 10"
                style={inputStyle}
              />
            </div>
          </fieldset>

          <fieldset style={{ margin: "12px 0", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 4 }}>
            <legend style={{ fontSize: 12, color: "#555" }}>Incentive / Promotional Price (optional)</legend>
            <div style={rowStyle}>
              <label style={labelStyle}>Fixed price ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.incentive_price ?? ""}
                onChange={(e) => handleFormChange("incentive_price", e.target.value)}
                placeholder="e.g. 12.50"
                style={inputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Label</label>
              <input
                value={form.incentive_label ?? ""}
                onChange={(e) => handleFormChange("incentive_label", e.target.value)}
                placeholder="e.g. Happy Hour"
                style={inputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Expires at</label>
              <input
                type="datetime-local"
                value={form.incentive_expires_at ?? ""}
                onChange={(e) => handleFormChange("incentive_expires_at", e.target.value)}
                style={inputStyle}
              />
            </div>
          </fieldset>

          <div style={rowStyle}>
            <label style={labelStyle}>Seasonal validity</label>
            <input
              type="date"
              value={form.valid_from ?? ""}
              onChange={(e) => handleFormChange("valid_from", e.target.value)}
              placeholder="From"
              style={{ ...inputStyle, width: 140 }}
            />
            <span style={{ margin: "0 6px", lineHeight: "32px" }}>to</span>
            <input
              type="date"
              value={form.valid_until ?? ""}
              onChange={(e) => handleFormChange("valid_until", e.target.value)}
              placeholder="Until"
              style={{ ...inputStyle, width: 140 }}
            />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Active</label>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleFormChange("is_active", e.target.checked)}
            />
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button type="submit">{form._editIndex !== undefined ? "Update Rule" : "Add Rule"}</button>
            <button type="button" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      {rules.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => saveRules(rules)} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- style constants -------------------------------------------------------

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid #ddd",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderBottom: "1px solid #eee",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  width: 200,
  fontWeight: 500,
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "5px 8px",
  fontSize: 13,
  border: "1px solid #ccc",
  borderRadius: 4,
};

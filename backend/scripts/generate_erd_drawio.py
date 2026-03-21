#!/usr/bin/env python3
"""
Generate docs/SmashBook_ERD.drawio from SQLAlchemy model metadata.

Usage:
    python scripts/generate_erd_drawio.py [output_path]

No database connection required — reads SQLAlchemy model metadata directly.
"""
import html
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.models import Base  # noqa: E402 — imports all models

# ── Layout ────────────────────────────────────────────────────────────────────

TABLE_W = 340
ROW_H = 26
HEADER_H = 30
MARKER_W = 46
VALUE_W = TABLE_W - MARKER_W

# Explicit (x, y) positions for each table — edit to rearrange
POSITIONS: dict[str, tuple[int, int]] = {
    # SaaS layer
    "subscription_plans":       (20,   20),
    "tenants":                  (420,  20),
    # Users & wallets
    "users":                    (820,  20),
    "wallets":                  (1280, 20),
    "wallet_transactions":      (1680, 20),
    # Clubs
    "clubs":                    (20,   600),
    "operating_hours":          (420,  600),
    "pricing_rules":            (820,  600),
    # Courts
    "courts":                   (1280, 600),
    "court_blackouts":          (1680, 600),
    # Staff
    "staff_profiles":           (20,   1200),
    "trainer_availability":     (420,  1200),
    # Bookings
    "bookings":                 (820,  1200),
    "booking_players":          (1280, 1200),
    # Payments
    "payments":                 (20,   1900),
    # Equipment
    "equipment_inventory":      (420,  1900),
    "equipment_rentals":        (820,  1900),
    # Membership
    "membership_plans":         (1280, 1900),
    "membership_subscriptions": (1680, 1900),
    "membership_credit_logs":   (2100, 1900),
    # Skills
    "skill_level_history":      (1680, 1200),
}

# Fill colour per table
COLOURS: dict[str, str] = {
    "subscription_plans":       "#FFCCE6",
    "tenants":                  "#FFCCE6",
    "users":                    "#FFFFCC",
    "wallets":                  "#FFFFCC",
    "wallet_transactions":      "#FFFFCC",
    "clubs":                    "#DAE8FC",
    "operating_hours":          "#DAE8FC",
    "pricing_rules":            "#DAE8FC",
    "courts":                   "#D5E8D4",
    "court_blackouts":          "#D5E8D4",
    "staff_profiles":           "#FFE6CC",
    "trainer_availability":     "#FFE6CC",
    "bookings":                 "#E1D5E7",
    "booking_players":          "#E1D5E7",
    "payments":                 "#D5E8D4",
    "equipment_inventory":      "#FFF2CC",
    "equipment_rentals":        "#FFF2CC",
    "membership_plans":         "#F8CECC",
    "membership_subscriptions": "#F8CECC",
    "membership_credit_logs":   "#F8CECC",
    "skill_level_history":      "#DAE8FC",
}

DEFAULT_COLOUR = "#f5f5f5"
EDGE_STYLE = (
    "edgeStyle=orthogonalEdgeStyle;"
    "endArrow=ERzeroToMany;startArrow=ERmandOne;fontSize=10;"
)


# ── Generator ─────────────────────────────────────────────────────────────────

def _escape(s: str) -> str:
    return html.escape(str(s))


def generate(metadata, output_path: str) -> None:
    tables = sorted(metadata.tables.values(), key=lambda t: t.name)

    # Assign x/y — known tables use POSITIONS, the rest fall into an overflow grid
    positions: dict[str, tuple[int, int]] = {}
    overflow_x, overflow_y = 2500, 20
    for t in tables:
        if t.name in POSITIONS:
            positions[t.name] = POSITIONS[t.name]
        else:
            positions[t.name] = (overflow_x, overflow_y)
            overflow_y += 400

    cells: list[str] = []
    cell_id = 2

    # Map (table_name, col_name) → row cell id for drawing FK edges
    col_cell_ids: dict[tuple[str, str], int] = {}

    for table in tables:
        x, y = positions[table.name]
        fill = COLOURS.get(table.name, DEFAULT_COLOUR)

        pk_cols = {c.name for c in table.primary_key.columns}
        fk_col_names = {fk.parent.name for fk in table.foreign_keys}

        # PKs first, then FKs, then the rest — all in original relative order
        ordered_cols = (
            [c for c in table.columns if c.name in pk_cols] +
            [c for c in table.columns if c.name not in pk_cols and c.name in fk_col_names] +
            [c for c in table.columns if c.name not in pk_cols and c.name not in fk_col_names]
        )

        n_rows = len(ordered_cols)
        table_h = HEADER_H + n_rows * ROW_H

        table_cid = cell_id
        cell_id += 1

        cells.append(
            f'<mxCell id="{table_cid}" value="{_escape(table.name)}" '
            f'style="shape=table;startSize={HEADER_H};container=1;collapsible=1;'
            f'childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;'
            f'resizeLast=1;fontSize=13;fillColor={fill};strokeColor=#6c8ebf;" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{TABLE_W}" height="{table_h}" as="geometry" />'
            f"</mxCell>"
        )

        row_y = HEADER_H
        for col in ordered_cols:
            is_pk = col.name in pk_cols
            is_fk = col.name in fk_col_names

            marker = "PK" if is_pk else ("FK" if is_fk else "")
            col_type = str(col.type).split("(")[0].lower()
            nullable_marker = "" if not col.nullable else " ?"

            row_cid = cell_id
            col_cell_ids[(table.name, col.name)] = row_cid
            left_cid = cell_id + 1
            right_cid = cell_id + 2
            cell_id += 3

            pk_style = "fontStyle=4;" if is_pk else ""  # underline PKs

            cells.append(
                f'<mxCell id="{row_cid}" value="" '
                f'style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;'
                f'swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;'
                f'points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=11;'
                f'top=0;left=0;right=0;bottom=1;" vertex="1" parent="{table_cid}">'
                f'<mxGeometry y="{row_y}" width="{TABLE_W}" height="{ROW_H}" as="geometry" />'
                f"</mxCell>"
            )
            cells.append(
                f'<mxCell id="{left_cid}" value="{_escape(marker)}" '
                f'style="shape=partialRectangle;connectable=0;fillColor=none;'
                f'top=0;left=0;bottom=0;right=0;fontStyle=1;overflow=hidden;'
                f'fontSize=10;align=center;" vertex="1" parent="{row_cid}">'
                f'<mxGeometry width="{MARKER_W}" height="{ROW_H}" as="geometry">'
                f'<mxRectangle width="{MARKER_W}" height="{ROW_H}" as="alternateBounds" />'
                f"</mxGeometry></mxCell>"
            )
            cells.append(
                f'<mxCell id="{right_cid}" value="{_escape(col.name)} : {_escape(col_type)}{_escape(nullable_marker)}" '
                f'style="shape=partialRectangle;connectable=0;fillColor=none;'
                f'top=0;left=0;bottom=0;right=0;overflow=hidden;fontSize=11;{pk_style}" '
                f'vertex="1" parent="{row_cid}">'
                f'<mxGeometry x="{MARKER_W}" width="{VALUE_W}" height="{ROW_H}" as="geometry">'
                f'<mxRectangle width="{VALUE_W}" height="{ROW_H}" as="alternateBounds" />'
                f"</mxGeometry></mxCell>"
            )
            row_y += ROW_H

    # FK edges — source is the FK column row cell, target is the referenced PK row cell
    edge_id = cell_id
    for table in tables:
        for fk in table.foreign_keys:
            src = col_cell_ids.get((table.name, fk.parent.name))
            tgt = col_cell_ids.get((fk.column.table.name, fk.column.name))
            if src and tgt:
                cells.append(
                    f'<mxCell id="{edge_id}" value="" style="{EDGE_STYLE}" '
                    f'edge="1" parent="1" source="{src}" target="{tgt}">'
                    f'<mxGeometry relative="1" as="geometry" />'
                    f"</mxCell>"
                )
                edge_id += 1

    body = "\n        ".join(cells)
    xml = f"""<mxfile host="Electron" version="21.0.0">
  <diagram name="SmashBook ERD" id="smashbook-erd">
    <mxGraphModel dx="2881" dy="2693" grid="0" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="0"
                  pageScale="1" pageWidth="2080" pageHeight="2626" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        {body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(xml)

    print(f"ERD generated → {output_path}")
    print(f"  {len(tables)} tables, {edge_id - cell_id + len(tables)} FK edges")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "docs/SmashBook_ERD.drawio"
    generate(Base.metadata, out)

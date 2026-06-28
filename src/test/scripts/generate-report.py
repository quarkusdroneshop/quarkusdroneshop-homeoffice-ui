#!/usr/bin/env python3
"""
Generates test-results/test-report/index.html from:
  jest-results.json       … Jest ユニットテスト結果
  coverage-summary.json   … Jest カバレッジ (json-summary)
  eslint-report.json      … ESLint 静的解析
  semgrep-report.json     … Semgrep SAST
  gitleaks-report.json    … Gitleaks シークレットスキャン
  trivy-report.json       … Trivy SCA (JSON)
  wapiti-report.json      … Wapiti DAST

Usage:
  python3 src/test/scripts/generate-report.py [results-dir] [project-name]
"""
import json
import os
import shutil
import sys
from datetime import datetime

RESULTS_DIR  = sys.argv[1] if len(sys.argv) > 1 else "test-results"
PROJECT_NAME = sys.argv[2] if len(sys.argv) > 2 else "quarkusdroneshop-homeoffice-ui"

JEST_JSON      = os.path.join(RESULTS_DIR, "jest-results.json")
COV_JSON       = os.path.join("coverage", "coverage-summary.json")
ESLINT_JSON    = os.path.join(RESULTS_DIR, "eslint-report.json")
SEMGREP_JSON   = os.path.join(RESULTS_DIR, "semgrep-report.json")
GITLEAKS_JSON  = os.path.join(RESULTS_DIR, "gitleaks-report.json")
TRIVY_JSON     = os.path.join(RESULTS_DIR, "trivy-report.json")
WAPITI_JSON    = os.path.join(RESULTS_DIR, "wapiti-report.json")
OUT_DIR        = os.path.join(RESULTS_DIR, "test-report")
OUT_FILE       = os.path.join(OUT_DIR, "index.html")

now     = datetime.now()
now_str = now.strftime("%Y-%m-%d %H:%M:%S")

if os.path.exists(OUT_DIR):
    shutil.rmtree(OUT_DIR)
os.makedirs(OUT_DIR)


# ── Helpers ───────────────────────────────────────────────────────────────────
def fmt_time(ms):
    if ms is None:
        return "-"
    s = ms / 1000.0
    return f"{s:.2f}s" if s >= 1 else f"{int(ms)}ms"


def pct_str(covered, total):
    return f"{100 * covered / total:.1f}" if total else "0.0"


def badge(status):
    icons = {
        "pass": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                ' stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        "fail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                ' stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/>'
                '<line x1="6" y1="6" x2="18" y2="18"/></svg>',
        "skip": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                ' stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        "warn": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                ' stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 001.71'
                ' 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'
                '<line x1="12" y1="9" x2="12" y2="13"/>'
                '<line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        "info": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                ' stroke-width="3"><circle cx="12" cy="12" r="10"/>'
                '<line x1="12" y1="16" x2="12" y2="12"/>'
                '<line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    }
    labels = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP",
              "warn": "WARN", "info": "INFO"}
    return (f'<span class="badge {status}">'
            f'{icons[status]} {labels[status]}</span>')


# ── Parse Jest JSON ────────────────────────────────────────────────────────────
jest_suites  = []
jest_total   = jest_pass = jest_fail = jest_skip = 0
jest_elapsed = 0.0

if os.path.exists(JEST_JSON):
    with open(JEST_JSON, encoding="utf-8") as f:
        data = json.load(f)

    jest_total   = data.get("numTotalTests", 0)
    jest_pass    = data.get("numPassedTests", 0)
    jest_fail    = data.get("numFailedTests", 0)
    jest_skip    = data.get("numPendingTests", 0) + data.get("numTodoTests", 0)
    jest_elapsed = data.get("testResults", [])

    for suite_raw in data.get("testResults", []):
        fpath = suite_raw.get("testFilePath", "")
        # src/app/... → use relative path for display
        rel = fpath
        for marker in ("/src/", "\\src\\"):
            if marker in rel:
                rel = "src/" + rel.split(marker, 1)[1]
                break
        # suite name = filename without extension
        base = os.path.basename(rel)
        name = base.replace(".test.tsx", "").replace(".test.ts", "").replace(".test.js", "")
        pkg  = os.path.dirname(rel)

        cases  = []
        s_pass = s_fail = s_skip = 0
        s_time = 0.0
        for tc in suite_raw.get("testResults", []):
            st = tc.get("status", "passed")
            if st == "passed":
                status = "pass"; s_pass += 1
            elif st in ("failed", "todo"):
                status = "fail"; s_fail += 1
            else:
                status = "skip"; s_skip += 1
            dur = tc.get("duration") or 0
            s_time += dur
            cases.append({
                "name":    tc.get("fullName") or " › ".join(
                               tc.get("ancestorTitles", []) + [tc.get("title", "")]),
                "status":  status,
                "time":    dur,
                "message": "\n".join(tc.get("failureMessages", [])),
            })

        jest_suites.append({
            "name":  name,
            "pkg":   pkg,
            "tests": len(cases),
            "pass":  s_pass,
            "fail":  s_fail,
            "skip":  s_skip,
            "time":  s_time,
            "cases": cases,
        })

    # total elapsed = sum of per-suite durations
    jest_elapsed = sum(s["time"] for s in jest_suites)

jest_pct   = round(100 * jest_pass / jest_total) if jest_total else 0
jest_color = "#27ae60" if jest_pct == 100 else ("#f39c12" if jest_pct >= 70 else "#e74c3c")


# ── Parse coverage-summary.json ────────────────────────────────────────────────
cov_total = {"statements": {"pct": 0.0, "covered": 0, "total": 0},
             "branches":   {"pct": 0.0, "covered": 0, "total": 0},
             "functions":  {"pct": 0.0, "covered": 0, "total": 0},
             "lines":      {"pct": 0.0, "covered": 0, "total": 0}}
cov_files = {}

if os.path.exists(COV_JSON):
    with open(COV_JSON, encoding="utf-8") as f:
        cov_data = json.load(f)

    if "total" in cov_data:
        for metric in ("statements", "branches", "functions", "lines"):
            d = cov_data["total"].get(metric, {})
            cov_total[metric] = {
                "pct":     d.get("pct", 0.0),
                "covered": d.get("covered", 0),
                "total":   d.get("total", 0),
            }

    for fpath, metrics in cov_data.items():
        if fpath == "total":
            continue
        for marker in ("/src/", "\\src\\"):
            if marker in fpath:
                rel = "src/" + fpath.split(marker, 1)[1]
                break
        else:
            rel = fpath
        cov_files[rel] = {m: metrics.get(m, {}) for m in
                          ("statements", "branches", "functions", "lines")}

stmt_pct   = f"{cov_total['statements']['pct']:.1f}"
branch_pct = f"{cov_total['branches']['pct']:.1f}"
func_pct   = f"{cov_total['functions']['pct']:.1f}"
line_pct   = f"{cov_total['lines']['pct']:.1f}"


# ── Parse ESLint JSON ─────────────────────────────────────────────────────────
eslint_files  = []
eslint_errors = eslint_warnings = 0

SEV_COLOR = {
    "CRITICAL": "var(--fail)", "HIGH": "#e74c3c",
    "MEDIUM": "#e67e22",       "LOW": "#f39c12",
    "INFO": "var(--accent)",   "WARNING": "#f39c12",
    "ERROR": "var(--fail)",
}

if os.path.exists(ESLINT_JSON):
    with open(ESLINT_JSON, encoding="utf-8") as f:
        eslint_data = json.load(f)

    for file_result in eslint_data:
        messages = file_result.get("messages", [])
        if not messages:
            continue
        fpath = file_result.get("filePath", "")
        for marker in ("/src/", "\\src\\"):
            if marker in fpath:
                rel = "src/" + fpath.split(marker, 1)[1]
                break
        else:
            rel = fpath

        items = []
        for msg in messages:
            sev = msg.get("severity", 1)
            sev_label = "ERROR" if sev == 2 else "WARN"
            if sev == 2:
                eslint_errors += 1
            else:
                eslint_warnings += 1
            items.append({
                "line":     msg.get("line", "-"),
                "col":      msg.get("column", "-"),
                "severity": sev_label,
                "rule":     msg.get("ruleId", ""),
                "message":  msg.get("message", ""),
            })
        eslint_files.append({"path": rel, "items": items})

eslint_total  = eslint_errors + eslint_warnings
eslint_status = "pass" if eslint_errors == 0 else "fail"


# ── Parse Semgrep JSON ────────────────────────────────────────────────────────
semgrep_items = []
if os.path.exists(SEMGREP_JSON):
    with open(SEMGREP_JSON, encoding="utf-8") as f:
        data = json.load(f)
    for r in data.get("results", []):
        ex   = r.get("extra", {})
        meta = ex.get("metadata", {})
        semgrep_items.append({
            "path":     r.get("path", ""),
            "line":     r.get("start", {}).get("line", "-"),
            "rule":     r.get("check_id", "").split(".")[-1],
            "rule_id":  r.get("check_id", ""),
            "severity": ex.get("severity", "INFO").upper(),
            "message":  ex.get("message", ""),
            "cwe":      ", ".join(meta.get("cwe", [])),
            "owasp":    ", ".join(meta.get("owasp", [])),
            "lines":    ex.get("lines", ""),
        })

semgrep_total    = len(semgrep_items)
semgrep_blocking = sum(1 for i in semgrep_items
                       if i["severity"] not in ("WARNING", "INFO"))
semgrep_status   = "pass" if semgrep_blocking == 0 else "fail"


# ── Parse Gitleaks JSON ───────────────────────────────────────────────────────
gitleaks_items = []
if os.path.exists(GITLEAKS_JSON):
    with open(GITLEAKS_JSON, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        for r in data:
            gitleaks_items.append({
                "rule":   r.get("RuleID", r.get("Description", "")),
                "file":   r.get("File", ""),
                "line":   str(r.get("StartLine", "-")),
                "match":  r.get("Match", ""),
                "secret": r.get("Secret", ""),
                "commit": r.get("Commit", "")[:8] if r.get("Commit") else "-",
                "author": r.get("Author", ""),
            })

gitleaks_total  = len(gitleaks_items)
gitleaks_status = "pass" if gitleaks_total == 0 else "fail"


# ── Parse Trivy JSON ──────────────────────────────────────────────────────────
trivy_sections  = []
trivy_total     = 0

if os.path.exists(TRIVY_JSON):
    with open(TRIVY_JSON, encoding="utf-8") as f:
        data = json.load(f)
    for result in data.get("Results", []):
        vulns = result.get("Vulnerabilities") or []
        if not vulns:
            continue
        items = []
        for v in vulns:
            items.append({
                "id":        v.get("VulnerabilityID", ""),
                "pkg":       v.get("PkgName", ""),
                "installed": v.get("InstalledVersion", ""),
                "fixed":     v.get("FixedVersion", ""),
                "severity":  v.get("Severity", "UNKNOWN").upper(),
                "title":     v.get("Title", v.get("Description", ""))[:120],
            })
        trivy_sections.append({
            "target": result.get("Target", ""),
            "type":   result.get("Type", ""),
            "items":  items,
        })
        trivy_total += len(items)

trivy_critical_high = sum(
    1 for sec in trivy_sections
    for item in sec["items"]
    if item["severity"] in ("CRITICAL", "HIGH")
)
trivy_status = "pass" if trivy_critical_high == 0 else "fail"


# ── Parse Wapiti JSON ─────────────────────────────────────────────────────────
wapiti_items = []
wapiti_info  = {}

WAPITI_LEVEL_LABEL = {"0": "情報", "1": "低", "2": "中", "3": "高"}
WAPITI_LEVEL_COLOR = {
    "0": "var(--accent)", "1": "#f39c12",
    "2": "#e67e22",       "3": "var(--fail)",
}

if os.path.exists(WAPITI_JSON):
    with open(WAPITI_JSON, encoding="utf-8") as f:
        data = json.load(f)
    wapiti_info = data.get("infos", {})
    classify    = data.get("classifications", {})
    for cat, vulns in {**data.get("vulnerabilities", {}),
                       **data.get("anomalies", {})}.items():
        for v in vulns:
            cls = classify.get(cat, {})
            wapiti_items.append({
                "category":  cat,
                "path":      v.get("path", ""),
                "method":    v.get("method", "GET"),
                "parameter": v.get("parameter", ""),
                "info":      v.get("info", ""),
                "level":     str(v.get("level", 0)),
                "solution":  cls.get("sol", ""),
            })

wapiti_total  = len(wapiti_items)
wapiti_status = "pass" if wapiti_total == 0 else "fail"


# ── Release Gate ──────────────────────────────────────────────────────────────
_line_cov_pct = float(line_pct)

GATES = [
    {
        "key":   "jest",
        "label": "Jest ユニットテスト",
        "desc":  f"失敗 {jest_fail} 件 / 全 {jest_total} 件",
        "ok":    jest_fail == 0,
        "cond":  "失敗 0 件",
    },
    {
        "key":   "coverage_line",
        "label": "カバレッジ (行)",
        "desc":  f"現在 {line_pct}%",
        "ok":    _line_cov_pct >= 80.0,
        "cond":  "80% 以上",
    },
    {
        "key":   "coverage_branch",
        "label": "カバレッジ (分岐)",
        "desc":  f"現在 {branch_pct}%",
        "ok":    float(branch_pct) >= 70.0,
        "cond":  "70% 以上",
    },
    {
        "key":   "eslint",
        "label": "ESLint",
        "desc":  f"ERROR {eslint_errors} 件 / WARN {eslint_warnings} 件",
        "ok":    eslint_errors == 0,
        "cond":  "ERROR 0 件",
    },
    {
        "key":   "semgrep",
        "label": "Semgrep (SAST)",
        "desc":  f"ERROR以上 {semgrep_blocking} 件 (全 {semgrep_total} 件)",
        "ok":    semgrep_blocking == 0,
        "cond":  "ERROR以上 0 件",
    },
    {
        "key":   "gitleaks",
        "label": "Gitleaks",
        "desc":  f"漏洩 {gitleaks_total} 件",
        "ok":    gitleaks_total == 0,
        "cond":  "シークレット漏洩なし",
    },
    {
        "key":   "trivy",
        "label": "Trivy (SCA)",
        "desc":  f"CRITICAL/HIGH {trivy_critical_high} 件 (全 {trivy_total} 件)",
        "ok":    trivy_critical_high == 0,
        "cond":  "CRITICAL/HIGH 0 件",
    },
    {
        "key":   "wapiti",
        "label": "Wapiti (DAST)",
        "desc":  f"脆弱性 {wapiti_total} 件",
        "ok":    wapiti_total == 0,
        "cond":  "脆弱性なし",
    },
]

RELEASE_OK   = all(g["ok"] for g in GATES)
GATES_PASSED = sum(1 for g in GATES if g["ok"])
GATES_TOTAL  = len(GATES)


# ── HTML builders ─────────────────────────────────────────────────────────────
def donut_svg(pct_val, color):
    circ     = 314.16
    arc      = circ * pct_val / 100
    fail_arc = circ - arc
    fail_seg = (
        f'<circle cx="70" cy="70" r="50" fill="none" stroke="var(--fail)"'
        f' stroke-width="24" stroke-dasharray="{fail_arc:.2f} {circ:.2f}"'
        f' stroke-dashoffset="{-arc:.2f}" transform="rotate(-90 70 70)"/>'
        if pct_val < 100 else ""
    )
    return f"""<svg width="120" height="120" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="50" fill="none" stroke="#eef0f3" stroke-width="24"/>
      <circle cx="70" cy="70" r="50" fill="none" stroke="{color}"
        stroke-width="24" stroke-dasharray="{arc:.2f} {circ:.2f}"
        stroke-dashoffset="0" transform="rotate(-90 70 70)"/>
      {fail_seg}
      <text x="70" y="65" text-anchor="middle" font-size="22"
        font-weight="700" fill="{color}">{pct_val}%</text>
      <text x="70" y="83" text-anchor="middle" font-size="11"
        fill="#7f8c8d">成功率</text>
    </svg>"""


def release_gate_html():
    if RELEASE_OK:
        verdict_color  = "var(--pass)"
        verdict_bg     = "#eafaf1"
        verdict_border = "#a9dfbf"
        verdict_icon   = """<svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>"""
        verdict_text = "リリース可能"
        verdict_sub  = f"全 {GATES_TOTAL} 件の条件をすべてクリアしています"
    else:
        verdict_color  = "var(--fail)"
        verdict_bg     = "#fdedec"
        verdict_border = "#f5b7b1"
        verdict_icon   = """<svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>"""
        ng_count     = GATES_TOTAL - GATES_PASSED
        verdict_text = "リリース不可"
        verdict_sub  = (f"{GATES_TOTAL} 件中 {ng_count} 件の条件が未達"
                        f"（{GATES_PASSED} 件クリア済み）")

    bar_pct   = round(100 * GATES_PASSED / GATES_TOTAL)
    bar_color = verdict_color

    rows = ""
    for g in GATES:
        icon_ok = """<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--pass)" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/></svg>"""
        icon_ng = """<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--fail)" stroke-width="3">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/></svg>"""
        icon     = icon_ok if g["ok"] else icon_ng
        row_bg   = "" if g["ok"] else "background:#fff8f8;"
        desc_col = "color:var(--pass)" if g["ok"] else "color:var(--fail);font-weight:600"
        rows += f"""<tr style="{row_bg}">
          <td style="width:28px;padding:10px 4px 10px 14px">{icon}</td>
          <td style="font-weight:600;font-size:13px;padding:10px 10px">{g['label']}</td>
          <td style="font-size:12px;color:var(--text-light);padding:10px 10px">{g['cond']}</td>
          <td style="font-size:12px;{desc_col};padding:10px 14px 10px 10px">{g['desc']}</td>
        </tr>"""

    return f"""<div style="background:{verdict_bg};border:2px solid {verdict_border};
      border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div style="color:{verdict_color};flex-shrink:0">{verdict_icon}</div>
        <div>
          <div style="font-size:22px;font-weight:800;color:{verdict_color};
            letter-spacing:-.3px">{verdict_text}</div>
          <div style="font-size:13px;color:var(--text-light);margin-top:2px">{verdict_sub}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:32px;font-weight:800;color:{bar_color}">{bar_pct}%</div>
          <div style="font-size:11px;color:var(--text-light)">{GATES_PASSED} / {GATES_TOTAL} 条件クリア</div>
        </div>
      </div>
      <div style="height:6px;background:rgba(0,0,0,.08);border-radius:3px;
        margin-bottom:20px;overflow:hidden">
        <div style="height:100%;width:{bar_pct}%;background:{bar_color};
          border-radius:3px;transition:width .4s"></div>
      </div>
      <table style="width:100%;border-collapse:collapse;
        background:rgba(255,255,255,.7);border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:rgba(0,0,0,.04)">
            <th style="width:28px"></th>
            <th style="text-align:left;font-size:11px;font-weight:700;
              color:var(--text-light);padding:7px 10px;text-transform:uppercase;
              letter-spacing:.5px">チェック項目</th>
            <th style="text-align:left;font-size:11px;font-weight:700;
              color:var(--text-light);padding:7px 10px;text-transform:uppercase;
              letter-spacing:.5px">合格条件</th>
            <th style="text-align:left;font-size:11px;font-weight:700;
              color:var(--text-light);padding:7px 14px 7px 10px;
              text-transform:uppercase;letter-spacing:.5px">現在の状態</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>"""


def suite_table_rows(suites):
    rows = ""
    for s in suites:
        p = round(100 * s["pass"] / s["tests"]) if s["tests"] else 0
        rows += f"""<tr>
          <td><strong>{s['name']}</strong>
            <br><span style="font-size:11px;color:var(--text-light)">{s['pkg']}</span>
          </td>
          <td>{s['tests']}</td>
          <td style="color:var(--pass);font-weight:600">{s['pass']}</td>
          <td style="color:{'var(--fail)' if s['fail'] > 0 else 'var(--text-light)'}">
            {s['fail']}</td>
          <td>{fmt_time(s['time'])}</td>
          <td><div class="mini-bar">
            <div class="mini-fill" style="width:{p}%"></div></div></td>
        </tr>"""
    return rows


def suite_detail_html(suites):
    pkgs: dict = {}
    for s in suites:
        pkgs.setdefault(s["pkg"], []).append(s)
    html = ""
    for pkg, ss in pkgs.items():
        pkg_total = sum(x["tests"] for x in ss)
        pkg_pass  = sum(x["pass"]  for x in ss)
        html += f"""<div class="pkg-group">
          <div class="pkg-header" onclick="togglePkg(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2
                3h9a2 2 0 012 2z"/>
            </svg>
            {pkg}
            <span class="pkg-badge badge pass"
              style="margin-left:auto;">{pkg_pass}/{pkg_total}</span>
          </div>
          <div class="pkg-body">"""
        for s in ss:
            html += f"""<div style="border-bottom:1px solid var(--border);">
              <div style="padding:8px 28px;background:#fcfcfd;font-size:12px;
                font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;"
                onclick="toggleCases(this)">
                {badge('fail' if s['fail'] > 0 else 'pass')} {s['name']}
                <span style="color:var(--text-light);margin-left:auto;font-size:11px">
                  {s['tests']} tests &nbsp; {fmt_time(s['time'])}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div class="cases-body" style="display:none;">"""
            for c in s["cases"]:
                msg = ""
                if c["message"]:
                    first_line = c["message"].split("\n")[0][:200]
                    msg = (f'<div style="font-size:11px;color:var(--fail);'
                           f'padding:4px 0 0 26px;font-family:monospace">'
                           f'{first_line}</div>')
                html += f"""<div class="test-row"
                  style="padding-left:44px;flex-direction:column;align-items:flex-start;">
                  <div style="display:flex;align-items:center;gap:10px;width:100%">
                    {badge(c['status'])}
                    <span class="test-name">{c['name']}</span>
                    <span class="test-time" style="margin-left:auto">
                      {fmt_time(c['time'])}</span>
                  </div>{msg}
                </div>"""
            html += "</div></div>"
        html += "</div></div>"
    return html


def cov_color(p):
    return ("var(--pass)" if float(p) >= 70
            else ("#e67e22" if float(p) >= 40 else "var(--fail)"))


def coverage_file_rows():
    rows = ""
    for fpath, metrics in sorted(cov_files.items()):
        def metric_cell(m):
            d   = metrics.get(m, {})
            pct = d.get("pct", 0.0)
            cov = d.get("covered", 0)
            tot = d.get("total", 0)
            c   = cov_color(pct)
            return (f'<td>'
                    f'<div style="font-size:11px;color:var(--text-light);margin-bottom:3px">'
                    f'{cov}/{tot}</div>'
                    f'<div class="mini-bar" style="width:80px">'
                    f'<div class="mini-fill" style="width:{pct:.1f}%;background:{c}"></div></div>'
                    f'<div style="font-size:11px;font-weight:600;color:{c}">{pct:.1f}%</div>'
                    f'</td>')

        rows += (f'<tr>'
                 f'<td style="font-size:11px;font-family:monospace">{fpath}</td>'
                 + metric_cell("statements")
                 + metric_cell("branches")
                 + metric_cell("functions")
                 + metric_cell("lines")
                 + '</tr>')
    return rows


def eslint_html():
    if not eslint_files:
        return '<div style="padding:24px;color:var(--pass);font-weight:600;">✔ 問題なし</div>'
    html = ""
    for f in eslint_files:
        err_cnt  = sum(1 for i in f["items"] if i["severity"] == "ERROR")
        warn_cnt = len(f["items"]) - err_cnt
        lvl_cls  = "fail" if err_cnt > 0 else "warn"
        summary  = f"{err_cnt} ERR / {warn_cnt} WARN"
        html += f"""<div class="pkg-group">
          <div class="pkg-header" onclick="togglePkg(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {f['path']}
            <span class="pkg-badge badge {lvl_cls}"
              style="margin-left:auto;">{summary}</span>
          </div>
          <div class="pkg-body">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead><tr>
                <th style="width:60px">行</th>
                <th style="width:60px">列</th>
                <th style="width:80px">種別</th>
                <th style="width:200px">ルール</th>
                <th>メッセージ</th>
              </tr></thead><tbody>"""
        for item in f["items"]:
            sc = SEV_COLOR.get(item["severity"], "var(--text)")
            html += f"""<tr>
              <td style="color:var(--text-light)">{item['line']}</td>
              <td style="color:var(--text-light)">{item['col']}</td>
              <td><span style="color:{sc};font-weight:600">{item['severity']}</span></td>
              <td style="font-family:monospace;font-size:11px">{item['rule']}</td>
              <td>{item['message']}</td>
            </tr>"""
        html += "</tbody></table></div></div>"
    return html


def semgrep_html():
    if not semgrep_items:
        return '<div style="padding:24px;color:var(--pass);font-weight:600;">✔ 検出なし</div>'
    by_path: dict = {}
    for item in semgrep_items:
        by_path.setdefault(item["path"], []).append(item)
    html = ""
    for path, items in sorted(by_path.items()):
        html += f"""<div class="pkg-group">
          <div class="pkg-header" onclick="togglePkg(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>{path}
            <span class="pkg-badge badge fail" style="margin-left:auto">{len(items)} 件</span>
          </div>
          <div class="pkg-body">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr>
                <th style="width:60px">行</th>
                <th style="width:80px">深刻度</th>
                <th style="width:160px">ルール</th>
                <th>メッセージ</th>
                <th style="width:200px">CWE / OWASP</th>
              </tr></thead><tbody>"""
        for item in items:
            sc = SEV_COLOR.get(item["severity"], "var(--text)")
            code_block = (
                f'<div style="font-family:monospace;font-size:11px;'
                f'background:#f8f9fb;padding:4px 8px;margin-top:4px;'
                f'border-left:3px solid {sc}">{item["lines"]}</div>'
                if item["lines"] else ""
            )
            html += f"""<tr>
              <td style="color:var(--text-light)">{item['line']}</td>
              <td><span style="color:{sc};font-weight:600">{item['severity']}</span></td>
              <td style="font-family:monospace;font-size:11px">{item['rule']}</td>
              <td>{item['message']}{code_block}</td>
              <td style="font-size:11px;color:var(--text-light)">
                {item['cwe']}<br>{item['owasp']}</td>
            </tr>"""
        html += "</tbody></table></div></div>"
    return html


def gitleaks_html():
    if not gitleaks_items:
        return '<div style="padding:24px;color:var(--pass);font-weight:600;">✔ シークレット漏洩なし</div>'
    html = """<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>
        <th>ルール</th><th>ファイル</th><th>行</th>
        <th>コミット</th><th>作成者</th><th>マッチ</th>
      </tr></thead><tbody>"""
    for item in gitleaks_items:
        secret_display = item["secret"][:40] + "…" if len(item["secret"]) > 40 else item["secret"]
        html += f"""<tr>
          <td><span style="color:var(--fail);font-weight:600">{item['rule']}</span></td>
          <td style="font-family:monospace;font-size:11px">{item['file']}</td>
          <td>{item['line']}</td>
          <td style="font-family:monospace;font-size:11px">{item['commit']}</td>
          <td>{item['author']}</td>
          <td style="font-family:monospace;font-size:11px;color:var(--fail)">{secret_display}</td>
        </tr>"""
    html += "</tbody></table>"
    return html


def trivy_html():
    if not trivy_sections:
        return '<div style="padding:24px;color:var(--pass);font-weight:600;">✔ 脆弱性なし</div>'
    html = ""
    for sec in trivy_sections:
        html += f"""<div class="pkg-group">
          <div class="pkg-header" onclick="togglePkg(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>{sec['target']}
            <span style="font-size:11px;color:var(--text-light);margin-left:4px">
              ({sec['type']})</span>
            <span class="pkg-badge badge fail"
              style="margin-left:auto">{len(sec['items'])} 件</span>
          </div>
          <div class="pkg-body">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr>
                <th>CVE ID</th><th>パッケージ</th><th>インストール済み</th>
                <th>修正版</th><th>深刻度</th><th>タイトル</th>
              </tr></thead><tbody>"""
        for item in sec["items"]:
            sc = SEV_COLOR.get(item["severity"], "var(--text)")
            html += f"""<tr>
              <td style="font-family:monospace;font-size:11px">{item['id']}</td>
              <td style="font-weight:600">{item['pkg']}</td>
              <td style="font-family:monospace;font-size:11px">{item['installed']}</td>
              <td style="font-family:monospace;font-size:11px;color:var(--pass)">{item['fixed']}</td>
              <td><span style="color:{sc};font-weight:600">{item['severity']}</span></td>
              <td style="font-size:11px">{item['title']}</td>
            </tr>"""
        html += "</tbody></table></div></div>"
    return html


def wapiti_html():
    if not wapiti_items:
        return '<div style="padding:24px;color:var(--pass);font-weight:600;">✔ 脆弱性なし</div>'
    by_cat: dict = {}
    for item in wapiti_items:
        by_cat.setdefault(item["category"], []).append(item)
    html = ""
    for cat, items in sorted(by_cat.items()):
        html += f"""<div class="pkg-group">
          <div class="pkg-header" onclick="togglePkg(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3
                L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>{cat}
            <span class="pkg-badge badge fail"
              style="margin-left:auto">{len(items)} 件</span>
          </div>
          <div class="pkg-body">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr>
                <th>パス</th><th style="width:70px">メソッド</th>
                <th style="width:100px">パラメータ</th>
                <th style="width:60px">レベル</th><th>詳細</th>
              </tr></thead><tbody>"""
        for item in items:
            lc = WAPITI_LEVEL_COLOR.get(item["level"], "var(--text)")
            ll = WAPITI_LEVEL_LABEL.get(item["level"], item["level"])
            html += f"""<tr>
              <td style="font-family:monospace;font-size:11px">{item['path']}</td>
              <td>{item['method']}</td>
              <td style="font-family:monospace;font-size:11px">{item['parameter']}</td>
              <td><span style="color:{lc};font-weight:600">{ll}</span></td>
              <td>{item['info']}</td>
            </tr>"""
        html += "</tbody></table></div></div>"
    return html


# ── Assemble HTML ─────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{PROJECT_NAME} — テスト結果レポート</title>
<style>
  :root {{
    --pass:#27ae60; --fail:#e74c3c; --skip:#f39c12;
    --bg:#f4f6f9; --card:#ffffff; --border:#dde3ec;
    --text:#2c3e50; --text-light:#7f8c8d; --accent:#3498db;
    --sidebar-bg:#1e2a3a;
  }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    background:var(--bg);color:var(--text);display:flex;min-height:100vh}}
  .sidebar{{width:230px;background:var(--sidebar-bg);color:#ecf0f1;
    flex-shrink:0;display:flex;flex-direction:column}}
  .sidebar-logo{{padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,.1)}}
  .sidebar-logo .project{{font-size:12px;font-weight:700;color:var(--accent);
    letter-spacing:.5px;text-transform:uppercase}}
  .sidebar-logo .module{{font-size:15px;font-weight:600;color:#fff;margin-top:2px}}
  .sidebar-logo .date{{font-size:11px;color:#95a5a6;margin-top:4px}}
  nav{{padding:12px 0;flex:1}}
  .nav-section{{font-size:10px;font-weight:700;color:#636e72;
    padding:12px 16px 4px;text-transform:uppercase;letter-spacing:.8px}}
  .nav-item{{display:flex;align-items:center;gap:10px;padding:9px 16px;
    cursor:pointer;font-size:13px;color:#bdc3c7;transition:background .15s}}
  .nav-item:hover,.nav-item.active{{background:rgba(255,255,255,.08);color:#fff}}
  .nav-item.active{{border-left:3px solid var(--accent)}}
  .nav-item svg{{width:15px;height:15px;flex-shrink:0}}
  .nav-badge{{margin-left:auto;font-size:10px;font-weight:700;
    padding:1px 6px;border-radius:10px;background:rgba(255,255,255,.12)}}
  .nav-badge.ok{{color:#27ae60}} .nav-badge.ng{{color:#e74c3c}}
  .sidebar-footer{{padding:12px 16px;border-top:1px solid rgba(255,255,255,.1);
    font-size:11px;color:#7f8c8d}}
  .main{{flex:1;overflow:auto}}
  .page{{display:none}} .page.active{{display:block}}
  .page-header{{background:var(--card);border-bottom:1px solid var(--border);
    padding:20px 28px}}
  .page-header h1{{font-size:20px;font-weight:600}}
  .page-header p{{font-size:13px;color:var(--text-light);margin-top:4px}}
  .content{{padding:24px 28px}}
  .summary-strip{{display:grid;grid-template-columns:repeat(5,1fr);
    gap:14px;margin-bottom:24px}}
  .strip-card{{background:var(--card);border:1px solid var(--border);
    border-radius:10px;padding:16px;display:flex;flex-direction:column;
    align-items:center;gap:4px}}
  .strip-card .val{{font-size:28px;font-weight:700}}
  .strip-card .lbl{{font-size:12px;color:var(--text-light);font-weight:500}}
  .strip-card.pass .val{{color:var(--pass)}}
  .strip-card.fail .val{{color:var(--fail)}}
  .strip-card.skip .val{{color:var(--skip)}}
  .strip-card.total .val{{color:var(--accent)}}
  .strip-card.time .val{{color:#8e44ad}}
  .two-col{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}}
  .chart-card{{background:var(--card);border:1px solid var(--border);
    border-radius:10px;padding:20px}}
  .chart-card h3{{font-size:14px;font-weight:600;margin-bottom:14px}}
  .donut-wrap{{display:flex;align-items:center;gap:20px}}
  .donut-legend{{display:flex;flex-direction:column;gap:8px}}
  .legend-item{{display:flex;align-items:center;gap:8px;font-size:13px}}
  .legend-dot{{width:10px;height:10px;border-radius:50%;flex-shrink:0}}
  .cov-bars{{display:flex;flex-direction:column;gap:14px}}
  .cov-item label{{font-size:12px;font-weight:600;color:var(--text-light);
    display:flex;justify-content:space-between;margin-bottom:6px}}
  .bar-track{{background:#eef0f3;border-radius:4px;height:10px;overflow:hidden}}
  .bar-fill{{height:100%;border-radius:4px}}
  .card{{background:var(--card);border:1px solid var(--border);
    border-radius:10px;overflow:hidden;margin-bottom:20px}}
  .card-head{{padding:14px 18px;border-bottom:1px solid var(--border);
    display:flex;align-items:center;justify-content:space-between}}
  .card-head h3{{font-size:14px;font-weight:600}}
  table{{width:100%;border-collapse:collapse;font-size:13px}}
  th{{background:#f8f9fb;padding:10px 14px;text-align:left;font-size:11px;
    font-weight:600;color:var(--text-light);text-transform:uppercase;
    letter-spacing:.5px;border-bottom:1px solid var(--border)}}
  td{{padding:10px 14px;border-bottom:1px solid #f0f2f5;vertical-align:middle}}
  tr:last-child td{{border-bottom:none}} tr:hover td{{background:#f8f9fb}}
  .badge{{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;
    border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.3px}}
  .badge svg{{width:10px;height:10px}}
  .badge.pass{{background:#eafaf1;color:var(--pass)}}
  .badge.fail{{background:#fdedec;color:var(--fail)}}
  .badge.skip{{background:#fef9e7;color:var(--skip)}}
  .badge.warn{{background:#fef9e7;color:#e67e22}}
  .badge.info{{background:#ebf5fb;color:var(--accent)}}
  .mini-bar{{width:80px;height:6px;background:#eef0f3;border-radius:3px;overflow:hidden}}
  .mini-fill{{height:100%;background:var(--pass);border-radius:3px}}
  .test-row{{display:flex;align-items:center;gap:10px;padding:9px 14px;
    border-bottom:1px solid #f0f2f5;font-size:13px}}
  .test-row:last-child{{border-bottom:none}} .test-row:hover{{background:#f8f9fb}}
  .test-name{{flex:1;font-family:'SF Mono','Consolas',monospace;font-size:12px}}
  .test-class{{color:var(--text-light);font-size:11px}}
  .test-time{{font-size:11px;color:var(--text-light);min-width:50px;text-align:right}}
  .pkg-group{{margin-bottom:0}}
  .pkg-header{{padding:9px 14px;background:#f8f9fb;font-size:12px;font-weight:600;
    color:var(--text-light);border-bottom:1px solid var(--border);
    display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none}}
  .pkg-header:hover{{background:#eef0f3}}
  .pkg-body{{display:block}}
</style>
</head>
<body>
<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="project">Quarkus Droneshop</div>
    <div class="module">{PROJECT_NAME}</div>
    <div class="date">{now_str}</div>
  </div>
  <nav>
    <div class="nav-section">概要</div>
    <div class="nav-item active" onclick="showPage('overview',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>ダッシュボード
    </div>

    <div class="nav-section">テスト</div>
    <div class="nav-item" onclick="showPage('jest',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>Jest ユニットテスト
      <span class="nav-badge {'ok' if jest_fail==0 else 'ng'}">{jest_pass}/{jest_total}</span>
    </div>

    <div class="nav-section">品質</div>
    <div class="nav-item" onclick="showPage('coverage',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>カバレッジ
    </div>
    <div class="nav-item" onclick="showPage('eslint',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>ESLint
      <span class="nav-badge {'ok' if eslint_errors==0 else 'ng'}">{eslint_total}</span>
    </div>

    <div class="nav-section">セキュリティ</div>
    <div class="nav-item" onclick="showPage('semgrep',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>Semgrep (SAST)
      <span class="nav-badge {'ok' if semgrep_total==0 else 'ng'}">{semgrep_total}</span>
    </div>
    <div class="nav-item" onclick="showPage('gitleaks',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>Gitleaks
      <span class="nav-badge {'ok' if gitleaks_total==0 else 'ng'}">{gitleaks_total}</span>
    </div>
    <div class="nav-item" onclick="showPage('trivy',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>Trivy (SCA)
      <span class="nav-badge {'ok' if trivy_total==0 else 'ng'}">{trivy_total}</span>
    </div>
    <div class="nav-item" onclick="showPage('wapiti',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3
          L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>Wapiti (DAST)
      <span class="nav-badge {'ok' if wapiti_total==0 else 'ng'}">{wapiti_total}</span>
    </div>
  </nav>
  <div class="sidebar-footer">Jest · ESLint · Semgrep · Trivy · Wapiti</div>
</aside>

<main class="main">

  <!-- ── Overview ── -->
  <div id="page-overview" class="page active">
    <div class="page-header">
      <h1>ダッシュボード</h1>
      <p>Jest テスト結果 &nbsp;·&nbsp; {now_str}</p>
    </div>
    <div class="content">
      {release_gate_html()}
      <div class="summary-strip">
        <div class="strip-card total"><div class="val">{jest_total}</div>
          <div class="lbl">総テスト数</div></div>
        <div class="strip-card pass"><div class="val">{jest_pass}</div>
          <div class="lbl">成功</div></div>
        <div class="strip-card fail"><div class="val">{jest_fail}</div>
          <div class="lbl">失敗</div></div>
        <div class="strip-card skip"><div class="val">{jest_skip}</div>
          <div class="lbl">スキップ</div></div>
        <div class="strip-card time"><div class="val">{fmt_time(jest_elapsed)}</div>
          <div class="lbl">実行時間</div></div>
      </div>

      <div class="two-col">
        <div class="chart-card">
          <h3>Jest ユニットテスト</h3>
          <div class="donut-wrap">
            {donut_svg(jest_pct, jest_color)}
            <div class="donut-legend">
              <div class="legend-item">
                <div class="legend-dot" style="background:var(--pass)"></div>
                成功: {jest_pass}</div>
              <div class="legend-item">
                <div class="legend-dot" style="background:var(--fail)"></div>
                失敗: {jest_fail}</div>
              <div class="legend-item">
                <div class="legend-dot" style="background:var(--skip)"></div>
                スキップ: {jest_skip}</div>
              <div class="legend-item"
                style="font-size:11px;color:var(--text-light)">
                スイート: {len(jest_suites)}</div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <h3>コードカバレッジ</h3>
          <div class="cov-bars">
            <div class="cov-item">
              <label><span>ステートメント</span>
                <span>{cov_total['statements']['covered']}/{cov_total['statements']['total']}</span></label>
              <div class="bar-track">
                <div class="bar-fill"
                  style="width:{stmt_pct}%;background:var(--accent)"></div></div>
              <div style="font-size:12px;color:var(--accent);margin-top:4px;
                font-weight:600">{stmt_pct}%</div>
            </div>
            <div class="cov-item">
              <label><span>行</span>
                <span>{cov_total['lines']['covered']}/{cov_total['lines']['total']}</span></label>
              <div class="bar-track">
                <div class="bar-fill"
                  style="width:{line_pct}%;background:var(--pass)"></div></div>
              <div style="font-size:12px;color:var(--pass);margin-top:4px;
                font-weight:600">{line_pct}%</div>
            </div>
            <div class="cov-item">
              <label><span>分岐</span>
                <span>{cov_total['branches']['covered']}/{cov_total['branches']['total']}</span></label>
              <div class="bar-track">
                <div class="bar-fill"
                  style="width:{branch_pct}%;background:#e67e22"></div></div>
              <div style="font-size:12px;color:#e67e22;margin-top:4px;
                font-weight:600">{branch_pct}%</div>
            </div>
            <div class="cov-item">
              <label><span>関数</span>
                <span>{cov_total['functions']['covered']}/{cov_total['functions']['total']}</span></label>
              <div class="bar-track">
                <div class="bar-fill"
                  style="width:{func_pct}%;background:#8e44ad"></div></div>
              <div style="font-size:12px;color:#8e44ad;margin-top:4px;
                font-weight:600">{func_pct}%</div>
            </div>
          </div>
        </div>
      </div>

      <div class="two-col">
        <div class="chart-card">
          <h3>静的解析サマリ</h3>
          <table style="font-size:13px">
            <tbody>
              <tr><td style="padding:10px 8px;font-weight:600">ESLint</td>
                <td>{badge(eslint_status)}</td>
                <td style="color:var(--text-light)">{eslint_errors} ERROR / {eslint_warnings} WARN</td></tr>
              <tr><td style="padding:10px 8px;font-weight:600">Semgrep</td>
                <td>{badge(semgrep_status)}</td>
                <td style="color:var(--text-light)">{semgrep_total} 件の検出</td></tr>
              <tr><td style="padding:10px 8px;font-weight:600">Gitleaks</td>
                <td>{badge(gitleaks_status)}</td>
                <td style="color:var(--text-light)">{gitleaks_total} 件のシークレット</td></tr>
              <tr><td style="padding:10px 8px;font-weight:600">Trivy</td>
                <td>{badge(trivy_status)}</td>
                <td style="color:var(--text-light)">{trivy_total} 件の脆弱性</td></tr>
              <tr><td style="padding:10px 8px;font-weight:600">Wapiti</td>
                <td>{badge(wapiti_status)}</td>
                <td style="color:var(--text-light)">{wapiti_total} 件の脆弱性</td></tr>
            </tbody>
          </table>
        </div>
        <div class="chart-card">
          <h3>テストスイート別パスレート</h3>
          <div style="overflow-y:auto;max-height:200px">
            <table style="font-size:12px">
              <thead><tr>
                <th>スイート</th><th>合計</th><th>成功</th><th>失敗</th>
              </tr></thead>
              <tbody>{"".join(
                  f'<tr><td style="font-family:monospace">{s["name"]}</td>'
                  f'<td>{s["tests"]}</td>'
                  f'<td style="color:var(--pass);font-weight:600">{s["pass"]}</td>'
                  f'<td style="color:{"var(--fail)" if s["fail"] > 0 else "var(--text-light)"}">{ s["fail"]}</td></tr>'
                  for s in jest_suites
              )}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Jest ── -->
  <div id="page-jest" class="page">
    <div class="page-header">
      <h1>Jest ユニットテスト</h1>
      <p>{jest_total} テスト &nbsp;·&nbsp; 成功 {jest_pass} &nbsp;·&nbsp;
        失敗 {jest_fail} &nbsp;·&nbsp; スキップ {jest_skip}</p>
    </div>
    <div class="content">
      <div class="card">
        <div class="card-head"><h3>スイート別サマリ</h3></div>
        <table>
          <thead><tr>
            <th>テストファイル</th><th>テスト数</th>
            <th>成功</th><th>失敗</th><th>実行時間</th><th>進捗</th>
          </tr></thead>
          <tbody>{suite_table_rows(jest_suites)}</tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-head"><h3>テスト詳細</h3></div>
        {suite_detail_html(jest_suites)}
      </div>
    </div>
  </div>

  <!-- ── Coverage ── -->
  <div id="page-coverage" class="page">
    <div class="page-header">
      <h1>カバレッジ詳細</h1>
      <p>ステートメント {stmt_pct}% &nbsp;·&nbsp; 行 {line_pct}% &nbsp;·&nbsp;
        分岐 {branch_pct}% &nbsp;·&nbsp; 関数 {func_pct}%</p>
    </div>
    <div class="content">
      <div class="card">
        <table>
          <thead><tr>
            <th>ファイル</th>
            <th>ステートメント</th><th>分岐</th><th>関数</th><th>行</th>
          </tr></thead>
          <tbody>{coverage_file_rows()}</tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ── ESLint ── -->
  <div id="page-eslint" class="page">
    <div class="page-header">
      <h1>ESLint 静的解析</h1>
      <p>ERROR {eslint_errors} 件 &nbsp;·&nbsp; WARNING {eslint_warnings} 件</p>
    </div>
    <div class="content">
      <div class="card">{eslint_html()}</div>
    </div>
  </div>

  <!-- ── Semgrep ── -->
  <div id="page-semgrep" class="page">
    <div class="page-header">
      <h1>Semgrep — SAST 静的解析</h1>
      <p>{semgrep_total} 件の検出</p>
    </div>
    <div class="content">
      <div class="card">{semgrep_html()}</div>
    </div>
  </div>

  <!-- ── Gitleaks ── -->
  <div id="page-gitleaks" class="page">
    <div class="page-header">
      <h1>Gitleaks — シークレット漏洩スキャン</h1>
      <p>{gitleaks_total} 件の検出</p>
    </div>
    <div class="content">
      <div class="card">{gitleaks_html()}</div>
    </div>
  </div>

  <!-- ── Trivy ── -->
  <div id="page-trivy" class="page">
    <div class="page-header">
      <h1>Trivy — 依存関係スキャン (SCA)</h1>
      <p>{trivy_total} 件の検出</p>
    </div>
    <div class="content">
      <div class="card">{trivy_html()}</div>
    </div>
  </div>

  <!-- ── Wapiti ── -->
  <div id="page-wapiti" class="page">
    <div class="page-header">
      <h1>Wapiti — DAST 動的スキャン</h1>
      <p>{wapiti_total} 件の検出</p>
    </div>
    <div class="content">
      <div class="card">{wapiti_html()}</div>
    </div>
  </div>

</main>

<script>
function showPage(id, el) {{
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  el.classList.add('active');
}}
function togglePkg(el) {{
  const b = el.nextElementSibling;
  b.style.display = b.style.display === 'none' ? '' : 'none';
}}
function toggleCases(el) {{
  const b = el.nextElementSibling;
  b.style.display = b.style.display === 'none' ? '' : 'none';
}}
</script>
</body>
</html>"""

with open(OUT_FILE, "w", encoding="utf-8") as f:
    f.write(html)

release_label = "✔ リリース可能" if RELEASE_OK else f"✖ リリース不可 ({GATES_PASSED}/{GATES_TOTAL})"
print(
    f"[test-report] Generated: {OUT_FILE}\n"
    f"  Tests   — jest:{jest_total}({jest_pass}✔/{jest_fail}✗/{jest_skip}skip)\n"
    f"  Coverage— stmt:{stmt_pct}%  line:{line_pct}%  branch:{branch_pct}%  func:{func_pct}%\n"
    f"  Lint    — eslint error:{eslint_errors} warn:{eslint_warnings}\n"
    f"  Security— semgrep:{semgrep_total}  gitleaks:{gitleaks_total}"
    f"  trivy:{trivy_total}  wapiti:{wapiti_total}\n"
    f"  Release — {release_label}"
)

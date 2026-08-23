const svgNamespace = "http://www.w3.org/2000/svg";
let selectedCall = null;
let userSelectedCall = false;
let lastRevision = -1;
let lastFocusStep = null;

function byId(id) {
  return document.getElementById(id);
}

function replaceChildren(node, children) {
  node.replaceChildren(...children);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderStages(stages) {
  const items = stages.map((stage) => {
    const item = element("li", `stage-item ${stage.status}`);
    const dot = element("span", "stage-dot");
    dot.setAttribute("aria-hidden", "true");
    const copy = element("div", "stage-copy");
    copy.append(element("strong", "", stage.label), element("small", "", stage.detail));
    item.append(dot, copy);
    return item;
  });
  replaceChildren(byId("stageRail"), items);
}

function renderStatus(state) {
  byId("runStatus").textContent = state.status;
  const lamp = byId("statusLamp");
  lamp.className = `status-lamp ${state.status}`;
}

function renderFocus(state) {
  const focus = state.focus;
  byId("focusStep").textContent = String(focus.stepNumber).padStart(2, "0");
  byId("focusTool").textContent = focus.tool;
  byId("focusHeadline").textContent = focus.headline;
  byId("focusDetail").textContent = focus.detail;
  byId("dataModeLabel").textContent = state.displayMode.toUpperCase();
  byId("focusProgress").style.width = `${focus.progressPercent}%`;
  byId("focusPanel").dataset.status = focus.status;

  document.querySelectorAll(".panel.focus-target").forEach((panel) => panel.classList.remove("focus-target"));
  const target = document.querySelector(`.${focus.target}`);
  if (target) target.classList.add("focus-target");
  document.querySelector(".main-grid").classList.toggle("tracking", state.status === "running");

  if (focus.status === "active" && focus.stepId !== lastFocusStep && target) {
    lastFocusStep = focus.stepId;
    window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
  }
}

function renderPr(pr) {
  if (!pr) return;
  byId("prTitle").textContent = pr.title;
  const sha = (pr.headSha || "").slice(0, 12);
  byId("prMeta").textContent = `${pr.repository} · PR #${pr.number} · head ${sha} · checks ${pr.checks?.state || "unknown"}`;
  byId("prDiff").textContent = pr.diff || "No diff returned.";
  const files = (pr.changedFiles || []).map((file) => {
    const pill = element("span", "file-pill");
    pill.append(document.createTextNode(`${file.path} `));
    pill.append(element("b", "", `+${file.additions}`));
    return pill;
  });
  replaceChildren(byId("changedFiles"), files);
}

function svgNode(tag, attributes) {
  const node = document.createElementNS(svgNamespace, tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function renderMetricChart(metrics) {
  const chart = byId("metricChart");
  chart.replaceChildren();
  const items = metrics?.items || [];
  if (!items.length) return;
  const values = items.map((item) => Number(item.attributes.value));
  const width = 640;
  const height = 150;
  const min = Math.min(...values) - 150;
  const max = Math.max(...values) + 150;
  [25, 75, 125].forEach((y) => chart.append(svgNode("line", {
    x1: 0, x2: width, y1: y, y2: y, stroke: "#d9e3e6", "stroke-width": 1,
  })));
  const points = values.map((value, index) => {
    const x = items.length === 1 ? width / 2 : (index / (items.length - 1)) * width;
    const y = height - 20 - ((value - min) / (max - min)) * (height - 40);
    return `${x},${y}`;
  }).join(" ");
  chart.append(svgNode("polyline", {
    points, fill: "none", stroke: "#ad493f", "stroke-width": 3, "stroke-linejoin": "round",
  }));
  points.split(" ").forEach((point) => {
    const [cx, cy] = point.split(",");
    chart.append(svgNode("circle", { cx, cy, r: 4, fill: "#fbfdfd", stroke: "#ad493f", "stroke-width": 2 }));
  });
}

function incidentLabel(item) {
  const labels = {
    reservation_committed: "Reservation committed",
    response_timeout: "Provider response timed out after commit",
    retry_started: "Retry started with a new attempt key",
    payment_intent_created: "Payment intent created",
  };
  return labels[item.name] || item.name;
}

function incidentDetail(item) {
  const attrs = item.attributes || {};
  return [attrs.attemptKey, attrs.reservationId, attrs.paymentIntentId].filter(Boolean).join(" · ");
}

function renderSequence(state) {
  const summary = state.summary;
  byId("reservationCount").textContent = String(summary.reservationCount ?? 0);
  byId("paymentCount").textContent = String(summary.paymentIntentCount ?? 0);
  byId("p99Value").textContent = summary.bookingP99Ms ?? "—";
  byId("completionCount").textContent = summary.candidateCompletions == null
    ? "—"
    : `${summary.candidateCompletions}/${summary.referenceCompletions}`;
  const items = (state.paymentSequence || []).map((entry, index) => {
    const tone = entry.name === "response_timeout" ? "timeout" : entry.name === "payment_intent_created" ? "payment" : "";
    const item = element("li", `incident-item ${tone}`);
    item.style.animationDelay = `${index * 80}ms`;
    item.append(element("span", "incident-time", `+${(entry.availableAfterMs / 1000).toFixed(0)}s`));
    item.append(element("span", "incident-mark"));
    const copy = element("div", "incident-copy");
    copy.append(element("strong", "", incidentLabel(entry)), element("small", "", incidentDetail(entry)));
    item.append(copy);
    return item;
  });
  if (items.length) replaceChildren(byId("paymentSequence"), items);
}

function renderEvidence(state) {
  const streams = ["metrics", "logs", "traces", "events"];
  const receipts = streams.map((stream, index) => {
    const value = state.evidence[stream];
    const card = element("div", `evidence-receipt ${value ? "received" : ""}`);
    card.style.animationDelay = `${index * 70}ms`;
    card.append(element("span", "", `agent.get_${stream}`));
    card.append(element("strong", "", String(value?.itemCount ?? "—")));
    card.append(element("small", "", value ? `received · ${value.stream.state}` : "waiting for MCP"));
    return card;
  });
  replaceChildren(byId("evidenceGrid"), receipts);
  const correlated = state.evidence.events?.items?.[0] || state.evidence.logs?.items?.[0] || state.evidence.metrics?.items?.[0];
  byId("artifactSource").textContent = correlated
    ? `${correlated.operationId} · ${correlated.traceId} · ${correlated.route} · release ${correlated.releaseSha.slice(0, 12)}`
    : "operation op-204 · awaiting evidence";
  renderMetricChart(state.evidence.metrics);
}

function renderRepair(repair) {
  if (!repair) return;
  byId("repairTask").textContent = repair.taskId;
  byId("repairBranch").textContent = repair.handoff.branchConvention;
  byId("repairMarker").textContent = repair.handoff.requiredPrBodyMarker;
  const state = byId("repairState");
  state.textContent = repair.state.replaceAll("_", " ");
  state.className = "mode-badge ready";
}

function selectCall(calls, sequence, userInitiated = false) {
  if (userInitiated) userSelectedCall = true;
  selectedCall = sequence;
  const selected = calls.find((call) => call.sequence === sequence);
  byId("rawJson").textContent = selected ? JSON.stringify(selected, null, 2) : "No MCP tool has returned yet.";
  document.querySelectorAll(".call-button").forEach((button) => {
    button.setAttribute("aria-selected", String(Number(button.dataset.sequence) === sequence));
  });
}

function renderCalls(calls) {
  byId("callCount").textContent = `${calls.length} ${calls.length === 1 ? "call" : "calls"}`;
  if (!userSelectedCall && calls.length) selectedCall = calls[calls.length - 1].sequence;
  const buttons = calls.map((call) => {
    const button = element("button", "call-button");
    button.type = "button";
    button.role = "tab";
    button.dataset.sequence = call.sequence;
    button.setAttribute("aria-selected", String(call.sequence === selectedCall));
    button.append(element("b", "", `${String(call.sequence).padStart(2, "0")} · ${call.tool}`));
    button.append(element("small", "", `${call.profile} profile`));
    button.addEventListener("click", () => selectCall(calls, call.sequence, true));
    return button;
  });
  replaceChildren(byId("callList"), buttons);
  selectCall(calls, selectedCall);
}

function render(state) {
  if (state.revision === lastRevision) return;
  lastRevision = state.revision;
  renderStatus(state);
  renderFocus(state);
  renderStages(state.stages);
  renderPr(state.pr);
  renderSequence(state);
  renderEvidence(state);
  renderRepair(state.repair);
  renderCalls(state.calls);
  if (state.error) byId("rawJson").textContent = JSON.stringify(state.error, null, 2);
}

async function poll() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error(`Dashboard state returned ${response.status}`);
    render(await response.json());
  } catch (error) {
    byId("runStatus").textContent = "disconnected";
    byId("statusLamp").className = "status-lamp failed";
  }
}

poll();
window.setInterval(poll, 300);

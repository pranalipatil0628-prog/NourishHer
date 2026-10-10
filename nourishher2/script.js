/* NourishHer: cycle tracker and menopause guide.
   Everything is saved in the browser (localStorage). No backend yet. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  var KEY = "nourishher:v2";
  var S = { periods: [], symptoms: [], custom: [], profile: {} };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function bindGo(root) {
    $$("[data-go]", root).forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.go); });
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        S.periods = o.periods || [];
        S.symptoms = o.symptoms || [];
        S.custom = o.custom || [];
        S.profile = o.profile || {};
      }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  /* ---------- dates ---------- */
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parse(s) { var a = s.split("-").map(Number); return new Date(a[0], a[1] - 1, a[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function diff(a, b) { return Math.round((a - b) / 864e5); }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function fmt(d) { return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
  function fmtShort(d) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  function fmtLong(d) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  function inDays(n) {
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n > 1) return "in " + n + " days";
    return Math.abs(n) + " day" + (Math.abs(n) === 1 ? "" : "s") + " ago";
  }

  /* ---------- comforting words ---------- */
  var QUOTES = [
    "Your body is not broken. It is changing, and that is okay. 🌸",
    "Every cycle, every change, every stage deserves care. 🌷",
    "You are not alone. So many women walk this path with you. 🌼",
    "Rest is not lazy. It is how you bloom. 🌿",
    "Be as gentle with yourself as you are with the people you love. 💗",
    "Small steps still count. You are doing better than you think. 🌺"
  ];
  var DAILY = [
    "Sip a glass of cool water and take five slow breaths. 💧",
    "A 15 minute walk in morning light is good for bones, mood and sleep. ☀️",
    "Add one protein food to your next meal, like dal, curd or sprouts. 🥣",
    "Message someone you trust and tell them how your week is going. 💌",
    "Stretch your neck and shoulders for two minutes. 🧘",
    "Switch off screens 30 minutes before bed tonight. 🌙",
    "Be as kind to yourself as you would be to a friend. 🌷"
  ];
  function dayIndex(len) { return Math.floor(today().getTime() / 864e5) % len; }
  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }

  /* ---------- stages ---------- */
  var STAGE_NAMES = {
    regular: "Regular periods",
    early: "Pre-menopause (early changes)",
    late: "Pre-menopause (late changes)",
    meno: "In menopause",
    post: "Post-menopause",
    unsure: "Not clear from periods",
    doctor: "Worth a doctor visit"
  };
  var STAGE_EMOJI = { regular: "🌷", early: "🌼", late: "🌼", meno: "🌺", post: "🍃", unsure: "💭", doctor: "🩺" };
  var STAGE_TIPS = {
    regular: "Your cycles look regular. Log them to notice changes early, especially after 40.",
    early: "Your cycles are starting to change. Steady sleep, strength training and a symptom log help most right now.",
    late: "Gaps between periods are long. You can still get pregnant until 12 months without a period, so talk to a doctor about contraception and relief for symptoms.",
    meno: "Your body is going through a big shift. A cool bedroom, strong bones, steady sleep and people you trust help most. Ask a doctor what could ease your symptoms.",
    post: "Focus on bone, heart and sleep health. Ask your doctor about a bone density test and regular check-ups. Report any bleeding.",
    unsure: "Your periods cannot show your stage right now. Track your symptoms and talk to a doctor if they affect your life.",
    doctor: "Please book a visit with a gynaecologist. Your NourishHer summary will help the doctor."
  };
  function stageKey() { return S.profile.stageKey || null; }
  function hasPeriods(key) { return key !== "meno" && key !== "post"; }

  /* ---------- cycle maths ---------- */
  // Average cycle and period length from the last 6 periods.
  function stats() {
    var ps = S.periods.slice().sort(function (a, b) { return a.start.localeCompare(b.start); });
    if (!ps.length) return null;
    var gaps = [], i;
    for (i = 1; i < ps.length; i++) gaps.push(diff(parse(ps[i].start), parse(ps[i - 1].start)));
    var recent = gaps.slice(-6).filter(function (g) { return g >= 15 && g <= 90; });
    var L = recent.length ? Math.round(recent.reduce(function (a, b) { return a + b; }, 0) / recent.length) : 28;
    var lens = ps.slice(-6).map(function (p) { return +p.days || 5; });
    var P = Math.round(lens.reduce(function (a, b) { return a + b; }, 0) / lens.length);
    var spread = recent.length > 1 ? Math.max.apply(null, recent) - Math.min.apply(null, recent) : 0;
    return {
      ps: ps, gaps: gaps, recent: recent, L: L, P: P,
      last: parse(ps[ps.length - 1].start),
      spread: spread,
      irregular: spread > 7 || gaps.slice(-6).some(function (g) { return g > 45; })
    };
  }

  // What kind of day is this? (period, expected period, ovulation, fertile, before period)
  function classify(d, st) {
    var o = {};
    if (!st) return o;
    st.ps.forEach(function (p) {
      var k = diff(d, parse(p.start));
      if (k >= 0 && k < (+p.days || 5)) o.logged = true;
    });
    for (var k = 0; k <= 5; k++) {
      var c = addDays(st.last, st.L * k), dd = diff(d, c);
      if (k >= 1 && dd >= 0 && dd < st.P) o.pred = true;
      var ov = diff(d, addDays(c, st.L - 14));
      if (ov === 0) o.ov = true;
      if (ov >= -5 && ov <= 1) o.fert = true;
      if (dd >= st.L - 5 && dd < st.L) o.pms = true;
    }
    return o;
  }

  function phaseInfo(st, cd) {
    var L = st.L, P = st.P, O = L - 14;
    var fs = Math.max(P + 1, O - 5), fe = Math.min(L, O + 1);
    var name, tip;
    if (cd > L) { name = "Period is late"; tip = "Cycles can run late with stress, travel or hormone changes. If you could be pregnant, take a test."; }
    else if (cd <= P) { name = "Period"; tip = "Rest, keep warm, and eat iron-rich food like dal, spinach or jaggery."; }
    else if (cd === O) { name = "Ovulation day (estimated)"; tip = "This is your most fertile day. Some people feel a light twinge on one side."; }
    else if (cd >= fs && cd <= fe) { name = "Fertile window"; tip = "Pregnancy is most likely now. Energy and mood are often high."; }
    else if (cd > L - 5) { name = "Before your period"; tip = "PMS can show up now. Sleep, gentle movement and less caffeine and salt can help."; }
    else if (cd < fs) { name = "Fresh start phase"; tip = "Energy usually rises. A good time for harder workouts and new tasks."; }
    else { name = "Slow-down phase"; tip = "Energy may dip. Choose steady meals and gentle movement."; }
    return { name: name, tip: tip };
  }

  /* ---------- screens ---------- */
  function show(tab) {
    $$("section.view").forEach(function (s) { s.classList.toggle("on", s.id === "view-" + tab); });
    $$("nav.tabs button").forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.body.classList.toggle("welcome", tab === "welcome");
    if (tab === "welcome") renderWelcome();
    if (tab === "today") renderToday();
    if (tab === "calendar") renderCal();
    if (tab === "symptoms") renderSym();
    if (tab === "stage") renderStage();
    if (tab === "care") renderCare();
    window.scrollTo(0, 0);
  }
  $$("nav.tabs button").forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.tab); });
  });

  /* ---------- WELCOME ---------- */
  var PICKS = [
    { k: "regular", e: "🌷", t: "I still have regular periods", d: "Track your cycle and know what is coming" },
    { k: "early", e: "🌼", t: "My periods are starting to change", d: "Pre-menopause, the years before menopause" },
    { k: "meno", e: "🌺", t: "I am in menopause", d: "My periods have stopped or are about to" },
    { k: "post", e: "🍃", t: "I am past menopause", d: "A year or more since my last period" },
    { k: "unsure", e: "💭", t: "I am not sure", d: "Answer a few easy questions and we will find out" }
  ];

  function renderWelcome() {
    var q = QUOTES[dayIndex(QUOTES.length)];
    var h = '<div class="card soft hero"><h2 class="welcome-q">' + q + '</h2>' +
      '<p class="sub">Let us start gently. There are no wrong answers.</p></div>' +
      '<h3 class="pick-h">Where are you on your journey?</h3><div class="opts">' +
      PICKS.map(function (p) {
        return '<button class="opt" data-k="' + p.k + '"><span class="em" aria-hidden="true">' + p.e + '</span><span><span class="ot">' + p.t + '</span><span class="od">' + p.d + "</span></span></button>";
      }).join("") + '</div><p class="center"><button class="link" id="skipWelcome">Not now</button></p>';
    var el = $("#view-welcome");
    el.innerHTML = h;
    $$(".opt", el).forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.k === "unsure") { startQuiz(); show("stage"); return; }
        S.profile.stageKey = b.dataset.k;
        S.profile.result = null;
        S.profile.skipped = false;
        save();
        show("today");
      });
    });
    $("#skipWelcome").addEventListener("click", function () {
      S.profile.skipped = true; save(); show("today");
    });
  }

  /* ---------- HOME ---------- */
  function arcPath(cx, cy, r, a0, a1) {
    function p(a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = p(a0), e = p(a1), large = (a1 - a0) > Math.PI ? 1 : 0;
    return "M" + s[0].toFixed(2) + " " + s[1].toFixed(2) + "A" + r + " " + r + " 0 " + large + " 1 " + e[0].toFixed(2) + " " + e[1].toFixed(2);
  }

  function ringSVG(st, cd) {
    var L = st.L, P = st.P, O = L - 14;
    var fs = Math.max(P + 1, O - 5), fe = Math.min(L, O + 1);
    var segs = [
      [1, P, "--rose"],
      [P + 1, fs - 1, "--peach"],
      [fs, fe, "--coral"],
      [fe + 1, L, "--mauve"]
    ].filter(function (s) { return s[0] <= s[1]; });
    var T = Math.PI * 2, base = -Math.PI / 2;
    var out = '<svg viewBox="0 0 200 200" role="img" aria-label="Your cycle ring">';
    segs.forEach(function (s) {
      var a0 = base + (s[0] - 1) / L * T + 0.03, a1 = base + s[1] / L * T - 0.03;
      out += '<path d="' + arcPath(100, 100, 82, a0, a1) + '" fill="none" stroke="var(' + s[2] + ')" stroke-width="14" stroke-linecap="round"/>';
    });
    var oa = base + (O - 0.5) / L * T;
    out += '<circle cx="' + (100 + 82 * Math.cos(oa)).toFixed(1) + '" cy="' + (100 + 82 * Math.sin(oa)).toFixed(1) + '" r="4.5" fill="var(--gold)" stroke="var(--surface)" stroke-width="2"/>';
    var day = Math.min(Math.max(cd, 1), L), ma = base + (day - 0.5) / L * T;
    out += '<circle cx="' + (100 + 82 * Math.cos(ma)).toFixed(1) + '" cy="' + (100 + 82 * Math.sin(ma)).toFixed(1) + '" r="9" fill="var(--surface)" stroke="var(--ink)" stroke-width="3.5"/>';
    return out + "</svg>";
  }
  function ringEmpty() {
    return '<svg viewBox="0 0 200 200" role="img" aria-label="Empty cycle ring"><circle cx="100" cy="100" r="82" fill="none" stroke="var(--line)" stroke-width="14"/></svg>';
  }

  function renderToday() {
    var el = $("#view-today"), st = stats(), t = today(), key = stageKey(), h = "";

    h += '<div class="card soft"><h2>' + greeting() + ' 🌸</h2><p class="sub" style="margin:0">' + QUOTES[dayIndex(QUOTES.length)] + "</p></div>";

    if (key) {
      h += '<div class="stage-chip"><span>' + STAGE_EMOJI[key] + " " + STAGE_NAMES[key] + '</span><button class="link" data-go="stage">Change</button></div>';
    }

    if (!hasPeriods(key)) {
      // menopause or post-menopause: no cycle ring, just gentle daily care
      h += '<div class="card"><h3>Today\'s gentle step 🌿</h3><p>' + DAILY[dayIndex(DAILY.length)] + "</p>" +
        '<div class="actions" style="margin-top:6px"><button class="btn" data-go="symptoms">Daily check-in</button><button class="btn ghost" data-go="care">Care tips</button></div></div>' +
        '<div class="note">If you notice any bleeding after your periods have stopped for a year, please tell a doctor.</div>';
    } else if (!st) {
      h += '<div class="card hero"><div class="ring">' + ringEmpty() +
        '<div class="mid"><div class="big">🌷</div><div class="lbl">Add your last period to begin</div></div></div>' +
        '<div class="actions" style="justify-content:center"><button class="btn" data-go="calendar">Log last period</button>' +
        '<button class="btn ghost" id="demo">Try sample data</button></div></div>';
    } else {
      var cd = diff(t, st.last) + 1, ph = phaseInfo(st, cd), next = addDays(st.last, st.L), dn = diff(next, t);
      var lbl = cd > st.L ? "Period expected " + inDays(dn) : "Next period " + inDays(dn);
      h += '<div class="card hero"><div class="ring">' + ringSVG(st, cd) +
        '<div class="mid"><div class="big">Day ' + cd + '</div><div class="lbl">' + lbl + '</div></div></div>' +
        '<span class="phase">' + ph.name + '</span><p class="sub">' + ph.tip + '</p>' +
        '<div class="legend"><span><i style="background:var(--rose)"></i>Period</span><span><i style="background:var(--peach)"></i>Fresh start</span>' +
        '<span><i style="background:var(--coral)"></i>Fertile</span><span><i style="background:var(--mauve)"></i>Slow down</span>' +
        '<span><i style="background:var(--gold)"></i>Ovulation</span></div></div>';
      if (st.irregular) h += '<div class="note">Your cycles vary a lot, so these dates are gentle estimates. Keep logging and they will improve.</div>';
      var ovDate = addDays(st.last, st.L - 14), k = 0;
      while (diff(ovDate, t) < -1 && k < 12) { ovDate = addDays(ovDate, st.L); k++; }
      h += '<div class="tiles"><div class="tile"><div class="k">Next period</div><div class="v">' + fmt(next) + '</div></div>' +
        '<div class="tile"><div class="k">Ovulation</div><div class="v">' + fmt(ovDate) + '</div></div>' +
        '<div class="tile wide"><div class="k">Fertile window</div><div class="v">' + fmtShort(addDays(ovDate, -5)) + ' to ' + fmtShort(addDays(ovDate, 1)) + '</div></div></div>';
      h += '<div class="actions" style="margin:0 0 16px"><button class="btn" data-go="calendar">Log period</button><button class="btn ghost" data-go="symptoms">Daily check-in</button></div>';
    }

    if (!key) {
      h += '<div class="card"><h3>Not sure where you are? 💭</h3><p class="sub">Answer a few easy questions and we will help you find out.</p><button class="btn ghost" data-go="stage">Find my stage</button></div>';
    }

    el.innerHTML = h;
    bindGo(el);
    var d = $("#demo");
    if (d) d.addEventListener("click", function () {
      var t0 = today(), offs = [13, 42, 70, 100, 129];
      S.periods = offs.map(function (o) { return { start: iso(addDays(t0, -o)), days: 5, flow: "Normal", pain: 2, note: "" }; });
      save(); renderToday();
    });
  }

  /* ---------- CALENDAR + PERIOD LOG ---------- */
  var cal = { y: today().getFullYear(), m: today().getMonth() };

  function renderCal() {
    var st = stats(), t = today(), first = new Date(cal.y, cal.m, 1), n = new Date(cal.y, cal.m + 1, 0).getDate();
    $("#monthTitle").textContent = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    var h = "", i, d;
    ["S", "M", "T", "W", "T", "F", "S"].forEach(function (x) { h += '<div class="dow" aria-hidden="true">' + x + "</div>"; });
    for (i = 0; i < first.getDay(); i++) h += '<button class="blank" tabindex="-1" aria-hidden="true"></button>';
    var sel = $("#pStart").value;
    for (d = 1; d <= n; d++) {
      var dt = new Date(cal.y, cal.m, d), c = classify(dt, st), cls = [];
      if (c.logged) cls.push("logged");
      else if (c.pred) cls.push("pred");
      else if (c.ov) cls.push("ov");
      else if (c.fert) cls.push("fert");
      else if (c.pms) cls.push("pms");
      if (diff(dt, t) === 0) cls.push("today");
      if (iso(dt) === sel) cls.push("sel");
      h += '<button class="' + cls.join(" ") + '" data-d="' + iso(dt) + '" aria-label="' + fmtLong(dt) + '">' + d + "</button>";
    }
    var g = $("#calGrid");
    g.innerHTML = h;
    $$("button[data-d]", g).forEach(function (b) {
      b.addEventListener("click", function () { $("#pStart").value = b.dataset.d; renderCal(); });
    });

    var l = $("#pList"), ps = S.periods.slice().sort(function (a, b) { return b.start.localeCompare(a.start); });
    l.innerHTML = ps.length ? ps.map(function (p) {
      return '<li><span>' + fmtLong(parse(p.start)) + ", " + p.days + " days, " + esc(p.flow) + ", pain " + p.pain + "/10" +
        (p.note ? "<br><span class='muted small'>" + esc(p.note) + "</span>" : "") + "</span>" +
        '<button class="link" data-del="' + p.start + '" aria-label="Delete period from ' + fmtLong(parse(p.start)) + '">Delete</button></li>';
    }).join("") : '<li class="muted">No periods logged yet.</li>';
    $$("[data-del]", l).forEach(function (b) {
      b.addEventListener("click", function () {
        S.periods = S.periods.filter(function (p) { return p.start !== b.dataset.del; });
        save(); renderCal();
      });
    });
  }

  $("#prevM").addEventListener("click", function () { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCal(); });
  $("#nextM").addEventListener("click", function () { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCal(); });
  $("#pPain").addEventListener("input", function (e) { $("#pPainV").textContent = e.target.value; });

  // Show a text box when "Something else" is chosen for flow.
  $$('input[name="pflow"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var other = $('input[name="pflow"]:checked').value === "Other";
      $("#pFlowOther").hidden = !other;
      if (other) $("#pFlowOther").focus();
    });
  });

  $("#savePeriod").addEventListener("click", function () {
    var s = $("#pStart").value, msg = $("#pMsg");
    if (!s) { msg.textContent = "Please pick the first day of bleeding."; return; }
    if (diff(parse(s), today()) > 0) { msg.textContent = "That date is in the future. Pick today or an earlier day."; return; }
    var days = Math.min(15, Math.max(1, parseInt($("#pDays").value, 10) || 5));
    var flow = $('input[name="pflow"]:checked').value;
    if (flow === "Other") flow = $("#pFlowOther").value.trim() || "Something else";
    S.periods = S.periods.filter(function (p) { return p.start !== s; });
    S.periods.push({ start: s, days: days, flow: flow, pain: +$("#pPain").value, note: $("#pNote").value.trim() });
    save();
    msg.textContent = "Saved 🌷 Your dates are updated.";
    $("#pNote").value = "";
    var d = parse(s); cal.y = d.getFullYear(); cal.m = d.getMonth();
    renderCal();
  });

  /* ---------- DAILY CHECK-IN ---------- */
  var SYMS = ["Hot flashes", "Night sweats", "Poor sleep", "Low mood", "Irritability", "Anxiety", "Fatigue", "Brain fog", "Cramps", "Headache", "Bloating", "Joint pain", "Vaginal dryness", "Palpitations"];
  var MENO = ["Hot flashes", "Night sweats", "Poor sleep", "Low mood", "Vaginal dryness", "Brain fog", "Joint pain"];

  // Small ideas shown after saving a check-in.
  var IDEAS = {
    "Hot flashes": "Keep a fan close, wear light layers and sip cool water. 🌬️",
    "Night sweats": "Use cotton sheets, keep the room cool and keep a spare top by the bed. 🌙",
    "Poor sleep": "Keep a fixed bedtime and switch off screens 30 minutes before. 😴",
    "Low mood": "Step outside for a short walk and talk to someone you trust. 💗",
    "Irritability": "Pause and take 5 slow breaths. It is the hormones, not you. 🌿",
    "Anxiety": "Breathe in for 4, out for 6, five times. Slow breathing calms the body. 🌸",
    "Fatigue": "Take a short rest, eat a protein snack and drink water. 🥣",
    "Brain fog": "Write down your top 3 tasks and do one at a time. 📝",
    "Cramps": "A warm compress and gentle stretching can ease cramps. 🔥",
    "Headache": "Drink water, rest in a quiet dim room and ease your neck and shoulders. 💧",
    "Bloating": "Eat slowly, take a short walk after meals and cut back on salt. 🚶",
    "Joint pain": "Gentle stretching or yoga helps. Mention it to a doctor if it lasts. 🧘",
    "Vaginal dryness": "Gentle moisturisers can help. Ask a pharmacist or doctor which to use. 💬",
    "Palpitations": "Sit down and breathe slowly. If it is frequent, or comes with chest pain or dizziness, see a doctor right away. 🩺"
  };

  function chip(label, value, group) {
    return '<label class="chip"><input type="checkbox" name="' + group + '" value="' + esc(value) + '"><span>' + esc(label) + "</span></label>";
  }
  function checked(name, root) { return $$('input[name="' + name + '"]:checked', root).map(function (i) { return i.value; }); }

  function drawSymChips() {
    $("#symChips").innerHTML = SYMS.concat(S.custom).map(function (s) { return chip(s, s, "sym"); }).join("");
  }

  function loadSymForDate() {
    var d = $("#sDate").value;
    var e = S.symptoms.filter(function (x) { return x.date === d; })[0];
    $$('input[name="sym"]').forEach(function (i) { i.checked = !!(e && e.items.indexOf(i.value) > -1); });
    $("#sMood").value = e ? e.mood : 3;
    $("#sMoodV").textContent = $("#sMood").value;
    $("#sSleep").value = e ? e.sleep : 7;
  }
  function renderSym() {
    if (!$("#sDate").value) $("#sDate").value = iso(today());
    loadSymForDate();
    drawSymStats();
  }

  function drawSymStats() {
    var t = today(), days = [], i;
    for (i = 13; i >= 0; i--) days.push(addDays(t, -i));
    var counts = days.map(function (d) {
      var e = S.symptoms.filter(function (x) { return x.date === iso(d); })[0];
      return e ? e.items.length : 0;
    });
    var max = Math.max(4, Math.max.apply(null, counts)), w = 300, hh = 110, bw = w / 14;
    var svg = '<svg class="chart" viewBox="0 0 ' + w + " " + (hh + 22) + '" role="img" aria-label="Symptoms per day for the last 14 days">';
    days.forEach(function (d, k) {
      var bh = counts[k] / max * hh, x = k * bw + 4;
      svg += '<rect x="' + x.toFixed(1) + '" y="' + (hh - bh).toFixed(1) + '" width="' + (bw - 8).toFixed(1) + '" height="' + Math.max(bh, 3).toFixed(1) + '" rx="5" fill="' + (counts[k] ? "var(--rose)" : "var(--line)") + '"/>';
      if (k % 3 === 0 || k === 13) svg += '<text x="' + (x + (bw - 8) / 2).toFixed(1) + '" y="' + (hh + 16) + '" font-size="9" text-anchor="middle" fill="var(--muted)">' + d.getDate() + "</text>";
    });
    $("#symChart").innerHTML = svg + "</svg>";

    var tally = {};
    S.symptoms.forEach(function (e) {
      var k = diff(t, parse(e.date));
      if (k >= 0 && k < 30) e.items.forEach(function (s) { tally[s] = (tally[s] || 0) + 1; });
    });
    var top = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; }).slice(0, 5);
    $("#symTop").innerHTML = top.length ? top.map(function (s) {
      return "<li><span>" + esc(s) + "</span><strong>" + tally[s] + " day" + (tally[s] === 1 ? "" : "s") + "</strong></li>";
    }).join("") : '<li class="muted">Nothing logged yet.</li>';
  }

  // Build a short, kind list of ideas from what she logged.
  function ideasFor(items, mood, sleep) {
    var out = [], shown = items.slice(0, 4);
    shown.forEach(function (s) {
      out.push(IDEAS[s] || "You noted \u201C" + esc(s) + "\u201D. If it keeps coming back, mention it to your doctor. 🌿");
    });
    if (items.length > 4) out.push("You noted " + (items.length - 4) + " more. The Care tab has ideas for many of them. 🌿");
    if (mood <= 2) out.push("Low days happen. Reach out to someone you trust. If you feel low for 2 weeks or more, please see a doctor. In India you can call Tele-MANAS at 14416. 💗");
    if (sleep > 0 && sleep < 6) out.push("You slept less than 6 hours. A short rest or an early night tonight can help. 🌙");
    if (!items.length && mood >= 3 && (sleep >= 6 || !sleep)) out.push("A calm day. Keep doing what is working for you. 🌷");
    return out;
  }

  $("#sDate").addEventListener("change", function () { loadSymForDate(); $("#sTips").innerHTML = ""; });
  $("#sMood").addEventListener("input", function (e) { $("#sMoodV").textContent = e.target.value; });

  // Let her add her own symptom when the list does not fit.
  $("#addSym").addEventListener("click", function () {
    var box = $("#customSym"), v = box.value.trim();
    if (!v) return;
    var all = SYMS.concat(S.custom).map(function (s) { return s.toLowerCase(); });
    if (all.indexOf(v.toLowerCase()) === -1) { S.custom.push(v); save(); }
    var keep = checked("sym");
    keep.push(v);
    drawSymChips();
    $$('input[name="sym"]').forEach(function (i) {
      i.checked = keep.some(function (k) { return k.toLowerCase() === i.value.toLowerCase(); });
    });
    box.value = "";
  });

  $("#saveSym").addEventListener("click", function () {
    var d = $("#sDate").value;
    if (!d) { $("#sMsg").textContent = "Please pick a date."; return; }
    var items = checked("sym"), mood = +$("#sMood").value, sleep = +$("#sSleep").value || 0;
    S.symptoms = S.symptoms.filter(function (x) { return x.date !== d; });
    S.symptoms.push({ date: d, items: items, mood: mood, sleep: sleep });
    save();
    $("#sMsg").textContent = "Saved for " + fmtLong(parse(d)) + " 🌼";
    var ideas = ideasFor(items, mood, sleep);
    $("#sTips").innerHTML = '<div class="card soft"><h3>A few gentle ideas 🌿</h3><ul class="ideas">' +
      ideas.map(function (x) { return "<li>" + x + "</li>"; }).join("") +
      '</ul><button class="btn ghost small" data-go="care">More in Care</button></div>';
    bindGo($("#sTips"));
    drawSymStats();
  });

  /* ---------- MY STAGE: step by step ---------- */
  var quiz = { active: false, id: "age", ans: {} };

  var QSTEPS = [
    { id: "age", type: "single", title: "How old are you?", hint: "No right or wrong answers 🌸",
      opts: [["Under 40", "35"], ["40 to 44", "42"], ["45 to 49", "47"], ["50 to 54", "52"], ["55 or older", "57"]] },
    { id: "since", type: "single", title: "When was your last period?", hint: "A rough guess is fine.",
      opts: [["In the last month", "0"], ["1 to 2 months ago", "1"], ["3 to 5 months ago", "3"], ["6 to 11 months ago", "6"], ["A year ago or more", "12"]] },
    { id: "pattern", type: "single", title: "How have your periods been this past year?", hint: "Pick the closest one.",
      skip: function (a) { return a.since === "12"; },
      opts: [["Regular, about the same each month", "regular"], ["Sometimes early or late", "varies"], ["Often skipping months", "skip"], ["I have had none", "none"]] },
    { id: "flow", type: "single", title: "How is your flow lately?", hint: "Pick the closest one, or write your own.",
      skip: function (a) { return a.since === "12" || a.pattern === "none"; },
      opts: [["Normal", "normal"], ["Lighter or fewer days", "lighter"], ["Heavier", "heavier"], ["More blood clots", "clots"], ["Changes a lot", "varies"], ["Something else", "other"]] },
    { id: "sym", type: "multi", title: "What have you been feeling?", hint: "Tap any that fit, or none." },
    { id: "more", type: "extra", title: "A little about you", hint: "All optional. This helps us give you better tips." }
  ];

  function startQuiz() { quiz = { active: true, id: "age", ans: {} }; }
  function stepById(id) { return QSTEPS.filter(function (s) { return s.id === id; })[0]; }
  function isSkipped(s) { return !!(s.skip && s.skip(quiz.ans)); }
  function visibleSteps() { return QSTEPS.filter(function (s) { return !isSkipped(s); }); }
  function neighbour(id, dir) {
    var i = QSTEPS.indexOf(stepById(id)) + dir;
    while (i >= 0 && i < QSTEPS.length) {
      if (!isSkipped(QSTEPS[i])) return QSTEPS[i].id;
      i += dir;
    }
    return null;
  }
  function goNext() {
    var n = neighbour(quiz.id, 1);
    if (n) { quiz.id = n; renderStage(); window.scrollTo(0, 0); } else finishQuiz();
  }

  function renderQuiz(box) {
    var s = stepById(quiz.id), vis = visibleSteps(), n = vis.indexOf(s) + 1;
    var pct = Math.round(n / vis.length * 100);
    var h = '<div class="card"><div class="qtop"><button class="link" id="qBack">Back</button><span class="small muted">Question ' + n + " of " + vis.length + "</span></div>" +
      '<div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      '<h2 class="qt">' + s.title + '</h2><p class="sub">' + s.hint + "</p>";

    if (s.type === "single") {
      h += '<div class="opts">' + s.opts.map(function (o) {
        return '<button class="opt' + (quiz.ans[s.id] === o[1] ? " sel" : "") + '" data-v="' + o[1] + '" data-l="' + esc(o[0]) + '"><span><span class="ot">' + o[0] + "</span></span></button>";
      }).join("") + "</div>";
      if (s.id === "flow" && quiz.ans.flow === "other") {
        h += '<input type="text" id="qFlowOther" maxlength="80" placeholder="Describe it in your own words" aria-label="Describe your flow" value="' + esc(quiz.ans.flowOther || "") + '">' +
          '<div class="actions"><button class="btn" id="qNext">Next</button></div>';
      }
    } else if (s.type === "multi") {
      h += '<div class="chips" id="qChips">' + MENO.map(function (m) { return chip(m, m, "qsym"); }).join("") + "</div>" +
        '<input type="text" id="qOther" maxlength="150" placeholder="Anything else? Write it in your own words" aria-label="Anything else" value="' + esc(quiz.ans.other || "") + '">' +
        '<div class="actions"><button class="btn" id="qNext">Next</button></div>';
    } else {
      h += '<label class="f">Does any of this apply?</label><div class="chips" id="qSit">' +
        [["Pregnant or breastfeeding", "preg"], ["Hormonal pill, injection or IUD", "horm"], ["Hysterectomy or ovary surgery", "surg"], ["Thyroid problem or PCOS", "thy"]]
          .map(function (x) { return chip(x[0], x[1], "qsit"); }).join("") + "</div>" +
        '<div class="row"><div><label class="f" for="qH">Height (cm)</label><input type="number" id="qH" min="120" max="220" inputmode="numeric" value="' + (S.profile.h || "") + '"></div>' +
        '<div><label class="f" for="qW">Weight (kg)</label><input type="number" id="qW" min="30" max="250" inputmode="decimal" value="' + (S.profile.w || "") + '"></div></div>' +
        '<div class="actions"><button class="btn" id="qNext">See my result 🌸</button></div>';
    }
    h += "</div>";
    box.innerHTML = h;

    // re-tick saved multi answers
    if (s.type === "multi") (quiz.ans.sym || []).forEach(function (v) { var i = $('input[name="qsym"][value="' + v + '"]', box); if (i) i.checked = true; });
    if (s.type === "extra") (quiz.ans.sit || []).forEach(function (v) { var i = $('input[name="qsit"][value="' + v + '"]', box); if (i) i.checked = true; });

    $("#qBack").addEventListener("click", function () {
      var p = neighbour(quiz.id, -1);
      if (p) { quiz.id = p; renderStage(); } else { quiz.active = false; show("welcome"); }
    });

    $$(".opt", box).forEach(function (b) {
      b.addEventListener("click", function () {
        quiz.ans[s.id] = b.dataset.v;
        if (s.id === "age") quiz.ans.ageLabel = b.dataset.l;
        if (s.id === "flow" && b.dataset.v === "other") { renderStage(); var f = $("#qFlowOther"); if (f) f.focus(); return; }
        goNext();
      });
    });

    var nx = $("#qNext", box);
    if (nx) nx.addEventListener("click", function () {
      if (s.id === "flow") quiz.ans.flowOther = $("#qFlowOther").value.trim();
      if (s.type === "multi") { quiz.ans.sym = checked("qsym", box); quiz.ans.other = $("#qOther").value.trim(); }
      if (s.type === "extra") {
        quiz.ans.sit = checked("qsit", box);
        var h2 = parseFloat($("#qH").value), w2 = parseFloat($("#qW").value);
        if (h2) S.profile.h = h2; else delete S.profile.h;
        if (w2) S.profile.w = w2; else delete S.profile.w;
      }
      goNext();
    });
  }

  // BMI only shapes the advice. It does not decide the stage. Asian cut-offs.
  function bmiInfo(h, w) {
    if (!h || !w) return null;
    var b = w / Math.pow(h / 100, 2), cat, tip;
    if (b < 18.5) { cat = "Underweight"; tip = "Bone health matters most for you. Eat enough protein and calcium, add strength training, and ask a doctor about vitamin D and a bone density scan."; }
    else if (b < 23) { cat = "Healthy range"; tip = "Keep a mix of strength training and walking, and eat enough protein and calcium to protect bones and muscle."; }
    else if (b < 25) { cat = "Slightly above healthy range"; tip = "Add 2 or 3 strength sessions a week and daily walks. Muscle helps manage weight changes around menopause."; }
    else { cat = "Above healthy range"; tip = "Hot flashes can be more frequent at higher weight, and diabetes and heart risks rise. Daily walks, strength training, less sugar and regular blood tests are good steps."; }
    return { v: b.toFixed(1), cat: cat, tip: tip };
  }
  function bmiNow() { return bmiInfo(S.profile.h, S.profile.w); }

  // The simple rules that pick the stage. Change these to experiment.
  function assess(f) {
    var why = [], cautions = [], key, conf = "Medium", sym = f.sym.length;
    var vaso = f.sym.filter(function (s) { return s === "Hot flashes" || s === "Night sweats"; }).length;
    var m = +f.since, age = f.age;

    if (f.sit.indexOf("preg") > -1 || f.sit.indexOf("surg") > -1) {
      key = "unsure"; conf = "Low";
      why.push("Pregnancy, breastfeeding or surgery changes periods, so periods alone cannot show your stage.");
      if (sym >= 3) why.push("You noticed " + sym + " menopause-type symptoms. A doctor can check your hormone levels if they bother you.");
    } else if (f.pattern === "none" || m >= 12) {
      if (age < 40) {
        key = "doctor"; conf = "High";
        why.push("No periods for a long time before age 40 needs a medical check. Causes include thyroid problems, PCOS, low body weight, stress and early ovarian insufficiency.");
      } else if (age < 45 && f.sit.indexOf("horm") === -1) {
        key = "post";
        why.push("12 months or more with no period usually means menopause has happened.");
        why.push("Menopause before 45 is called early, so a doctor visit is a good idea.");
      } else {
        key = "post"; conf = f.sit.indexOf("horm") > -1 ? "Low" : "High";
        why.push("12 months or more with no period usually means menopause has happened. Everything after that is called post-menopause.");
      }
    } else if (m >= 3 || f.pattern === "skip") {
      if (age < 40) {
        key = "doctor";
        why.push("Skipped or very late periods at your age have many possible causes, like pregnancy, thyroid problems, PCOS or stress. A doctor can help sort this out.");
      } else {
        key = "late";
        why.push(m >= 3 ? "Your last period was " + (m >= 6 ? "6 or more" : "3 or more") + " months ago." : "You often skip months.");
        why.push("Long gaps between periods are typical of the last years before menopause.");
      }
    } else if (f.pattern === "varies" || f.flow === "lighter" || f.flow === "varies") {
      if (age >= 40) {
        key = "early";
        why.push("Your age and changing cycles fit the early years before menopause.");
        if (f.pattern === "varies") why.push("Cycles that move by a week or more are often the first sign.");
      } else {
        key = "regular"; conf = "Low";
        why.push("At your age, changing cycles are usually due to stress, weight change, thyroid problems or PCOS, not menopause.");
        cautions.push("If your cycles stay irregular for 3 months or more, please see a doctor.");
      }
    } else {
      if (age >= 45 && sym >= 3) {
        key = "early"; conf = "Low";
        why.push("Your cycles are regular, but your age and " + sym + " symptoms could mean early changes before menopause.");
      } else {
        key = "regular"; conf = age >= 40 ? "Medium" : "High";
        why.push("Your periods are regular and nothing else points to a change.");
        if (age >= 40) cautions.push("Keep logging. After 40, watch for shorter, longer or skipped cycles.");
      }
    }

    if (vaso > 0 && (key === "early" || key === "late" || key === "post")) why.push("Hot flashes or night sweats support this result.");
    if (f.flow === "heavier" || f.flow === "clots") cautions.push("Heavier flow or more blood clots can have other causes. If you soak a pad every hour or pass large clots, please see a doctor.");
    if (f.sit.indexOf("horm") > -1) cautions.push("Hormonal contraception can hide natural cycle changes, so this result is less certain.");
    if (f.sit.indexOf("thy") > -1) cautions.push("Thyroid problems and PCOS can look like menopause or hide it.");
    if (key === "late") cautions.push("You can still become pregnant until 12 months without a period. Use contraception if you do not want to conceive.");
    return { key: key, conf: conf, why: why, cautions: cautions };
  }

  function finishQuiz() {
    var a = quiz.ans;
    var f = {
      age: parseInt(a.age, 10) || 40,
      since: a.since || "0",
      pattern: a.since === "12" ? "none" : (a.pattern || "regular"),
      flow: a.flow || "normal",
      sym: a.sym || [],
      sit: a.sit || []
    };
    var r = assess(f);
    r.date = iso(today());
    r.ageLabel = a.ageLabel || "";
    r.sym = f.sym;
    r.flowText = a.flow === "other" ? (a.flowOther || "") : "";
    r.other = a.other || "";
    S.profile.age = f.age;
    S.profile.ageLabel = r.ageLabel;
    S.profile.result = r;
    S.profile.stageKey = r.key;
    S.profile.skipped = false;
    save();
    quiz.active = false;
    renderStage();
    window.scrollTo(0, 0);
  }

  function resultHTML(r) {
    var b = bmiNow();
    var h = '<div class="card result"><h3 class="q">Why we think so</h3><ul>' + r.why.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
    if (r.flowText) h += '<p class="small muted">You described your flow as: ' + esc(r.flowText) + "</p>";
    if (r.other) h += '<p class="small muted">You also noted: ' + esc(r.other) + "</p>";
    if (b) h += '<h3 class="q">Your BMI: ' + b.v + " (" + b.cat + ")</h3><p>" + b.tip + '</p><p class="small muted">BMI does not decide your stage. It only shapes the advice.</p>';
    if (r.cautions.length) h += '<div class="note"><ul>' + r.cautions.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    h += '<div class="warn"><strong>Please see a doctor soon if you have:</strong><ul>' +
      "<li>Any bleeding after 12 months without a period</li>" +
      "<li>Very heavy bleeding or bleeding between periods</li>" +
      "<li>Symptoms before age 40</li>" +
      "<li>Low mood that will not lift, or thoughts of harming yourself. In India you can call Tele-MANAS at 14416.</li></ul></div>" +
      '<p class="small muted">This is a guide, not a diagnosis.</p></div>';
    return h;
  }

  function renderStage() {
    var box = $("#stageBox");
    if (quiz.active) { renderQuiz(box); return; }
    var key = stageKey(), r = S.profile.result, h = "";
    if (key) {
      h += '<div class="card soft"><span class="pill">Your stage</span><h2>' + STAGE_EMOJI[key] + " " + STAGE_NAMES[key] + "</h2>" +
        '<p class="sub">' + STAGE_TIPS[key] + "</p>" +
        '<div class="actions"><button class="btn" data-go="today">Go to Home</button><button class="btn ghost" data-go="care">Care tips</button></div></div>';
      if (r) h += resultHTML(r);
      h += '<div class="card"><h3>Want to change this?</h3><div class="actions" style="margin-top:8px"><button class="btn ghost" id="pickAgain">Pick my stage</button><button class="btn ghost" id="redoQuiz">Help me find out</button></div></div>';
    } else {
      h += '<div class="card soft"><h2>Which stage am I in? 🌺</h2><p class="sub">Answer a few easy questions, one at a time. It stays on your device.</p>' +
        '<div class="actions"><button class="btn" id="redoQuiz">Let us begin</button><button class="btn ghost" id="pickAgain">I know my stage</button></div></div>';
    }
    box.innerHTML = h;
    bindGo(box);
    var q = $("#redoQuiz"), p = $("#pickAgain");
    if (q) q.addEventListener("click", function () { startQuiz(); renderStage(); window.scrollTo(0, 0); });
    if (p) p.addEventListener("click", function () { show("welcome"); });
  }

  /* ---------- CARE ---------- */
  var CARE = [
    ["Hot flashes and night sweats", [
      "Dress in thin layers and keep your bedroom cool, with a fan nearby.",
      "Notice your triggers. Spicy food, caffeine, alcohol and stress are common ones.",
      "Try slow belly breathing for 10 minutes a day.",
      "If they disturb sleep or work, a doctor can talk to you about hormone therapy and other medicines."]],
    ["Hormone ups and downs", [
      "Note your mood, sleep and cycle days. Patterns show up after 2 or 3 months.",
      "Eat at regular times and do not skip meals. Blood sugar swings make mood worse.",
      "Strength training and walking steady mood and sleep.",
      "Hormone treatment is a doctor's decision. Please do not self-medicate."]],
    ["Work load and tiredness", [
      "Do hard tasks when your energy is highest and keep easy work for low hours.",
      "Take a 5 minute break every hour. A small desk fan helps with hot flashes.",
      "Tell a manager or colleague you trust what you need, like flexible hours.",
      "Protect your sleep. It is the biggest help for energy and focus."]],
    ["Emotional support", [
      "Tell one trusted person how you feel. A simple line works: 'I am going through hormone changes and I need some patience.'",
      "Share what helps you with family so they know how to support you.",
      "Join a peer group, online or nearby. Talking to women who understand reduces loneliness.",
      "Counselling, especially CBT, is shown to help with anxiety, low mood and sleep during menopause."]],
    ["Nutrition", [
      "Calcium: milk, curd, paneer, ragi, til (sesame), almonds and green leafy vegetables.",
      "Vitamin D: 15 to 20 minutes of morning sun, and a blood test before taking tablets.",
      "Protein at every meal: dal, eggs, sprouts, soya, fish or chicken.",
      "Iron if you bleed heavily: spinach, beetroot, dates and jaggery, with a vitamin C food.",
      "Cut back on sugar, extra salt, caffeine and alcohol. Drink enough water."]],
    ["Exercise", [
      "Aim for 150 minutes a week of brisk walking, cycling or swimming.",
      "Add strength work 2 or 3 days a week. It protects bones and muscle.",
      "Yoga and pranayama help with stress and sleep.",
      "Pelvic floor exercises help with bladder control."]],
    ["Supplements", [
      "Ask a doctor or pharmacist before starting any. Get tested first when you can.",
      "Often discussed: calcium, vitamin D, magnesium, omega-3 and vitamin B12 (especially if you are vegetarian).",
      "Proof for herbal menopause products is mixed, and some interact with medicines."]],
    ["Therapy and doctor visits", [
      "See a gynaecologist if symptoms affect daily life, or you notice any warning signs.",
      "Ask about a bone density scan, thyroid test, blood pressure, sugar and cholesterol checks.",
      "A therapist can help with mood, sleep and relationship stress.",
      "Bring your NourishHer summary so the visit is faster and more useful."]]
  ];

  function renderCare() {
    var key = stageKey(), b = bmiNow(), h = "";
    if (key) {
      h = '<div class="card soft"><span class="pill">' + STAGE_EMOJI[key] + " " + STAGE_NAMES[key] + "</span><p>" + STAGE_TIPS[key] + "</p>" +
        (b ? '<p class="small muted">' + b.tip + "</p>" : "") + "</div>";
    } else {
      h = '<div class="card soft"><h3>Make this about you 🌸</h3><p class="sub">Tell us your stage to get tips that fit you.</p><button class="btn ghost small" data-go="welcome">Choose my stage</button></div>';
    }
    $("#careTop").innerHTML = h;
    bindGo($("#careTop"));
    $("#careList").innerHTML = CARE.map(function (c) {
      return "<details><summary>" + c[0] + "</summary><ul>" + c[1].map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></details>";
    }).join("");
  }

  $("#mkSummary").addEventListener("click", function () {
    var st = stats(), r = S.profile.result, key = stageKey(), b = bmiNow(), tt = today();
    var L = ["NourishHer summary, " + fmtLong(tt)];
    if (S.profile.age) L.push("Age: " + (S.profile.ageLabel || S.profile.age) + (b ? "   BMI: " + b.v + " (" + b.cat + ")" : ""));
    if (key) L.push("Stage: " + STAGE_NAMES[key] + (r ? " (" + r.conf + " confidence, " + fmtLong(parse(r.date)) + ")" : " (chosen by me)"));
    if (r && r.flowText) L.push("Flow described as: " + r.flowText);
    if (r && r.other) L.push("Other notes: " + r.other);
    if (st) {
      L.push("Last period started: " + fmtLong(st.last));
      L.push("Average cycle: " + st.L + " days" +
        (st.recent.length > 1 ? " (range " + Math.min.apply(null, st.recent) + " to " + Math.max.apply(null, st.recent) + ")" : "") +
        "   Average bleeding: " + st.P + " days");
      L.push("Recent periods: " + st.ps.slice(-6).map(function (p) {
        return fmtShort(parse(p.start)) + " (" + p.days + "d, " + String(p.flow).toLowerCase() + ", pain " + p.pain + (p.note ? ", " + p.note : "") + ")";
      }).join("; "));
    } else {
      L.push("No periods logged.");
    }
    var tally = {};
    S.symptoms.forEach(function (e) {
      var k = diff(tt, parse(e.date));
      if (k >= 0 && k < 30) e.items.forEach(function (s) { tally[s] = (tally[s] || 0) + 1; });
    });
    var top = Object.keys(tally).sort(function (a, b2) { return tally[b2] - tally[a]; });
    L.push("Symptoms, last 30 days: " + (top.length ? top.map(function (s) { return s + " (" + tally[s] + " days)"; }).join(", ") : "none logged"));
    $("#summary").value = L.join("\n");
  });

  $("#cpSummary").addEventListener("click", function () {
    var ta = $("#summary");
    if (!ta.value) $("#mkSummary").click();
    ta.select();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value);
      else document.execCommand("copy");
    } catch (e) {}
  });

  var wipeArmed = false;
  $("#wipe").addEventListener("click", function () {
    var b = $("#wipe");
    if (!wipeArmed) { wipeArmed = true; b.textContent = "Tap again to delete everything"; return; }
    S = { periods: [], symptoms: [], custom: [], profile: {} };
    try { localStorage.removeItem(KEY); } catch (e) {}
    wipeArmed = false;
    b.textContent = "Delete all my data";
    $("#summary").value = "";
    $("#sTips").innerHTML = "";
    drawSymChips();
    quiz = { active: false, id: "age", ans: {} };
    show("welcome");
  });

  /* ---------- start ---------- */
  load();
  drawSymChips();
  $("#pStart").value = iso(today());
  if (!S.profile.stageKey && !S.profile.skipped) show("welcome");
  else show("today");
})(); 
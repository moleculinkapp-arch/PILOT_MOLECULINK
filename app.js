const STUDENT_ACCOUNT_COUNT = 100;
const STUDENT_APP_URL = "moleculink_refined.html";
const pilotStudentAccounts = Array.from({ length: STUDENT_ACCOUNT_COUNT }, (_, index) => {
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `ML-STU-${number}`,
    password: `PILOT${number}`,
    accountNumber: index + 1,
    displayName: `Learner ${number}`,
    school: "Pilot School",
    section: "Pilot Section"
  };
});
const data = window.MOLECULINK_PILOT_DATA || {
  schools: [],
  teachers: [],
  learners: [],
  upcomingAssessments: [],
  uploads: []
};

const routes = ["landing", "student-login", "teacher-login", "admin-login", "student", "teacher", "admin"];
const credentials = {
  students: pilotStudentAccounts,
  teacher: { username: "TEACHER", password: "MOLECULINK2026" },
  admin: { username: "ADMIN", password: "ADMINMOLECULINK2026" }
};

function icon(name) {
  return `<i data-lucide="${name}"></i>`;
}

function card(title, body, iconName = "atom") {
  return `<article class="card handbook-card">${icon(iconName)}<h2>${title}</h2>${body}</article>`;
}

function list(items) {
  return `<ul class="check-list">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
}

function pageHead(eyebrow, title, body) {
  return `<div class="page-head"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${body}</p></div>`;
}

function teacherStepTable(rows) {
  return `
    <table class="table">
      <thead><tr><th>Mission Part</th><th>Teacher Move</th><th>Learner Evidence</th></tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function exemplarBox(title, script, notes) {
  return `
    <article class="card exemplar-box">
      <h2>${title}</h2>
      <p><b>Suggested teacher script:</b> “${script}”</p>
      <p><b>Facilitator note:</b> ${notes}</p>
    </article>
  `;
}

function activateRoute(route) {
  if (!routes.includes(route)) route = "landing";
  document.querySelectorAll(".route").forEach(section => section.classList.remove("active"));
  document.getElementById(`route-${route}`)?.classList.add("active");
  history.replaceState(null, "", `#${route}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (window.lucide) lucide.createIcons();
}

function activateTab(group, tabId) {
  document.querySelectorAll(`[data-${group}-tab]`).forEach(button => {
    button.classList.toggle("active", button.dataset[`${group}Tab`] === tabId);
  });
  document.querySelectorAll(`.${group}-tab`).forEach(section => {
    section.classList.toggle("active", section.id === tabId);
  });
  if (tabId === "teacher-home") updateLiveMonitor("all");
  if (window.lucide) lucide.createIcons();
}

function average(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, item) => sum + item, 0) / values.length);
}

function displayMetric(value, suffix = "") {
  return value === null || value === undefined ? "No data" : `${value}${suffix}`;
}

function getStoredLearnerRecords() {
  try {
    const legacy = JSON.parse(localStorage.getItem("moleculink_pilot_learner_records") || "[]");
    const assessmentRecords = getTeacherAssessmentRecords();
    const map = new Map();
    if (Array.isArray(legacy)) {
      legacy.forEach(item => {
        if (item?.id) map.set(item.id, item);
      });
    }
    assessmentRecords.forEach(record => {
      const id = record.studentId || record.id || "ML-STU-001";
      const existing = map.get(id) || {
        id,
        school: "Pilot School",
        section: record.section || "Pilot Section",
        progress: 0,
        badges: 0,
        certificate: false,
        misconception: "No focus area recorded yet"
      };
      existing.section = record.section || existing.section || "Pilot Section";
      existing.studentName = record.studentName || existing.studentName || "Molecular Detective";
      existing.misconception = record.recommendedRemediationFocus || existing.misconception;
      if (record.assessmentType === "readiness") {
        existing.pretest = record.score;
        existing.pretestTotal = record.totalItems || record.total || 15;
        existing.readinessPercent = record.percentage;
        existing.readinessStatus = record.percentage >= 80 ? "Ready" : record.percentage >= 60 ? "Developing readiness" : "Needs support";
      }
      if (record.assessmentType === "clearance") {
        existing.posttest = record.score;
        existing.posttestTotal = record.totalItems || record.total || 15;
        existing.clearancePercent = record.percentage;
      }
      existing.progress = Math.max(existing.progress || 0, record.assessmentType === "clearance" ? 100 : 25);
      map.set(id, existing);
    });
    return Array.from(map.values());
  } catch (error) {
    return [];
  }
}

function getTeacherAssessmentRecords() {
  try {
    const records = JSON.parse(localStorage.getItem("moleculink_teacher_assessment_records") || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    return [];
  }
}

function latestRecordsByLearnerAndType(records = getTeacherAssessmentRecords()) {
  const map = new Map();
  records.forEach(record => {
    if (!record?.studentId || !record?.assessmentType) return;
    const key = `${record.studentId}:${record.assessmentType}`;
    const current = map.get(key);
    if (!current || new Date(record.timestamp || 0) > new Date(current.timestamp || 0)) {
      map.set(key, record);
    }
  });
  return Array.from(map.values());
}

function classAssessmentAnalytics() {
  const records = latestRecordsByLearnerAndType();
  const readiness = records.filter(item => item.assessmentType === "readiness");
  const clearance = records.filter(item => item.assessmentType === "clearance");
  const averageScore = items => items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length) : null;
  const averagePercent = items => items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / items.length) : null;
  const readinessAvg = averageScore(readiness);
  const clearanceAvg = averageScore(clearance);
  const readinessPct = averagePercent(readiness);
  const clearancePct = averagePercent(clearance);
  const aggregate = (field) => {
    const out = {};
    records.forEach(record => {
      const group = record[field] || {};
      Object.entries(group).forEach(([key, value]) => {
        out[key] = out[key] || { correct: 0, total: 0, label: value.label || key };
        out[key].correct += Number(value.correct || 0);
        out[key].total += Number(value.total || 0);
      });
    });
    Object.values(out).forEach(value => {
      value.percentage = value.total ? Math.round(value.correct / value.total * 100) : 0;
    });
    return out;
  };
  const competency = aggregate("competencyPerformance");
  const solo = aggregate("soloPerformance");
  const ranked = Object.entries(competency).sort((a, b) => b[1].percentage - a[1].percentage);
  return {
    records,
    readiness,
    clearance,
    readinessAvg,
    clearanceAvg,
    readinessPct,
    clearancePct,
    learningGain: readinessPct !== null && clearancePct !== null ? clearancePct - readinessPct : null,
    competency,
    solo,
    mostMastered: ranked[0] || null,
    leastMastered: ranked[ranked.length - 1] || null
  };
}

function getLiveLearners() {
  const map = new Map();
  data.learners.forEach(item => map.set(item.id, item));
  getStoredLearnerRecords().forEach(item => {
    if (!item || !item.id) return;
    map.set(item.id, {
      school: "Pilot School",
      section: "Demo Section",
      progress: 0,
      pretest: null,
      posttest: null,
      badges: 0,
      certificate: false,
      misconception: "No focus area recorded yet",
      ...map.get(item.id),
      ...item
    });
  });
  return Array.from(map.values());
}

function readinessScore(item) {
  return item.pretest === null || item.pretest === undefined ? "Not taken" : `${item.pretest}/${item.pretestTotal || 15}`;
}

function emptyState(title, body) {
  return `<div class="empty-state"><b>${title}</b><p>${body}</p></div>`;
}

function normalizeAccessCode(value) {
  return value.replace(/[\s/\\-]+/g, "").toLowerCase();
}

function normalizeLogin(value) {
  return value.trim().toUpperCase();
}

function setLoginStatus(id, message, type = "help") {
  const status = document.getElementById(id);
  if (!status) return;
  status.textContent = message;
  status.classList.remove("error", "success");
  if (type !== "help") status.classList.add(type);
}

function saveActiveLearnerProfile(account) {
  const profile = {
    role: "student",
    id: account.id,
    studentId: account.id,
    dbStudentId: account.dbStudentId || null,
    authUserId: account.authUserId || null,
    accountNumber: account.accountNumber,
    displayName: account.displayName,
    school: account.school,
    section: account.section,
    source: account.source || "local",
    loggedInAt: new Date().toISOString(),
    progressStorageKey: `moleculink_progress_${account.id}`
  };
  localStorage.setItem("moleculink_current_student_id", account.id);
  localStorage.setItem("moleculink_active_learner_profile", JSON.stringify(profile));

  const records = getStoredLearnerRecords();
  if (!records.some(record => record.id === account.id)) {
    records.push({
      id: account.id,
      studentName: account.displayName,
      school: account.school,
      section: account.section,
      progress: 0,
      pretest: null,
      posttest: null,
      badges: 0,
      certificate: false,
      misconception: "No focus area recorded yet"
    });
    localStorage.setItem("moleculink_pilot_learner_records", JSON.stringify(records));
  }

  return profile;
}

function redirectToStudentApp(profile) {
  const params = new URLSearchParams({ student: profile.studentId });
  window.location.href = `${STUDENT_APP_URL}?${params.toString()}`;
}

function authenticateStudent() {
  const id = normalizeLogin(document.getElementById("student-id").value);
  const password = normalizeLogin(document.getElementById("student-pin").value);
  if (!id || !password) {
    setLoginStatus("student-login-status", "Please enter both Student ID and password.", "error");
    return;
  }

  const account = credentials.students.find(item => item.id === id);
  if (account && account.password === password) {
    const profile = saveActiveLearnerProfile({ ...account, source: "local" });
    setLoginStatus("student-login-status", `Welcome, ${profile.displayName}. Opening your Student Portal...`, "success");
    redirectToStudentApp(profile);
  } else {
    setLoginStatus("student-login-status", "Wrong Student ID or password. Use your assigned pilot credentials.", "error");
  }
}

function resetLogin(role) {
  const config = {
    student: {
      fields: ["student-id", "student-pin"],
      status: "student-login-status",
      message: "Signed out. Enter your assigned student credentials."
    },
    teacher: {
      fields: ["teacher-username", "teacher-password"],
      status: "teacher-login-status",
      message: "Signed out. Enter the teacher username and password."
    },
    admin: {
      fields: ["admin-username", "admin-password"],
      status: "admin-login-status",
      message: "Signed out. Enter the administrator username and password."
    }
  }[role];
  if (!config) return;
  config.fields.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
  setLoginStatus(config.status, config.message);
}

function logoutTo(role, route) {
  if (role === "student") {
    localStorage.removeItem("moleculink_current_student_id");
    localStorage.removeItem("moleculink_active_learner_profile");
  }
  localStorage.removeItem("moleculink_active_user");
  resetLogin(role);
  activateRoute(route);
}

function authenticateTeacher() {
  const username = normalizeLogin(document.getElementById("teacher-username").value);
  const password = document.getElementById("teacher-password").value.trim();
  if (!username || !password) {
    setLoginStatus("teacher-login-status", "Please enter both teacher username and password.", "error");
    return;
  }
  if (username === credentials.teacher.username && password === credentials.teacher.password) {
    localStorage.setItem("moleculink_active_portal", "teacher");
    setLoginStatus("teacher-login-status", "Teacher access approved. Opening Teacher Companion Portal...", "success");
    activateRoute("teacher");
    activateTab("teacher", "teacher-home");
  } else {
    setLoginStatus("teacher-login-status", "Wrong teacher username or password. Use the assigned teacher credentials.", "error");
  }
}

function authenticateAdmin() {
  const username = normalizeLogin(document.getElementById("admin-username").value);
  const password = document.getElementById("admin-password").value.trim();
  if (!username || !password) {
    setLoginStatus("admin-login-status", "Please enter both admin username and password.", "error");
    return;
  }
  if (username === credentials.admin.username && password === credentials.admin.password) {
    localStorage.setItem("moleculink_active_portal", "admin");
    setLoginStatus("admin-login-status", "Administrator access approved. Opening Admin Portal...", "success");
    activateRoute("admin");
    activateTab("admin", "admin-home");
  } else {
    setLoginStatus("admin-login-status", "Wrong admin username or password. Use the assigned administrator credentials.", "error");
  }
}

function learnerTable() {
  const learners = getLiveLearners();
  if (!learners.length) {
    return `
      <article class="card">
        <h2>Learner Progress</h2>
        ${emptyState("No learner records yet.", "Progress, readiness, Mission Clearance Test, badge, and certificate records will appear after authorized pilot data is collected.")}
      </article>
    `;
  }
  return `
    <article class="card">
      <h2>Recent Learner Progress</h2>
      <table class="table">
        <thead><tr><th>Student ID</th><th>Section</th><th>Progress</th><th>Readiness Assessment</th><th>Mission Clearance Test</th><th>Focus Area</th><th>Certificate</th></tr></thead>
        <tbody>
          ${learners.map(item => `
            <tr>
              <td>${item.id}</td>
              <td>${item.section}</td>
              <td>${item.progress}%</td>
              <td>${readinessScore(item)}</td>
              <td>${item.posttest === null || item.posttest === undefined ? "Not taken" : `${item.posttest}/15`}</td>
              <td>${item.misconception || "No focus area recorded"}</td>
              <td>${item.certificate ? '<span class="pill">Unlocked</span>' : '<span class="pill">Pending</span>'}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </article>
  `;
}

function barChart(rows) {
  if (!rows.length) return emptyState("No chart data yet.", "This chart will update when learner records are available.");
  return `<div class="bar-chart">${rows.map(([label, value]) => `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(value,100)}%"></div></div><b>${value}</b></div>`).join("")}</div>`;
}

function teacherHome() {
  const learners = getLiveLearners();
  const completion = average(learners.map(item => item.progress));
  const readiness = average(learners.filter(item => item.pretest !== null && item.pretest !== undefined).map(item => item.pretest));
  const post = average(learners.filter(item => item.posttest !== null && item.posttest !== undefined).map(item => item.posttest));
  const certified = learners.filter(item => item.certificate).length;
  return `
    ${pageHead("Start Here", "Teacher Library", "A practical teaching kit for planning, facilitating, assessing, and reflecting on MOLECULINK missions.")}
    <article class="card welcome-teacher-card">
      <div>
        <p class="eyebrow">Welcome, Science Teacher</p>
        <h2>Thank you for guiding today’s molecular investigation.</h2>
        <p>Use this library as your companion for planning the lesson, supporting diverse learners, checking evidence, and preparing feedback. Start with the class flow below, then open the mission guide that matches your learners’ activity.</p>
      </div>
    </article>
    <div class="grid three">
      ${card("Before Class", list(["Open the student mission page.", "Prepare the video, diagrams, and tactile materials.", "Choose one required route and one optional enrichment route."]), "clipboard-check")}
      ${card("During Class", list(["Start with the case question.", "Let learners observe before explaining.", "Use guiding questions when learners get stuck."]), "presentation")}
      ${card("After Class", list(["Review wrap-up checks and exit ticket responses.", "Note common misconceptions.", "Plan remediation or enrichment for the next meeting."]), "list-checks")}
    </div>
    <div class="grid two">
      ${card("Teacher Library Roadmap", list(["Curriculum Map: competency alignment and mission placement.", "Assessment Kit: Readiness Assessment, formative checks, Mission Clearance Test, and evidence table.", "Mission Guides: teacher scripts, misconceptions, and processing questions.", "Detective Toolkit: visual, tactile, game-based, and text-route supports.", "Printables: class-ready sheets and Detective Record templates."]), "map")}
      ${card("Classroom Use Modes", list(["40-minute class: one mission plus one quick enrichment route.", "60-minute class: mission, toolkit activity, wrap-up, and reflection.", "ADM/self-paced: learners use missions independently with teacher check-ins.", "Remediation: return to the mission guide and misconception clinic."]), "clock")}
    </div>
    <div class="grid four">
      <div class="mini-stat"><span>Completion</span><strong>${displayMetric(completion, "%")}</strong></div>
      <div class="mini-stat"><span>Average Readiness</span><strong>${readiness === null ? "No data" : `${readiness}/15`}</strong></div>
      <div class="mini-stat"><span>Average clearance</span><strong>${post === null ? "No data" : `${post}/15`}</strong></div>
      <div class="mini-stat"><span>Certificates</span><strong>${learners.length ? `${certified}/${learners.length}` : "No data"}</strong></div>
    </div>
    <div class="grid two">
      ${card("Suggested 40-60 Minute Flow", list(["5 min: Case File and prediction.", "15-20 min: guided mission page.", "15-20 min: E-nquiry, tactile lab, game, or text route.", "5-10 min: evidence check and investigator conclusion."]), "timer")}
      ${card("Quick Teacher Moves", list(["Ask: What evidence do you see?", "Ask: What invisible interaction could explain it?", "Ask: Which property changed, and why?", "Use the mission guide tab when learners need support."]), "message-square")}
      ${card("Recent Submissions", data.uploads.length ? list(data.uploads) : "<p>No learner submissions have been recorded yet.</p>", "inbox")}
      ${card("Upcoming Activities", list(data.upcomingAssessments), "calendar-check")}
    </div>
    <article class="card live-panel">
      <h2>Realtime Class Monitor</h2>
      <p>This monitor displays collected learner records only. It remains blank until authorized class data is available.</p>
      <div class="grid three">
        <button class="dash-action" type="button" data-live-filter="all">Show All Learners</button>
        <button class="dash-action" type="button" data-live-filter="support">Needs Support</button>
        <button class="dash-action" type="button" data-live-filter="certificate">Certificate Ready</button>
      </div>
      <div id="live-monitor-output" class="output-box">Select a monitor view.</div>
    </article>
    ${learnerTable()}
  `;
}

function teacherWelcome() {
  return `
    ${pageHead("Teaching Approach", "How to Facilitate MOLECULINK", "Use MOLECULINK as an inquiry guide: let learners notice evidence first, then help them name the chemistry behind it.")}
    <div class="grid two">
      ${card("What MOLECULINK Does", "<p>MOLECULINK helps Grade 11/12 learners connect molecular attractions to visible properties through short missions, models, activities, and reflection.</p>", "flask-conical")}
      ${card("Your Role", list(["Open the case.", "Guide learners to observe evidence.", "Ask questions before giving answers.", "Use misconceptions as teaching moments."]), "user-check")}
      ${card("Classroom Rhythm", list(["Mission Objectives: clarify the learning target.", "Case File: connect to daily life.", "Investigation: choose a differentiated route.", "Evidence Check: explain the invisible cause of the observable effect."]), "search-check")}
      ${card("Pilot Evidence to Collect", list(["Readiness Assessment and Mission Clearance Test results.", "Mission evidence check responses.", "Investigator's Journal reflections.", "Teacher notes on learner support needs."]), "clipboard-check")}
    </div>
    <article class="card">
      <h2>Teacher Language Guide</h2>
      ${teacherStepTable([
        ["When starting", "Today we will investigate what we cannot see by studying what we can observe.", "Learners state an initial idea or prediction."],
        ["When learners struggle", "Which clue from the diagram, model, or activity supports your answer?", "Learners return to evidence instead of guessing."],
        ["When closing", "How did an invisible molecular interaction explain an observable physical property today?", "Learners connect IMF to a visible property."]
      ])}
    </article>
  `;
}

function ourProfile() {
  return `
    ${pageHead("Profile Folder", "MOLECULINK Learning Ecosystem", "A unified student, teacher, administrator, and research support system for Senior High School chemistry learning.")}
    <div class="grid two">
      ${card("Vision", "<p>To make chemistry visible, interactive, meaningful, and accessible for diverse Senior High School learners.</p>", "eye")}
      ${card("Mission", "<p>To support inquiry-based science learning through interactive, tactile, gamified, and reflective tools that connect molecular behavior to everyday experiences.</p>", "target")}
      ${card("Objectives", list(["Support competencies on intermolecular forces.", "Provide differentiated routes for visual, kinesthetic, text-based, and game-based learners.", "Give teachers evidence for feedback and intervention.", "Support pilot testing through organized data and reporting."]), "list-checks")}
      ${card("Development Team", list(["Rannie J. Dagal - MAEd General Science Graduate Student", "Edrick R. Pascual - MAEd General Science Graduate Student", "Ysabel Angela V. Embile - MAEd General Science Graduate Student", "Dr. Arlon P. Cadiz - Supervising Investigator"]), "microscope")}
      ${card("Research Basis", "<p>The system is grounded in guided inquiry, constructivist learning, concrete-pictorial-abstract progression, gamified assessment, and Universal Design for Learning.</p>", "book-open")}
      ${card("Acknowledgements and Roadmap", "<p>MOLECULINK acknowledges Pampanga State University Graduate School and future partner schools. Next phases include live authentication, printable packets, research export automation, and teacher-generated class reports.</p>", "landmark")}
    </div>
  `;
}

function teacherBriefing() {
  const subjects = [
    ["Physical Science", "Current Curriculum", "Matter, molecular interactions, properties of substances, and everyday applications.", "Use as the primary SHS core-science implementation path."],
    ["General Chemistry 2", "Previous K-12 Curriculum", "Liquids, solids, intermolecular forces, and structure-property relationships.", "Use as a bridge for schools still referencing previous course organization."],
    ["Chemistry 1", "Strengthened SHS Curriculum", "Scientific inquiry, molecular structure, bonding, polarity, and property explanation.", "Use for strengthened SHS alignment and career-connected chemistry discussion."]
  ];
  const details = ["Course description", "Content standards", "Performance standards", "Learning competencies supported by MOLECULINK", "Prerequisite knowledge", "Suggested implementation schedule", "Time allocation", "Inquiry model", "CPA progression", "Science process skills", "Career connections", "Curriculum mapping"];
  return `
    ${pageHead("Curriculum Map", "Instructional Alignment", "Use this map to locate MOLECULINK within current, previous, and strengthened Senior High School science curricula.")}
    <div class="grid three">
      ${subjects.map(([title, tag, body, note]) => card(title, `<span class="pill">${tag}</span><p>${body}</p><p><b>Implementation note:</b> ${note}</p>${list(details)}`, "library")).join("")}
    </div>
    <article class="card">
      <h2>MOLECULINK Competency Thread</h2>
      ${teacherStepTable([
        ["Mission 1", "Use diagrams to differentiate intermolecular forces from intramolecular forces.", "Learners label forces within and between molecules."],
        ["Mission 2", "Describe London dispersion forces, dipole-dipole forces, and hydrogen bonding.", "Learners identify the strongest IMF using formula, polarity, and structure clues."],
        ["Mission 3", "Explain effects of IMF on liquid properties.", "Learners explain boiling point, melting point, viscosity, surface tension, and vapor pressure trends."]
      ])}
    </article>
  `;
}

function pretestGuide() {
  return `
    ${pageHead("Readiness Assessment", "Diagnostic Assessment Guide", "Parallel to the student Detective Readiness Assessment. Use this before Mission 1 to check readiness without discouraging learners.")}
    <div class="grid two">
      ${card("Purpose", "<p>Identify prior knowledge on bonding, polarity, intermolecular forces, and property trends. The Readiness Assessment is not graded as failure; it guides instruction.</p>", "clipboard-list")}
      ${card("Administration Guide", list(["Give 10-15 minutes.", "Remind learners to answer honestly.", "Do not discuss answers before submission.", "Use results to group learners or choose enrichment routes."]), "timer")}
      ${card("Teacher Notes", list(["Low score on bonding or polarity: revisit the Mission 1 review on chemical bonding and molecular representations.", "Low score on inter/intra: start with the thread-and-Velcro tactile analogy.", "Low score on properties: use Mission 3 flashcards before the Mission Clearance Test."]), "sticky-note")}
      ${card("Item Analysis Snapshot", "<p>Competency 20: items 1-5<br>Competency 21: items 6-10<br>Competency 22: items 11-15</p>", "bar-chart-3")}
    </div>
    ${exemplarBox("Before Starting", "This Readiness Assessment is a map, not a judgment. It helps us see which clues we already know and which clues we still need to investigate.", "Use calm language so learners do not treat the Readiness Assessment as a high-stakes exam.")}
  `;
}

function missionGuide(title, competency, studentFocus, rows, script, misconceptions) {
  return `
    ${pageHead(title, `${title} Lesson Exemplar`, `Parallel teacher guide for ${competency}. Student focus: ${studentFocus}`)}
    <div class="grid three">
      ${card("Use This in Class", list(["Start with the learner-facing case file.", "Pause after the visual evidence.", "Let learners answer before confirming the concept.", "Close with the investigator conclusion prompt."]), "presentation")}
      ${card("Teacher Preparation", list(["Open the matching student mission page.", "Prepare diagrams or tactile materials.", "Check video/reference availability.", "Prepare guiding questions and corrective prompts."]), "clipboard-check")}
      ${card("Evidence to Collect", list(["One learner prediction.", "One activity output or response.", "One wrap-up answer.", "One misconception or support note."]), "file-check-2")}
    </div>
    <article class="card">
      <h2>Step-by-Step Lesson Flow</h2>
      ${teacherStepTable(rows)}
    </article>
    <div class="grid two">
      ${exemplarBox("Teacher Script", script, "Read naturally and adjust to the learners' language level. Ask first, explain after evidence is visible.")}
      ${card("Misconception Clinic", list(misconceptions), "search-check")}
      ${card("Differentiation Options", list(["Visual route: diagrams, flashcards, and 3D model views.", "Kinesthetic route: tactile lab and improvised molecular kit.", "Text route: PEEL case study.", "Game route: instant-feedback formative assessment."]), "users-round")}
      ${card("Quick Check", list(["Ask one evidence-based explanation.", "Connect the molecular clue to the observable property.", "Record one learner misconception for follow-up.", "Direct learners to the next suggested toolkit activity."]), "check-circle-2")}
    </div>
  `;
}

function mission1Guide() {
  return missionGuide(
    "Mission 1",
    "Competency 20: The learners use diagrams to differentiate intermolecular forces from intramolecular forces.",
    "Forces Within and Between Molecules",
    [
      ["Target", "Show the competency and ask learners what the words inter and intra might mean.", "Learners predict inside vs. between."],
      ["Case File", "Use boiling water or steam as the context.", "Learners identify that H2O remains H2O."],
      ["Diagram", "Compare covalent bonds inside H2O with dotted attractions between molecules.", "Learners label intramolecular and intermolecular forces."],
      ["Investigation", "Send learners to E-nquiry or Tactile Lab.", "Learners model strong bonds and weaker attractions."],
      ["Evidence Check", "Ask what changes during boiling.", "Learners explain that attractions between molecules are overcome."]
    ],
    "When water boils, do the atoms inside each water molecule separate, or do water molecules separate from other water molecules? Let us use the diagram as evidence.",
    ["If learners say boiling breaks O-H bonds, ask: Is the vapor still water?", "If learners confuse inter and intra, return to the prefix clue.", "If learners think all forces are equally strong, compare bond sticks with yarn or Velcro."]
  );
}

function mission2Guide() {
  return missionGuide(
    "Mission 2",
    "Competency 21: The learners describe London dispersion forces, dipole-dipole forces, and hydrogen bonding.",
    "Types of Intermolecular Forces",
    [
      ["Review", "Check covalent bonding, polarity, and molecular shape.", "Learners identify polar and nonpolar examples."],
      ["Case File", "Compare CH4, HCl, H2O, NH3, HF, CO2, and ethanol.", "Learners use formula and structure clues."],
      ["Decision Chart", "Ask: Is the molecule polar? Is H bonded to N, O, or F?", "Learners classify IMF type."],
      ["Investigation", "Use IMF decision game or model-based practice.", "Learners practice across formula, 2D, and 3D models."],
      ["Evidence Check", "Rank IMF strength for the mission examples.", "Learners justify with polarity and hydrogen-bonding clues."]
    ],
    "Before we name the force, let us follow the evidence path: shape, polarity, then special hydrogen-bonding clue.",
    ["If learners say every H creates hydrogen bonding, ask: What atom is H directly bonded to?", "If learners say nonpolar molecules have no IMF, ask about temporary dipoles.", "If learners confuse bond polarity and molecular polarity, rotate or draw the model."]
  );
}

function mission3Guide() {
  return missionGuide(
    "Mission 3",
    "Competency 22: The learners explain the effects of intermolecular forces on liquid properties.",
    "IMF Effects on Physical Properties",
    [
      ["Review", "Start with the strength trend: LDF < dipole-dipole < hydrogen bonding.", "Learners recall IMF strength order."],
      ["Case File", "Use cooking, sanitizer evaporation, water droplets, or syrup flow.", "Learners connect daily observations to molecular attraction."],
      ["Property Cards", "Define boiling point, melting point, viscosity, surface tension, and vapor pressure.", "Learners match property to description."],
      ["Trend Check", "Ask what happens when IMF gets stronger.", "Learners state increase/decrease trends with reasoning."],
      ["Evidence Check", "Require because statements.", "Learners explain using energy and particle attraction."]
    ],
    "A property is an observable clue. Our job is to explain what invisible molecular attraction caused that clue.",
    ["If learners say stronger IMF increases vapor pressure, ask whether particles escape more easily or less easily.", "If learners confuse viscosity and density, ask which one means resistance to flow.", "If learners memorize trends without reason, ask about energy needed to separate particles."]
  );
}

function posttestGuide() {
  return `
    ${pageHead("Mission Clearance Test", "Summative Assessment Guide", "Parallel to the student Mission Clearance Test page. Use this after all three missions and enrichment routes.")}
    <div class="grid two">
      ${card("Administration", list(["Give after Mission 3 wrap-up.", "Allow learners to use their notes only if the class design permits it.", "Record scores with Readiness Assessment comparison.", "Use missed items for remediation grouping."]), "file-check-2")}
      ${card("Interpretation Guide", list(["12-15: ready for enrichment or certificate pathway.", "9-11: review missed competency and give targeted activity.", "6-8: teacher-guided remediation.", "0-5: repeat key diagrams and tactile model support."]), "bar-chart-3")}
    </div>
    <article class="card">
      <h2>Mission Clearance Test Evidence Table</h2>
      ${teacherStepTable([
        ["Competency 20", "Check diagram interpretation items.", "Learners correctly distinguish bonds inside molecules from attractions between molecules."],
        ["Competency 21", "Check IMF identification items.", "Learners classify LDF, dipole-dipole, and hydrogen bonding."],
        ["Competency 22", "Check property trend explanation items.", "Learners explain trends using IMF strength and energy."]
      ])}
    </article>
  `;
}

function clearanceGuide() {
  return `
    ${pageHead("Mission Clearance", "Exit Ticket and Reflection Guide", "Parallel to the student Mission Clearance page. Use learner responses as feedback for instruction and research reflection.")}
    <div class="grid two">
      ${card("Exit Ticket Format", list(["3 things learned", "2 questions still in mind", "1 question to explore next", "MOLECULINK experience rating", "Most helpful activity"]), "ticket-check")}
      ${card("How Teachers Use the Data", list(["Identify topics needing reteaching.", "Find which differentiated route helped learners most.", "Collect reflection evidence for pilot testing.", "Recommend remediation or enrichment."]), "clipboard-check")}
      ${card("Feedback Prompts", list(["Which molecular clue helped you most?", "Which activity made the invisible easier to understand?", "What question should we revisit before the next lesson?"]), "message-square")}
      ${card("Certificate Readiness", list(["Readiness Assessment completed", "All missions attempted", "Mission Clearance Test submitted", "Mission Clearance submitted", "Badge criteria met"]), "award")}
    </div>
  `;
}

function teacherReferences() {
  return `
    ${pageHead("References", "Teacher Reference Shelf", "Parallel to the student References page, with APA-style sources and curriculum anchors for lesson justification.")}
    <div class="grid two">
      ${card("Chemistry References", list(["OpenStax Chemistry 2e: Intermolecular forces", "Lumen Learning: Intermolecular Forces", "Florida State University ChemLab: Intermolecular Forces", "Brown, LeMay, Bursten, Murphy, Woodward, and Stoltzfus: Chemistry: The Central Science", "Tro: Chemistry: A Molecular Approach"]), "book-open")}
      ${card("Curriculum References", list(["DepEd K to 12 Science Curriculum Guide", "SHS Physical Science Curriculum Guide", "DepEd strengthened SHS curriculum references", "MOLECULINK pilot testing documentation"]), "landmark")}
      ${card("Photo and Video Credits", list(["Inter vs. intra diagram references", "IMF decision chart references", "Tactile model reference", "Mission 1 and Mission 2 local videos", "Alternative YouTube support links"]), "image")}
      ${card("Teacher Use Note", "<p>References support lesson planning, content accuracy, and research documentation. They should not replace the learner-friendly explanation inside each mission.</p>", "info")}
    </div>
  `;
}

function assessmentCenter() {
  const sections = [
    ["Diagnostic Assessment", ["Use before Mission 1.", "Identify readiness in bonding, polarity, and IMF trends.", "Treat results as planning evidence, not learner failure.", "Use low areas to assign review routes."]],
    ["Formative Assessment", ["Use mission wrap-up checks.", "Use games for low-stakes practice.", "Give immediate feedback after each choice.", "Record common misconceptions for reteaching."]],
    ["Summative Assessment", ["Use after Mission 3.", "Compare Mission Clearance Test patterns with Readiness Assessment readiness.", "Review missed items by competency.", "Use results for enrichment or remediation grouping."]],
    ["Reflection Evidence", ["Use Mission Clearance responses.", "Look for learner confidence and remaining questions.", "Identify which activity route helped most.", "Use feedback to improve pilot implementation."]]
  ];
  return `
    ${pageHead("Assessment Kit", "Assessment and Evidence Guide", "Use this kit to collect learning evidence without making the lesson feel test-heavy.")}
    <div class="grid two">${sections.map(([title, items]) => card(title, list(items), "clipboard-check")).join("")}</div>
    <article class="card">
      <h2>Table of Specifications Snapshot</h2>
      <table class="table"><thead><tr><th>Competency</th><th>Assessment Focus</th><th>Suggested Items</th><th>Evidence</th></tr></thead><tbody>
      <tr><td>Competency 20</td><td>Inter vs. intramolecular forces</td><td>1-5</td><td>Diagram explanation and Mission 1 check</td></tr>
      <tr><td>Competency 21</td><td>Types of intermolecular forces</td><td>6-10</td><td>Decision chart and IMF identification</td></tr>
      <tr><td>Competency 22</td><td>Effects on liquid properties</td><td>11-15</td><td>Trend reasoning and real-life application</td></tr>
      </tbody></table>
    </article>
    <div class="grid two">
      <article class="card"><h2>Class Evidence</h2>${barChart(data.learners.map(item => [item.id, item.progress]))}</article>
      <article class="card"><h2>Badge Evidence</h2>${barChart(data.learners.map(item => [item.id, item.badges * 12]))}</article>
    </div>
  `;
}

function missionGuideCard(title, competency, body) {
  const items = ["Learning objectives", "Teacher preparation", "Estimated duration", "Required materials", "Facilitator guide", "Teacher script", "Expected learner responses", "Guiding questions", "Checkpoint questions", "Facilitator notes", "Improvisation tips", "Alternative activities", "Safety reminders", "Differentiation strategies", "Expected misconceptions", "Corrective questioning", "Assessment opportunities", "Reflection prompts", "Closure guide"];
  return card(title, `<span class="pill">${competency}</span><p>${body}</p>${list(items)}`, "map");
}

function teacherMissions() {
  return `
    ${pageHead("Missions", "Facilitator Guides for Student Missions", "Each guide mirrors the student mission and gives the teacher scripts, preparation notes, assessment prompts, and intervention options.")}
    <div class="grid three">
      ${missionGuideCard("Mission 1: Forces Within and Between Molecules", "Competency 20", "Use diagrams and tactile models to distinguish bonds inside molecules from attractions between separate molecules.")}
      ${missionGuideCard("Mission 2: Types of Intermolecular Forces", "Competency 21", "Guide learners through London dispersion forces, dipole-dipole forces, and hydrogen bonding using polarity and structure clues.")}
      ${missionGuideCard("Mission 3: IMF and Physical Properties", "Competency 22", "Help learners explain boiling point, melting point, surface tension, vapor pressure, and viscosity using IMF strength.")}
    </div>
  `;
}

function rubric(title) {
  return `
    <article class="card">
      <h2>${title}</h2>
      <table class="table compact-table">
        <thead><tr><th>Level</th><th>Descriptor</th><th>Teacher Comments</th></tr></thead>
        <tbody>
          <tr><td>4 - Advanced</td><td>Accurate, complete, evidence-based, and clearly connected to molecular behavior.</td><td>Extend with challenge case.</td></tr>
          <tr><td>3 - Proficient</td><td>Mostly accurate with minor gaps in reasoning or vocabulary.</td><td>Reinforce using a quick prompt.</td></tr>
          <tr><td>2 - Developing</td><td>Shows partial understanding but needs clearer evidence or concept connection.</td><td>Provide guided correction.</td></tr>
          <tr><td>1 - Beginning</td><td>Response is incomplete or shows a major misconception.</td><td>Use remediation activity.</td></tr>
        </tbody>
      </table>
    </article>
  `;
}

function teacherToolkit() {
  const resources = [
    ["Visual Learners", ["Use diagrams, flashcards, 3D models, and formula-to-model matching.", "Ask learners to point to the clue before answering."]],
    ["Kinesthetic Learners", ["Use tactile molecular kits, Velcro, strings, or improvised bond markers.", "Ask learners to physically separate bonds within molecules from attractions between molecules."]],
    ["Text-Route Learners", ["Use PEEL case studies with three possible conclusions.", "Ask learners to justify the chosen conclusion with evidence."]],
    ["Game-Based Learners", ["Use ranking games and property-description games as formative checks.", "Give immediate feedback and let learners retry."]],
    ["Learners Needing Support", ["Return to prefix clues: intra means within, inter means between.", "Use one property at a time before comparing all trends."]],
    ["Advanced Learners", ["Ask learners to explain a new everyday phenomenon using IMF strength.", "Let learners design an analogy or mini-case."]]
  ];
  const rubrics = ["Tactile molecular model", "Guided inquiry worksheet", "Simulation investigation", "Scientific explanation", "Reflection journal", "Group collaboration", "Presentation"];
  return `
    ${pageHead("Differentiation Toolkit", "Support for Diverse Learners", "Choose a route based on what learners need: visual, tactile, text-based, game-based, remediation, or enrichment.")}
    <div class="grid three">${resources.map(([title, items]) => card(title, list(items), "wrench")).join("")}</div>
    <div class="section-divider"><h2>Analytical Rubrics</h2><p>Each rubric uses four performance levels with descriptors, scoring guidance, and space for teacher comments.</p></div>
    <div class="grid two">${rubrics.map(rubric).join("")}</div>
  `;
}

function teacherDownloads() {
  const downloads = ["Daily Mission Exemplar", "Mission 1 Guide", "Mission 2 Guide", "Mission 3 Guide", "Tactile Lab Sheet", "Misconception Clinic", "Readiness Assessment Guide", "Mission Clearance Test Guide", "Mission Debrief Summary", "Observation Checklist", "Rubric Pack", "Detective Record Template"];
  return `
    ${pageHead("Printables", "Teacher Printables and Templates", "Prepare class-ready materials for facilitation, assessment, reporting, and pilot documentation.")}
    <div class="grid three">${downloads.map(item => card(item, `<p>Prepare this file for classroom use or pilot documentation.</p><button class="secondary" data-download="${item}">Prepare File</button>`, "download")).join("")}</div>
    <pre id="download-status" class="output-box">Prepared files will appear here.</pre>
  `;
}

function adminHome() {
  const learners = getLiveLearners();
  const pretest = average(learners.filter(item => item.pretest !== null && item.pretest !== undefined).map(item => item.pretest));
  const posttest = average(learners.filter(item => item.posttest !== null && item.posttest !== undefined).map(item => item.posttest));
  const completion = average(learners.map(item => item.progress));
  return `
    ${pageHead("Administrator Home", "Pilot Testing Administration", "Manage schools, teachers, accounts, activities, badges, certificates, research dashboard data, exports, and backups.")}
    <div class="grid four">
      <div class="mini-stat"><span>Schools</span><strong>${data.schools.length}</strong></div>
      <div class="mini-stat"><span>Learners</span><strong>${learners.length}</strong></div>
      <div class="mini-stat"><span>Teachers</span><strong>${data.teachers?.length || 0}</strong></div>
      <div class="mini-stat"><span>Certificates</span><strong>${learners.filter(item => item.certificate).length}</strong></div>
    </div>
    <div class="grid two">
      ${card("System Priorities", list(["Verify school and section assignments.", "Generate IDs and passwords before implementation.", "Monitor completion and certificate release.", "Export de-identified research data after pilot runs."]), "settings")}
      ${card("Research Dashboard Summary", `<p>Average readiness: <b>${pretest === null ? "No data" : `${pretest}/15`}</b></p><p>Average clearance: <b>${posttest === null ? "No data" : `${posttest}/15`}</b></p><p>Average completion: <b>${displayMetric(completion, "%")}</b></p>`, "bar-chart-3")}
      ${card("Pilot Data Controls", `<p>Reset local pilot records on this device only. This clears active learner, progress records, teacher assessment records, and locally collected learner records.</p><button class="danger-button" id="reset-pilot-data" type="button">${icon("rotate-ccw")} Reset Pilot Data</button><p id="admin-reset-status" class="help">Only administrators can see this control.</p>`, "database")}
    </div>
  `;
}

function adminSection(title, intro, items, iconName = "settings") {
  const descriptions = {
    "School Profiles": "Register partner schools and record authorized implementation contacts.",
    "Section Lists": "Organize learners by grade level, section, teacher, and schedule.",
    "Curriculum Tracks": "Tag each class by Physical Science, General Chemistry, or strengthened SHS alignment.",
    "Implementation Schedules": "Set pilot dates, class windows, and assessment deadlines.",
    "Teacher Records": "Maintain teacher names, roles, assigned schools, and contact details.",
    "Assigned Sections": "Match teachers with sections for monitoring and classroom support.",
    "Teacher Access Codes": "Prepare secure teacher access credentials for authorized users.",
    "Facilitator Roles": "Define who may view lessons, analytics, exports, and certificates.",
    "Mission Availability": "Open or close missions according to the agreed implementation schedule.",
    "E-nquiry Activities": "Manage visual and interactive enrichment activities aligned with the missions.",
    "Tactile Lab Tasks": "Organize hands-on activity instructions, safety reminders, and material lists.",
    "Games and Assessments": "Check formative activities and assessment routes before class use.",
    "Exit Ticket Forms": "Review mission clearance prompts and feedback categories.",
    "Badge Criteria": "Set the activity requirements for visual, kinesthetic, strategic, and completion badges.",
    "Certificate Templates": "Manage certificate wording, completion labels, and release format.",
    "Completion Rules": "Define which required tasks must be completed before a learner is cleared.",
    "Release Logs": "Track when certificates and badges are released after validation."
  };
  return `${pageHead("Administrator Portal", title, intro)}<div class="grid three">${items.map(item => card(item, `<p>${descriptions[item] || "Manage authorized records for this part of the pilot implementation."}</p>`, iconName)).join("")}</div>`;
}

function studentAccounts() {
  return `
    ${pageHead("Administrator Portal", "Generate Student IDs and Passwords", "Create the fixed pilot access credentials for 100 learners.")}
    <div class="grid two">
      <article class="card login-card">
        <h2>Generate Credentials</h2>
        <label>Quantity <input id="student-count" value="100" type="number" min="1" max="100"></label>
        <button class="primary" id="generate-ids" type="button">Generate Student IDs and Passwords</button>
      </article>
      <pre id="admin-output" class="output-box">Generated IDs and admin actions will appear here.</pre>
    </div>
  `;
}

function systemAnalytics() {
  const learners = getLiveLearners();
  const difficult = {};
  learners.forEach(item => difficult[item.misconception] = (difficult[item.misconception] || 0) + 1);
  return `
    ${pageHead("Administrator Portal", "Research Dashboard", "Review system-wide completion, misconception patterns, badge distribution, certificate completion, and pilot-testing evidence.")}
    <div class="grid two">
      <article class="card"><h2>Completion by Learner</h2>${barChart(learners.map(item => [item.id, item.progress]))}</article>
      <article class="card"><h2>Misconception Frequency</h2>${barChart(Object.entries(difficult).map(([key, value]) => [key, value * 25]))}</article>
    </div>
    ${learnerTable()}
  `;
}

function exportBackup() {
  return `
    ${pageHead("Administrator Portal", "Export Data and Backup Database", "Prepare CSV reports, de-identified research files, certificate lists, and backup records.")}
    <div class="grid three">
      ${["Export Research CSV", "Export Detective Records", "Export Certificate List", "Backup Database", "Download Badge Records", "Archive Pilot Run"].map(item => card(item, `<p>Prepare ${item.toLowerCase()} for authorized administrators and researchers.</p><button class="secondary" data-download="${item}">Prepare Export</button>`, "database-backup")).join("")}
    </div>
  `;
}

function renderTeacherPortal() {
  const sections = {
    "teacher-home": teacherHome,
    "teacher-welcome": teacherWelcome,
    "our-profile": ourProfile,
    "teacher-briefing": teacherBriefing,
    "pretest-guide": pretestGuide,
    "assessment-center": assessmentCenter,
    "mission-1-guide": mission1Guide,
    "mission-2-guide": mission2Guide,
    "mission-3-guide": mission3Guide,
    "teacher-toolkit": teacherToolkit,
    "posttest-guide": posttestGuide,
    "clearance-guide": clearanceGuide,
    "teacher-references": teacherReferences,
    "teacher-downloads": teacherDownloads
  };
  Object.entries(sections).forEach(([id, renderer]) => {
    document.getElementById(id).innerHTML = renderer();
  });
}

function updateLiveMonitor(filter = "all") {
  const output = document.getElementById("live-monitor-output");
  if (!output) return;
  const liveLearners = getLiveLearners();
  if (!liveLearners.length) {
    output.innerHTML = `<b>No learner records yet.</b>\n\nRealtime progress will appear here after authorized learner data is collected.`;
    return;
  }
  let learners = liveLearners;
  let heading = "All learners";
  if (filter === "support") {
    learners = liveLearners.filter(item => item.progress < 80 || (item.pretest !== null && item.pretest !== undefined && item.pretest < 10) || (item.posttest !== null && item.posttest !== undefined && item.posttest < 10));
    heading = "Learners needing support";
  }
  if (filter === "certificate") {
    learners = liveLearners.filter(item => item.certificate);
    heading = "Certificate-ready learners";
  }
  const timestamp = new Date().toLocaleString();
  output.innerHTML = `<b>${heading}</b>\nUpdated: ${timestamp}\n\n${learners.map(item => `${item.id} | ${item.section} | Progress ${item.progress}% | Readiness ${readinessScore(item)} | Mission Clearance Test ${item.posttest === null || item.posttest === undefined ? "Not taken" : `${item.posttest}/15`} | Focus: ${item.misconception}`).join("\n") || "No learners in this view."}`;
}

function renderAdminPortal() {
  const sections = {
    "admin-home": adminHome,
    "manage-schools": () => adminSection("Manage Schools", "Register pilot schools, sections, and implementation groups.", ["School Profiles", "Section Lists", "Curriculum Tracks", "Implementation Schedules"], "school"),
    "manage-teachers": () => adminSection("Manage Teachers", "Register teachers, assign sections, and manage teacher access.", ["Teacher Records", "Assigned Sections", "Teacher Access Codes", "Facilitator Roles"], "users"),
    "student-accounts": studentAccounts,
    "manage-activities": () => adminSection("Manage Activities", "Organize MOLECULINK missions, enrichment activities, Mission Clearance Tests, and exit tickets.", ["Mission Availability", "E-nquiry Activities", "Tactile Lab Tasks", "Games and Assessments", "Exit Ticket Forms"], "list-checks"),
    "certificates-badges": () => adminSection("Manage Certificates and Badges", "Control badge criteria, certificate completion, and release status.", ["Badge Criteria", "Certificate Templates", "Completion Rules", "Release Logs"], "award"),
    "system-analytics": systemAnalytics,
    "export-backup": exportBackup
  };
  Object.entries(sections).forEach(([id, renderer]) => {
    document.getElementById(id).innerHTML = renderer();
  });
}

function generateIds() {
  const count = Math.min(Math.max(Number(document.getElementById("student-count").value || STUDENT_ACCOUNT_COUNT), 1), STUDENT_ACCOUNT_COUNT);
  const rows = credentials.students.slice(0, count).map(account => `${account.id} | Password: ${account.password}`);
  document.getElementById("admin-output").textContent = rows.join("\n");
}

function resetPilotData() {
  const confirmed = window.confirm("Reset pilot data stored on this device? This will clear local learner progress, assessment records, and the active learner profile.");
  if (!confirmed) return;
  [
    "moleculink_current_student_id",
    "moleculink_active_learner_profile",
    "moleculink_active_portal",
    "moleculink_pilot_learner_records",
    "moleculink_teacher_assessment_records"
  ].forEach(key => localStorage.removeItem(key));
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("moleculink_progress_")) localStorage.removeItem(key);
  });
  renderTeacherPortal();
  renderAdminPortal();
  activateTab("admin", "admin-home");
  setLoginStatus("admin-reset-status", `Pilot data reset completed on ${new Date().toLocaleString()}.`, "success");
}

function openStudentVersion() {
  const profile = JSON.parse(localStorage.getItem("moleculink_active_learner_profile") || "null");
  if (profile?.studentId) {
    redirectToStudentApp(profile);
    return;
  }
  activateRoute("student-login");
}

function exportPilotCsv() {
  const learners = getLiveLearners();
  const header = "student_id,school,section,progress,readiness_score,readiness_total,readiness_status,posttest,badges,certificate,focus_area";
  const rows = learners.map(item => [item.id, item.school, item.section, item.progress, item.pretest ?? "", item.pretestTotal || 15, item.readinessStatus || "", item.posttest ?? "", item.badges, item.certificate, `"${String(item.misconception || "").replace(/"/g, '""')}"`].join(","));
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "moleculink-pilot-data.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function prepareDownload(label) {
  if (label.toLowerCase().includes("csv") || label.toLowerCase().includes("progress")) {
    exportPilotCsv();
  }
  const outputs = [document.getElementById("download-status"), document.getElementById("admin-output")].filter(Boolean);
  outputs.forEach(output => {
    output.textContent = `${label} prepared.\n\nIncluded learner records: ${getLiveLearners().length}\nGenerated: ${new Date().toLocaleString()}\n\nOnly collected pilot records are included.`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderTeacherPortal();
  renderAdminPortal();
  updateLiveMonitor("all");

  document.body.addEventListener("click", event => {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) activateRoute(routeButton.dataset.route);

    const teacherTab = event.target.closest("[data-teacher-tab]");
    if (teacherTab) activateTab("teacher", teacherTab.dataset.teacherTab);

    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab) activateTab("admin", adminTab.dataset.adminTab);

    const download = event.target.closest("[data-download]");
    if (download) {
      prepareDownload(download.dataset.download);
    }

    const liveFilter = event.target.closest("[data-live-filter]");
    if (liveFilter) updateLiveMonitor(liveFilter.dataset.liveFilter);
  });

  document.getElementById("student-login-button").addEventListener("click", authenticateStudent);
  document.getElementById("teacher-login-button").addEventListener("click", authenticateTeacher);
  document.getElementById("admin-login-button").addEventListener("click", authenticateAdmin);
  document.getElementById("open-student-app").addEventListener("click", openStudentVersion);
  document.getElementById("student-logout-button").addEventListener("click", () => logoutTo("student", "student-login"));
  document.getElementById("teacher-logout-button").addEventListener("click", () => logoutTo("teacher", "teacher-login"));
  document.getElementById("teacher-logout-tab-button").addEventListener("click", () => logoutTo("teacher", "teacher-login"));
  document.getElementById("admin-logout-button").addEventListener("click", () => logoutTo("admin", "admin-login"));
  document.addEventListener("click", event => {
    if (event.target?.id === "generate-ids") generateIds();
    if (event.target?.id === "reset-pilot-data" || event.target?.closest("#reset-pilot-data")) resetPilotData();
  });

  let initialRoute = window.location.hash.replace("#", "");
  if (initialRoute === "teacher") initialRoute = "teacher-login";
  if (initialRoute === "admin") initialRoute = "admin-login";
  if (initialRoute === "student") initialRoute = "student-login";
  activateRoute(routes.includes(initialRoute) ? initialRoute : "landing");
  if (window.lucide) lucide.createIcons();
});

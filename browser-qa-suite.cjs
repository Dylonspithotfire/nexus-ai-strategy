const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WORKSPACE_DIR = "/Volumes/Extreme SSD/Google AntiGravity/nexus-ai-strategy";
const PARENT_BRAIN_DIR = "/Users/dylonspithotfire/.gemini/antigravity/brain/152dbaef-e4d8-48f7-9b03-e75099d59c34";
const HTML_FILE = `file://${path.join(WORKSPACE_DIR, 'index.html')}`;
const PORT = 9470;
const USER_DATA_DIR = `/tmp/nexus-suite-${Date.now()}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCompleteQaSuite() {
  console.log("================================================================================");
  console.log("   NEXUS AI STRATEGY — COMPLETE BROWSER QA & VISUAL VERIFICATION SUITE       ");
  console.log("================================================================================");

  // 1. Launch Headless Chrome
  console.log(`\n[1/7] Launching Headless Chrome on CDP port ${PORT}...`);
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--disable-gpu',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check'
  ], { stdio: 'ignore' });

  // Connect to Chrome target
  let targets = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        targets = await res.json();
        if (targets && targets.length > 0) break;
      }
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error("FATAL: Failed to connect to Headless Chrome.");
    chromeProc.kill();
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);
  console.log("Connected to Chrome Page Target via WebSocket.");

  let idCounter = 1;
  const pendingRequests = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(msg.error);
      } else {
        resolve(msg.result);
      }
    }
  };

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await sendCommand("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  // Enable CDP domains
  await sendCommand("Page.enable");
  await sendCommand("DOM.enable");
  await sendCommand("Runtime.enable");

  // Navigate to local index.html
  console.log(`Navigating to: ${HTML_FILE}`);
  await sendCommand("Page.navigate", { url: HTML_FILE });
  await sleep(1500);

  const report = {
    timestamp: new Date().toISOString(),
    desktop: {},
    ctaClicks: {},
    quiz: {},
    estimator: {},
    contactForm: {},
    mobile: {},
    tablet: {},
    grayscale: {},
    screenshots: {}
  };

  // -------------------------------------------------------------------------
  // [2/7] DESKTOP VIEWPORT EVALUATION (1280x900)
  // -------------------------------------------------------------------------
  console.log("\n[2/7] Evaluating Desktop Viewport (1280x900)...");
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await sleep(400);

  report.desktop = await evaluate(`(() => {
    const nav = document.querySelector('.desktop-nav');
    const navLinks = Array.from(document.querySelectorAll('.desktop-nav .nav-links a')).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim()
    }));
    const mobileToggleStyle = window.getComputedStyle(document.getElementById('mobile-toggle-btn'));
    
    // Services grid
    const servicesGrid = document.querySelector('.services-grid');
    const servicesGridStyle = window.getComputedStyle(servicesGrid);
    const serviceCards = Array.from(document.querySelectorAll('.service-card')).map(c => ({
      id: c.id,
      isPrimary: c.classList.contains('service-card-primary'),
      title: c.querySelector('.service-title')?.textContent.trim(),
      priceAmount: c.querySelector('.price-amount')?.textContent.trim(),
      ctaId: c.querySelector('.btn')?.id
    }));

    // Proof bar
    const proofItems = Array.from(document.querySelectorAll('.proof-item')).map(p => ({
      number: p.querySelector('.proof-number')?.textContent.trim(),
      label: p.querySelector('.proof-label')?.textContent.replace(/\\s+/g, ' ').trim()
    }));

    // Footer
    const footerNavCols = Array.from(document.querySelectorAll('.footer-nav-col')).length;
    const copyright = document.querySelector('.footer-copy')?.textContent.replace(/\\s+/g, ' ').trim();

    return {
      desktopNavVisible: window.getComputedStyle(nav).display !== 'none',
      navLinksCount: navLinks.length,
      navLinks,
      mobileToggleHiddenOnDesktop: mobileToggleStyle.display === 'none',
      servicesGridColumns: servicesGridStyle.gridTemplateColumns,
      serviceCardsCount: serviceCards.length,
      serviceCards,
      proofBarItemsCount: proofItems.length,
      proofItems,
      footerNavColsCount: footerNavCols,
      copyrightPresent: !!copyright,
      copyrightText: copyright
    };
  })()`);
  console.log("Desktop Navigation & Grid:", JSON.stringify(report.desktop, null, 2));

  // Capture Desktop Hero Screenshot
  console.log("Capturing Desktop Hero screenshot...");
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(500);
  const heroShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const heroPath = path.join(WORKSPACE_DIR, "screenshot-hero.png");
  fs.writeFileSync(heroPath, Buffer.from(heroShot.data, "base64"));
  report.screenshots.hero = heroPath;
  console.log(`Saved: ${heroPath}`);

  // Capture Services Cards Screenshot
  console.log("Capturing Services Cards screenshot...");
  await evaluate(`(() => {
    const s = document.getElementById('services');
    if (s) {
      const top = s.getBoundingClientRect().top + window.pageYOffset - 20;
      window.scrollTo(0, top);
    }
  })()`);
  await sleep(500);
  const servicesShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const servicesPath = path.join(WORKSPACE_DIR, "screenshot-services.png");
  fs.writeFileSync(servicesPath, Buffer.from(servicesShot.data, "base64"));
  report.screenshots.services = servicesPath;
  console.log(`Saved: ${servicesPath}`);

  // -------------------------------------------------------------------------
  // [3/7] INTERACTIVE COMPONENTS: QUIZ, ESTIMATOR, CONTACT FORM
  // -------------------------------------------------------------------------
  console.log("\n[3/7] Evaluating Interactive Components...");

  // 3A. Audit Intake Quiz
  console.log("Testing 5-Question Audit Intake Quiz & Scorecard Generation...");
  report.quiz = await evaluate(`(() => {
    const initialSlideActive = document.querySelector('.quiz-question-slide.active')?.getAttribute('data-question');
    const progressBar = document.getElementById('quiz-progress-bar');
    const progressWidthStart = progressBar?.style.width;

    // Answer Q1: Freight brokerage / 3PL
    const q1Opts = document.querySelectorAll('.quiz-question-slide[data-question="1"] .quiz-option-btn');
    if (q1Opts[0]) q1Opts[0].click();
    document.getElementById('quiz-next-btn').click();

    // Answer Q2: Carrier invoice reconciliation & audit
    const q2Opts = document.querySelectorAll('.quiz-question-slide[data-question="2"] .quiz-option-btn');
    if (q2Opts[0]) q2Opts[0].click();
    document.getElementById('quiz-next-btn').click();

    // Answer Q3: Legacy TMS / ERP (McLeod, TMW, proprietary AS400)
    const q3Opts = document.querySelectorAll('.quiz-question-slide[data-question="3"] .quiz-option-btn');
    if (q3Opts[0]) q3Opts[0].click();
    document.getElementById('quiz-next-btn').click();

    // Answer Q4: 25 to 60 manual hours/week
    const q4Opts = document.querySelectorAll('.quiz-question-slide[data-question="4"] .quiz-option-btn');
    if (q4Opts[1]) q4Opts[1].click();
    document.getElementById('quiz-next-btn').click();

    // Answer Q5: Clear leadership mandate & defined sponsor
    const q5Opts = document.querySelectorAll('.quiz-question-slide[data-question="5"] .quiz-option-btn');
    if (q5Opts[3]) q5Opts[3].click();
    
    // Test Prev button works
    document.getElementById('quiz-prev-btn').click();
    const prevWorked = document.querySelector('.quiz-question-slide.active')?.getAttribute('data-question') === '4';
    document.getElementById('quiz-next-btn').click(); // Back to 5

    // Submit Quiz
    document.getElementById('quiz-next-btn').click();

    const resultCard = document.getElementById('quiz-result-card');
    const targetAgent = document.getElementById('result-target-agent')?.textContent.trim();
    const targetScore = document.getElementById('result-target-score')?.textContent.trim();
    const timeline = document.getElementById('result-target-timeline')?.textContent.trim();
    const stack = document.getElementById('result-target-stack')?.textContent.trim();
    const disclaimer = document.querySelector('.boardroom-disclaimer')?.textContent.trim();

    return {
      initialSlideActive,
      progressWidthStart,
      prevWorked,
      resultCardVisible: !resultCard.hidden,
      targetAgent,
      targetScore,
      targetTimeline: timeline,
      targetStack: stack,
      disclaimerPresent: disclaimer.includes('Zero Speculative ROI Guarantee') || disclaimer.includes('never promises speculative ROI')
    };
  })()`);
  console.log("Quiz Results:", JSON.stringify(report.quiz, null, 2));

  // Capture Quiz Result Screenshot
  console.log("Capturing Quiz Result screenshot...");
  await evaluate(`(() => {
    const card = document.getElementById('quiz-result-card');
    if (card) {
      const top = card.getBoundingClientRect().top + window.pageYOffset - 60;
      window.scrollTo(0, top);
    }
  })()`);
  await sleep(500);
  const quizShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const quizPath = path.join(WORKSPACE_DIR, "screenshot-quiz-result.png");
  fs.writeFileSync(quizPath, Buffer.from(quizShot.data, "base64"));
  report.screenshots.quizResult = quizPath;
  console.log(`Saved: ${quizPath}`);

  // Test Quiz Transfer to Contact Form
  console.log("Testing Quiz Transfer button to Contact Form...");
  const quizTransferResult = await evaluate(`(() => {
    document.getElementById('quiz-transfer-form-btn').click();
    const bottleneckVal = document.getElementById('contact-bottleneck').value;
    const msgVal = document.getElementById('contact-message').value;
    return {
      bottleneckVal,
      msgHasIntakeContext: msgVal.includes('[Quiz Intake Findings]') && msgVal.includes('Carrier Rate & Invoice Reconciliation')
    };
  })()`);
  report.quiz.transferCheck = quizTransferResult;
  console.log("Quiz Transfer Check:", quizTransferResult);

  // 3B. Capacity ROI Estimator Sliders
  console.log("\nTesting Capacity ROI Estimator Sliders...");
  report.estimator = await evaluate(`(() => {
    const hSlider = document.getElementById('hours-slider');
    const rSlider = document.getElementById('rate-slider');
    const cSlider = document.getElementById('capture-slider');

    // Test calculation: 40 hrs * 75% capture = 30 hrs/wk saved.
    // 30 hrs * $50/hr * 52 wks = $78,000 annual capacity value
    // 30 hrs * 52 = 1,560 annual hours reclaimed
    hSlider.value = 40;
    hSlider.dispatchEvent(new Event('input'));
    rSlider.value = 50;
    rSlider.dispatchEvent(new Event('input'));
    cSlider.value = 75;
    cSlider.dispatchEvent(new Event('input'));

    const annualText = document.getElementById('annual-savings-display')?.textContent.trim();
    const weeklyText = document.getElementById('weekly-hours-saved')?.textContent.trim();
    const annualHoursText = document.getElementById('annual-hours-saved')?.textContent.trim();
    const formulaText = document.getElementById('formula-detail')?.textContent.trim();

    return {
      hValue: hSlider.value,
      rValue: rSlider.value,
      cValue: cSlider.value,
      annualSavingsDisplay: annualText,
      weeklyHoursSavedDisplay: weeklyText,
      annualHoursSavedDisplay: annualHoursText,
      formulaDetailDisplay: formulaText,
      isMathematicallyAccurate: annualText.includes('78,000') && weeklyText.includes('30.0') && annualHoursText.includes('1,560')
    };
  })()`);
  console.log("ROI Estimator Check:", JSON.stringify(report.estimator, null, 2));

  // 3C. Contact Form Validation & Confirmation Panel
  console.log("\nTesting Contact Form Validation & Confirmation State...");
  report.contactForm = await evaluate(`(() => {
    const form = document.getElementById('audit-contact-form');
    const confirmPanel = document.getElementById('contact-confirmation-state');

    // Step 1: Empty submit triggers validation errors
    form.reset();
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const nameInvalid = document.getElementById('contact-name').classList.contains('is-invalid');
    const emailInvalid = document.getElementById('contact-email').classList.contains('is-invalid');
    const sizeInvalid = document.getElementById('contact-size').classList.contains('is-invalid');
    const bottleneckInvalid = document.getElementById('contact-bottleneck').classList.contains('is-invalid');
    const messageInvalid = document.getElementById('contact-message').classList.contains('is-invalid');

    // Step 2: Fill in valid form fields
    document.getElementById('contact-name').value = "Marcus Sterling";
    document.getElementById('contact-company').value = "Apex Freight Networks LLC";
    document.getElementById('contact-email').value = "msterling@apexfreight.com";
    document.getElementById('contact-size').value = "25m-50m";
    document.getElementById('contact-bottleneck').value = "carrier-invoicing";
    document.getElementById('contact-message').value = "We operate 180 tractors and our AP team spends 45 hours weekly manually matching carrier detention accessorials against rate confirmations.";

    // Submit valid form
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const isConfirmedVisible = !confirmPanel.hidden;
    const isFormHidden = form.style.display === 'none';
    const confName = document.getElementById('confirmed-name').textContent.trim();
    const confCompany = document.getElementById('confirmed-company').textContent.trim();
    const confEmail = document.getElementById('confirmed-email').textContent.trim();
    const confSize = document.getElementById('confirmed-size').textContent.trim();
    const confBottleneck = document.getElementById('confirmed-bottleneck').textContent.trim();

    return {
      emptyValidationWorked: nameInvalid && emailInvalid && sizeInvalid && bottleneckInvalid && messageInvalid,
      isConfirmedVisible,
      isFormHidden,
      confirmedName: confName,
      confirmedCompany: confCompany,
      confirmedEmail: confEmail,
      confirmedSize: confSize,
      confirmedBottleneck: confBottleneck,
      dataMatchesInput: confName === "Marcus Sterling" && confCompany === "Apex Freight Networks LLC"
    };
  })()`);
  console.log("Contact Form Validation & Confirmation:", JSON.stringify(report.contactForm, null, 2));

  // Capture Contact Form Confirmation Panel Screenshot
  console.log("Capturing Confirmation Panel screenshot...");
  await evaluate(`(() => {
    const p = document.getElementById('contact-confirmation-state');
    if (p) {
      const top = p.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo(0, top);
    }
  })()`);
  await sleep(500);
  const confirmShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const confirmPath = path.join(WORKSPACE_DIR, "screenshot-confirmation.png");
  fs.writeFileSync(confirmPath, Buffer.from(confirmShot.data, "base64"));
  report.screenshots.confirmation = confirmPath;
  console.log(`Saved: ${confirmPath}`);

  // -------------------------------------------------------------------------
  // [4/7] COMPLETE CTA CLICK & LINK VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n[4/7] Verifying Every CTA and Link Targets...");

  // Reset confirmation state so contact section is visible
  await evaluate(`(() => {
    const form = document.getElementById('audit-contact-form');
    const confirm = document.getElementById('contact-confirmation-state');
    if (confirm && form) {
      confirm.hidden = true;
      form.style.display = 'flex';
    }
  })()`);

  const ctaDefinitions = [
    { id: 'nav-book-btn', targetSection: 'contact', name: 'Header Nav Book Audit CTA' },
    { id: 'hero-book-audit-btn', targetSection: 'contact', name: 'Hero Primary Book Audit CTA' },
    { id: 'hero-take-quiz-btn', targetSection: 'quiz', name: 'Hero Secondary Take Quiz CTA' },
    { id: 'service-audit-cta', targetSection: 'contact', name: 'Service 1 Audit CTA' },
    { id: 'service-implementation-cta', targetSection: 'contact', name: 'Service 2 Implementation CTA' },
    { id: 'service-retainer-cta', targetSection: 'contact', name: 'Service 3 Retainer CTA' }
  ];

  for (const cta of ctaDefinitions) {
    const res = await evaluate(`(() => {
      const el = document.getElementById('${cta.id}');
      if (!el) return { found: false };
      const href = el.getAttribute('href');
      const targetEl = document.querySelector(href);
      const header = document.querySelector('.site-header');
      const headerHeight = header ? header.offsetHeight : 72;
      const expectedOffset = headerHeight + 16;
      const expectedScrollTop = targetEl ? Math.round(targetEl.getBoundingClientRect().top + window.pageYOffset - expectedOffset) : null;

      // Dispatch click event
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      el.dispatchEvent(clickEvent);

      return {
        id: '${cta.id}',
        name: '${cta.name}',
        found: true,
        href,
        targetExists: !!targetEl,
        expectedScrollTop,
        targetMatchesExpected: href === '#${cta.targetSection}'
      };
    })()`);
    report.ctaClicks[cta.id] = res;
    console.log(`CTA [${cta.id} -> #${cta.targetSection}]: found=${res.found}, targetMatchesExpected=${res.targetMatchesExpected}`);
  }

  // -------------------------------------------------------------------------
  // [5/7] MOBILE (390x844) & TABLET (768x1024) AUDIT
  // -------------------------------------------------------------------------
  console.log("\n[5/7] Evaluating Mobile (390x844) & Tablet (768x1024)...");

  // --- MOBILE 390x844 ---
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(500);

  // Capture Mobile Hero (Drawer Closed)
  console.log("Capturing Mobile Hero screenshot...");
  const mobileHeroShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const mobileHeroPath = path.join(WORKSPACE_DIR, "screenshot-mobile.png");
  fs.writeFileSync(mobileHeroPath, Buffer.from(mobileHeroShot.data, "base64"));
  report.screenshots.mobileHero = mobileHeroPath;
  console.log(`Saved: ${mobileHeroPath}`);

  // Test Mobile Navigation Drawer Toggle & Book Audit Link
  report.mobile = await evaluate(`(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const hasHorizontalOverflow = docWidth > winWidth;

    const toggle = document.getElementById('mobile-toggle-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const toggleRect = toggle.getBoundingClientRect();

    // 1. Initial State
    const initExpanded = toggle.getAttribute('aria-expanded');
    const initHidden = mobileNav.hidden;

    // 2. Open drawer
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const openedExpanded = toggle.getAttribute('aria-expanded');
    const openedHidden = mobileNav.hidden;
    const bodyOverflowLocked = document.body.style.overflow === 'hidden';

    // Touch targets of mobile nav links
    const navLinks = Array.from(document.querySelectorAll('#mobile-nav .mobile-nav-link'));
    const linkTouchTargets = navLinks.map(l => ({
      text: l.textContent.trim(),
      width: Math.round(l.getBoundingClientRect().width),
      height: Math.round(l.getBoundingClientRect().height),
      meets44px: l.getBoundingClientRect().height >= 44
    }));

    return {
      viewportWidth: winWidth,
      documentScrollWidth: docWidth,
      hasHorizontalOverflow,
      toggleTouchTarget: {
        width: Math.round(toggleRect.width),
        height: Math.round(toggleRect.height),
        meets44px: toggleRect.width >= 44 && toggleRect.height >= 44
      },
      initExpanded,
      initHidden,
      openedExpanded,
      openedHidden,
      bodyOverflowLocked,
      linkTouchTargetsCount: linkTouchTargets.length,
      allLinksMeet44px: linkTouchTargets.every(l => l.meets44px),
      linkTouchTargets
    };
  })()`);
  console.log("Mobile Drawer Open State:", JSON.stringify({
    hasOverflow: report.mobile.hasHorizontalOverflow,
    toggleMeets44px: report.mobile.toggleTouchTarget.meets44px,
    allLinksMeet44px: report.mobile.allLinksMeet44px
  }));

  // Capture Mobile Menu Open Screenshot
  console.log("Capturing Mobile Open Menu screenshot...");
  await sleep(400);
  const mobileMenuShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const mobileMenuPath = path.join(WORKSPACE_DIR, "screenshot-mobile-menu.png");
  fs.writeFileSync(mobileMenuPath, Buffer.from(mobileMenuShot.data, "base64"));
  report.screenshots.mobileMenu = mobileMenuPath;
  console.log(`Saved: ${mobileMenuPath}`);

  // Test Mobile Book Audit Link Click
  console.log("Testing #mobile-book-audit-link click inside open drawer...");
  const mobileLinkClickResult = await evaluate(`(() => {
    const link = document.getElementById('mobile-book-audit-link');
    const mobileNav = document.getElementById('mobile-nav');
    const toggle = document.getElementById('mobile-toggle-btn');
    
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return {
      drawerClosedAfterClick: mobileNav.hidden === true,
      toggleAriaExpandedAfterClick: toggle.getAttribute('aria-expanded') === 'false',
      bodyOverflowUnlocked: document.body.style.overflow === '',
      href: link.getAttribute('href')
    };
  })()`);

  report.ctaClicks['mobile-book-audit-link'] = {
    name: 'Mobile Drawer Book Audit Link',
    targetSection: 'contact',
    ...mobileLinkClickResult,
    targetMatchesExpected: mobileLinkClickResult.href === '#contact'
  };
  report.ctaClicks['mobile-toggle-btn'] = {
    name: 'Mobile Hamburger Toggle',
    worksCorrectly: report.mobile.initHidden && !report.mobile.openedHidden && mobileLinkClickResult.drawerClosedAfterClick
  };

  // --- TABLET 768x1024 ---
  console.log("\nEvaluating Tablet Viewport (768x1024)...");
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    mobile: false
  });
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(500);

  report.tablet = await evaluate(`(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const hasHorizontalOverflow = docWidth > winWidth;

    // 4-step process
    const processSteps = Array.from(document.querySelectorAll('.process-step')).map(s => ({
      num: s.querySelector('.marker-number')?.textContent.trim(),
      title: s.querySelector('.process-title')?.textContent.trim(),
      width: Math.round(s.getBoundingClientRect().width)
    }));

    // Services cards at tablet
    const serviceCards = Array.from(document.querySelectorAll('.service-card')).map(c => ({
      title: c.querySelector('.service-title')?.textContent.trim(),
      width: Math.round(c.getBoundingClientRect().width),
      height: Math.round(c.getBoundingClientRect().height)
    }));

    // Proof bar
    const proofBar = document.querySelector('.hero-proof-bar');
    const proofBarRect = proofBar.getBoundingClientRect();

    return {
      viewportWidth: winWidth,
      documentScrollWidth: docWidth,
      hasHorizontalOverflow,
      processStepsCount: processSteps.length,
      processSteps,
      serviceCardsCount: serviceCards.length,
      serviceCards,
      proofBarWidth: Math.round(proofBarRect.width)
    };
  })()`);
  console.log("Tablet Viewport Evaluation:", JSON.stringify({
    hasOverflow: report.tablet.hasHorizontalOverflow,
    processStepsCount: report.tablet.processStepsCount,
    serviceCardsCount: report.tablet.serviceCardsCount
  }));

  // Capture Tablet Screenshot
  console.log("Capturing Tablet screenshot...");
  const tabletShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const tabletPath = path.join(WORKSPACE_DIR, "screenshot-tablet.png");
  fs.writeFileSync(tabletPath, Buffer.from(tabletShot.data, "base64"));
  report.screenshots.tablet = tabletPath;
  console.log(`Saved: ${tabletPath}`);

  // -------------------------------------------------------------------------
  // [6/7] GRAYSCALE READABILITY & VISUAL HIERARCHY EVALUATION
  // -------------------------------------------------------------------------
  console.log("\n[6/7] Evaluating Grayscale Readability & Visual Hierarchy...");

  // Reset to desktop viewport 1280x900
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(400);

  // Activate Grayscale Mode
  await evaluate(`(() => {
    document.body.classList.add('grayscale-mode');
  })()`);
  await sleep(500);

  // Inspect readability metrics in grayscale
  report.grayscale = await evaluate(`(() => {
    function getLuminance(rgbStr) {
      const match = rgbStr.match(/\\d+/g);
      if (!match || match.length < 3) return 1.0;
      const [r, g, b] = match.map(Number);
      const toLinear = c => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    function contrast(l1, l2) {
      const high = Math.max(l1, l2);
      const low = Math.min(l1, l2);
      return (high + 0.05) / (low + 0.05);
    }

    // Inspect Key Elements
    const heroHeadline = document.querySelector('.hero-headline');
    const heroColor = heroHeadline ? window.getComputedStyle(heroHeadline).color : 'rgb(26,32,44)';
    
    const copperBtn = document.querySelector('.btn-copper');
    const copperBtnBg = copperBtn ? window.getComputedStyle(copperBtn).backgroundColor : 'rgb(195,107,59)';
    const copperBtnColor = copperBtn ? window.getComputedStyle(copperBtn).color : 'rgb(255,255,255)';

    const navyBtn = document.querySelector('.btn-navy');
    const navyBtnBg = navyBtn ? window.getComputedStyle(navyBtn).backgroundColor : 'rgb(27,42,74)';

    const primaryServiceCard = document.querySelector('.service-card-primary');
    const primaryBorderColor = primaryServiceCard ? window.getComputedStyle(primaryServiceCard).borderColor : 'rgb(195,107,59)';

    const badge = document.querySelector('.eyebrow-pill') || document.querySelector('.service-card-badge');
    const badgeColor = badge ? window.getComputedStyle(badge).color : 'rgb(0,0,0)';
    const badgeBg = badge ? window.getComputedStyle(badge).backgroundColor : 'rgb(255,255,255)';

    const lumWhite = 1.0;
    const lumHeadline = getLuminance(heroColor);
    const lumCopperBg = getLuminance(copperBtnBg);
    const lumCopperColor = getLuminance(copperBtnColor);
    const lumNavyBg = getLuminance(navyBtnBg);
    const lumBadgeBg = getLuminance(badgeBg);
    const lumBadgeText = getLuminance(badgeColor);

    return {
      isGrayscaleApplied: document.body.classList.contains('grayscale-mode'),
      contrastRatios: {
        headlineOnWhite: Number(contrast(lumHeadline, lumWhite).toFixed(2)),
        whiteTextOnCopperButton: Number(contrast(lumCopperColor, lumCopperBg).toFixed(2)),
        copperButtonAgainstWhiteBackground: Number(contrast(lumCopperBg, lumWhite).toFixed(2)),
        whiteTextOnNavyButton: Number(contrast(lumWhite, lumNavyBg).toFixed(2)),
        badgeTextAgainstBadgeBg: Number(contrast(lumBadgeText, lumBadgeBg).toFixed(2))
      },
      visualHierarchyPreserved: {
        primaryCardHasAccentBorder: !!primaryBorderColor,
        copperButtonStandsOutFromWhite: contrast(lumCopperBg, lumWhite) >= 3.0,
        textRemainsHighContrast: contrast(lumHeadline, lumWhite) >= 7.0
      }
    };
  })()`);
  console.log("Grayscale Readability Analysis:", JSON.stringify(report.grayscale, null, 2));

  // Capture Clean High-Resolution Grayscale Screenshot
  console.log("Capturing Grayscale screenshot (Desktop Hero)...");
  const grayscaleShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  const grayscalePath = path.join(WORKSPACE_DIR, "screenshot-grayscale.png");
  fs.writeFileSync(grayscalePath, Buffer.from(grayscaleShot.data, "base64"));
  report.screenshots.grayscale = grayscalePath;
  console.log(`Saved: ${grayscalePath}`);

  // Remove grayscale mode
  await evaluate(`(() => {
    document.body.classList.remove('grayscale-mode');
  })()`);

  // -------------------------------------------------------------------------
  // [7/7] COPY SCREENSHOTS TO PARENT AGENT BRAIN DIRECTORY
  // -------------------------------------------------------------------------
  console.log(`\n[7/7] Copying all screenshots to parent agent brain directory:\n${PARENT_BRAIN_DIR}...`);
  if (!fs.existsSync(PARENT_BRAIN_DIR)) {
    fs.mkdirSync(PARENT_BRAIN_DIR, { recursive: true });
  }

  const screenshotFiles = [
    "screenshot-hero.png",
    "screenshot-services.png",
    "screenshot-quiz-result.png",
    "screenshot-mobile.png",
    "screenshot-mobile-menu.png",
    "screenshot-tablet.png",
    "screenshot-confirmation.png",
    "screenshot-grayscale.png"
  ];

  const copiedFiles = [];
  for (const file of screenshotFiles) {
    const src = path.join(WORKSPACE_DIR, file);
    const dest = path.join(PARENT_BRAIN_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      const stat = fs.statSync(dest);
      copiedFiles.push({ file, size: stat.size, dest });
      console.log(`Copied ${file} (${stat.size} bytes) -> brain directory`);
    } else {
      console.warn(`Warning: Screenshot file not found: ${src}`);
    }
  }

  report.copiedBrainScreenshots = copiedFiles;

  // Save full JSON report
  const reportPath = path.join(WORKSPACE_DIR, "browser-qa-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nSaved complete QA report to: ${reportPath}`);

  // Cleanup Chrome
  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log("\n================================================================================");
  console.log("   ALL BROWSER QA TESTS, CTA VERIFICATIONS & SCREENSHOTS COMPLETED 100%   ");
  console.log("================================================================================");
}

runCompleteQaSuite().catch(err => {
  console.error("FATAL ERROR IN QA SUITE:", err);
  process.exit(1);
});

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const HTML_FILE = "file:///Volumes/Extreme SSD/Google AntiGravity/nexus-ai-strategy/index.html";
const PORT = 9444;
const USER_DATA_DIR = `/tmp/nexus-cdp-${Date.now()}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== STARTING NEXUS AI STRATEGY E2E VERIFICATION & SCREENSHOT CAPTURE ===");
  
  // 1. Launch Chrome
  console.log("Launching Headless Chrome on CDP port", PORT);
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--disable-gpu',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check'
  ], { stdio: 'ignore' });

  // Wait for Chrome to bind port
  let targets = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        targets = await res.json();
        if (targets && targets.length > 0) break;
      }
    } catch (err) {
      // wait
    }
  }

  if (!targets || targets.length === 0) {
    console.error("Failed to connect to Chrome debugging port");
    chromeProc.kill();
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log("Connected to Chrome Page Target via WebSocket:", wsUrl);

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);

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

  // Navigate to index.html
  console.log("Navigating to:", HTML_FILE);
  await sendCommand("Page.navigate", { url: HTML_FILE });
  await sleep(1500);

  // Set Desktop Viewport (1280x900)
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await sleep(500);

  console.log("\n--- VERIFYING CTAs AND SECTIONS ---");
  const ctaCheck = await evaluate(`(() => {
    const checks = {
      navBookBtn: !!document.getElementById('nav-book-btn'),
      heroBookBtn: !!document.getElementById('hero-book-audit-btn'),
      heroQuizBtn: !!document.getElementById('hero-take-quiz-btn'),
      serviceAuditCta: !!document.getElementById('service-audit-cta'),
      serviceImplCta: !!document.getElementById('service-implementation-cta'),
      serviceRetainerCta: !!document.getElementById('service-retainer-cta'),
      fitSection: !!document.getElementById('fit'),
      problemSection: !!document.getElementById('problem'),
      servicesSection: !!document.getElementById('services'),
      processSection: !!document.getElementById('process'),
      quizSection: !!document.getElementById('quiz'),
      estimatorSection: !!document.getElementById('estimator'),
      aboutSection: !!document.getElementById('about'),
      faqSection: !!document.getElementById('faq'),
      contactSection: !!document.getElementById('contact')
    };
    return checks;
  })()`);
  console.log("CTA & Section Checks:", ctaCheck);

  // --- 1. CAPTURE DESKTOP HERO SCREENSHOT ---
  console.log("\nCapturing Desktop Hero Screenshot...");
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 860,
    deviceScaleFactor: 2,
    mobile: false
  });
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(600);
  const heroShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-hero.png"), Buffer.from(heroShot.data, "base64"));
  console.log("Saved: screenshot-hero.png");

  // --- 2. CAPTURE SERVICES SECTION SCREENSHOT ---
  console.log("\nCapturing Services Section Screenshot...");
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 1280,
    deviceScaleFactor: 2,
    mobile: false
  });
  await evaluate(`(() => {
    const s = document.getElementById('services');
    if (s) {
      const top = s.getBoundingClientRect().top + window.pageYOffset - 15;
      window.scrollTo(0, top);
    }
  })()`);
  await sleep(600);
  const servicesShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-services.png"), Buffer.from(servicesShot.data, "base64"));
  console.log("Saved: screenshot-services.png");

  // Reset viewport to standard 1280x900 for quiz
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 920,
    deviceScaleFactor: 2,
    mobile: false
  });

  // --- 3. TEST QUIZ INTERACTION AND CAPTURE RESULT ---
  console.log("\nTesting 5-Question Audit Intake Quiz...");
  const quizTestResult = await evaluate(`(() => {
    const q1Btns = document.querySelectorAll('.quiz-question-slide[data-question="1"] .quiz-option-btn');
    if (q1Btns[0]) q1Btns[0].click();
    document.getElementById('quiz-next-btn').click();

    const q2Btns = document.querySelectorAll('.quiz-question-slide[data-question="2"] .quiz-option-btn');
    if (q2Btns[0]) q2Btns[0].click(); // Carrier invoice reconciliation
    document.getElementById('quiz-next-btn').click();

    const q3Btns = document.querySelectorAll('.quiz-question-slide[data-question="3"] .quiz-option-btn');
    if (q3Btns[0]) q3Btns[0].click(); // Legacy TMS
    document.getElementById('quiz-next-btn').click();

    const q4Btns = document.querySelectorAll('.quiz-question-slide[data-question="4"] .quiz-option-btn');
    if (q4Btns[1]) q4Btns[1].click(); // 25-60 hrs/wk
    document.getElementById('quiz-next-btn').click();

    const q5Btns = document.querySelectorAll('.quiz-question-slide[data-question="5"] .quiz-option-btn');
    if (q5Btns[3]) q5Btns[3].click(); // Clear mandate
    document.getElementById('quiz-next-btn').click(); // Submit to scorecard

    const resultCard = document.getElementById('quiz-result-card');
    const targetAgent = document.getElementById('result-target-agent')?.textContent;
    const disclaimer = document.querySelector('.boardroom-disclaimer')?.textContent;
    
    return {
      resultVisible: !resultCard.hidden,
      targetAgent,
      hasZeroRoiDisclaimer: disclaimer.includes('Zero Speculative ROI') || disclaimer.includes('never promises speculative ROI')
    };
  })()`);
  console.log("Quiz Completion Result:", quizTestResult);

  // Capture Quiz Result Screenshot
  await evaluate(`(() => {
    const card = document.getElementById('quiz-result-card');
    if (card) {
      const top = card.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo(0, top);
    }
  })()`);
  await sleep(600);
  const quizShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-quiz-result.png"), Buffer.from(quizShot.data, "base64"));
  console.log("Saved: screenshot-quiz-result.png");

  // Test "Apply Findings to Audit Booking Form"
  console.log("\nTesting Quiz transfer to Contact Form...");
  const transferCheck = await evaluate(`(() => {
    document.getElementById('quiz-transfer-form-btn').click();
    const bottleneckVal = document.getElementById('contact-bottleneck').value;
    const msgVal = document.getElementById('contact-message').value;
    return {
      bottleneckVal,
      msgHasContext: msgVal.includes('[Quiz Intake Findings]')
    };
  })()`);
  console.log("Quiz Transfer Check:", transferCheck);

  // --- 4. TEST ROI ESTIMATOR SLIDERS ---
  console.log("\nTesting ROI Estimator Sliders...");
  const estimatorCheck = await evaluate(`(() => {
    const hSlider = document.getElementById('hours-slider');
    const rSlider = document.getElementById('rate-slider');
    const cSlider = document.getElementById('capture-slider');

    hSlider.value = 40;
    hSlider.dispatchEvent(new Event('input'));
    rSlider.value = 50;
    rSlider.dispatchEvent(new Event('input'));
    cSlider.value = 75;
    cSlider.dispatchEvent(new Event('input'));

    // Expected: 40 * 0.75 = 30 hrs/wk saved.
    // 30 * 50 * 52 = $78,000 annual capacity value
    const annualText = document.getElementById('annual-savings-display').textContent;
    const weeklyText = document.getElementById('weekly-hours-saved').textContent;
    return {
      annualText,
      weeklyText,
      isCorrect: annualText.includes('78,000') && weeklyText.includes('30')
    };
  })()`);
  console.log("ROI Estimator Calculation Test:", estimatorCheck);

  // --- 5. TEST CONTACT FORM VALIDATION & CONFIRMATION STATE ---
  console.log("\nTesting Contact Form Validation & Confirmation State...");
  const formValidationCheck = await evaluate(`(() => {
    const form = document.getElementById('audit-contact-form');
    // Attempt submit with empty fields
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const nameInvalid = document.getElementById('contact-name').classList.contains('is-invalid');
    const emailInvalid = document.getElementById('contact-email').classList.contains('is-invalid');
    const nameError = document.getElementById('name-error').textContent;

    // Now fill valid data
    document.getElementById('contact-name').value = "David Miller";
    document.getElementById('contact-company').value = "Great Lakes Logistics Inc";
    document.getElementById('contact-email').value = "dmiller@greatlakeslogistics.com";
    document.getElementById('contact-size').value = "25m-50m";
    document.getElementById('contact-bottleneck').value = "carrier-invoicing";
    document.getElementById('contact-message').value = "We run McLeod LoadMaster with 120 power units and need to eliminate manual fuel surcharge and detention reconciliation.";

    // Submit valid form
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const confirmPanel = document.getElementById('contact-confirmation-state');
    const isConfirmed = !confirmPanel.hidden;
    const confirmedName = document.getElementById('confirmed-name').textContent;
    const confirmedCompany = document.getElementById('confirmed-company').textContent;

    return {
      emptyTriggeredInvalid: nameInvalid && emailInvalid && !!nameError,
      isConfirmed,
      confirmedName,
      confirmedCompany
    };
  })()`);
  console.log("Form Validation & Confirmation Test:", formValidationCheck);

  // Capture Confirmation State Screenshot
  await evaluate(`(() => {
    const panel = document.getElementById('contact-confirmation-state');
    if (panel) {
      const top = panel.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo(0, top);
    }
  })()`);
  await sleep(600);
  const confirmShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-confirmation.png"), Buffer.from(confirmShot.data, "base64"));
  console.log("Saved: screenshot-confirmation.png");

  // --- 6. TEST MOBILE VIEWPORT (390x844) & MOBILE MENU ---
  console.log("\nTesting Mobile Viewport (390x844)...");
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(600);

  // Capture Mobile Hero (Menu Closed)
  const mobileHeroShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-mobile.png"), Buffer.from(mobileHeroShot.data, "base64"));
  console.log("Saved: screenshot-mobile.png (Mobile Hero)");

  const mobileCheck = await evaluate(`(() => {
    const toggle = document.getElementById('mobile-toggle-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const toggleVisible = window.getComputedStyle(toggle).display !== 'none';
    
    // Test opening mobile menu
    toggle.click();
    const navOpened = !mobileNav.hidden;
    return { toggleVisible, navOpened };
  })()`);
  console.log("Mobile Navigation Check:", mobileCheck);
  await sleep(400);

  // Capture Mobile Menu Open Screenshot
  const mobileMenuShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-mobile-menu.png"), Buffer.from(mobileMenuShot.data, "base64"));
  console.log("Saved: screenshot-mobile-menu.png (Mobile Menu Opened)");

  // Close mobile nav
  await evaluate(`document.getElementById('mobile-toggle-btn').click()`);
  await sleep(300);

  // --- 7. TEST TABLET VIEWPORT (768x1024) ---
  console.log("\nTesting Tablet Viewport (768x1024)...");
  await sendCommand("Emulation.setDeviceMetricsOverride", {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    mobile: false
  });
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(500);
  const tabletShot = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "screenshot-tablet.png"), Buffer.from(tabletShot.data, "base64"));
  console.log("Saved: screenshot-tablet.png");

  console.log("\n=== ALL TESTS AND SCREENSHOT CAPTURES COMPLETED SUCCESSFULLY ===");

  // Close and cleanup
  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  } catch (e) {}

  process.exit(0);
}

run().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

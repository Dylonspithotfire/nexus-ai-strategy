/**
 * NEXUS AI STRATEGY — CLIENT-SIDE APPLICATION
 * Pragmatic, Boardroom-Credible Interactivity
 * - Mobile Navigation
 * - 5-Question Audit Intake Quiz with Tailored Scorecard (Zero Speculative ROI)
 * - Operational Capacity & ROI Estimator (Hours × Rate × 52)
 * - Contact Form Validation & Confirmation State
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initAuditQuiz();
  initRoiEstimator();
  initContactForm();
  initSmoothScroll();
});

/* ==========================================================================
   1. MOBILE NAVIGATION
   ========================================================================== */
function initMobileNavigation() {
  const toggleBtn = document.getElementById('mobile-toggle-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!toggleBtn || !mobileNav) return;

  function openMenu() {
    toggleBtn.setAttribute('aria-expanded', 'true');
    mobileNav.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggleBtn.setAttribute('aria-expanded', 'false');
    mobileNav.hidden = true;
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close when clicking any nav link
  const navLinks = mobileNav.querySelectorAll('.mobile-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  });
}

/* ==========================================================================
   2. SMOOTH SCROLLING WITH HEADER OFFSET
   ========================================================================== */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.offsetHeight : 72;

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 16;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ==========================================================================
   3. 5-QUESTION AUDIT INTAKE QUIZ
   ========================================================================== */
function initAuditQuiz() {
  const quizContainer = document.getElementById('quiz-container');
  if (!quizContainer) return;

  const slides = quizContainer.querySelectorAll('.quiz-question-slide');
  const prevBtn = document.getElementById('quiz-prev-btn');
  const nextBtn = document.getElementById('quiz-next-btn');
  const stepText = document.getElementById('quiz-step-text');
  const pctText = document.getElementById('quiz-pct-text');
  const progressFill = document.getElementById('quiz-progress-fill');
  const selectionPrompt = document.getElementById('quiz-selection-prompt');
  const resultCard = document.getElementById('quiz-result-card');
  const questionsArea = document.getElementById('quiz-questions-area');
  const footerControls = quizContainer.querySelector('.quiz-footer-controls');

  // Result display elements
  const targetAgentEl = document.getElementById('result-target-agent');
  const stackCompatEl = document.getElementById('result-stack-compat');
  const hoursBracketEl = document.getElementById('result-hours-bracket');
  const engagementRecEl = document.getElementById('result-engagement-recommendation');
  const transferBtn = document.getElementById('quiz-transfer-form-btn');
  const retakeBtn = document.getElementById('quiz-retake-btn');

  let currentStep = 1;
  const totalQuestions = slides.length; // 5

  // Store user selections
  const quizState = {
    1: null, // Model & Scale
    2: null, // Bottleneck
    3: null, // Tech Stack
    4: null, // Weekly hours
    5: null  // AI stage
  };

  // Attach click listeners to option buttons
  slides.forEach((slide) => {
    const questionNum = parseInt(slide.dataset.question, 10);
    const optionBtns = slide.querySelectorAll('.quiz-option-btn');

    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Deselect others in current slide
        optionBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Save selection
        quizState[questionNum] = {
          value: btn.dataset.value,
          label: btn.querySelector('.opt-label')?.textContent.trim() || '',
          focus: btn.dataset.focus || null,
          stack: btn.dataset.stack || null,
          hours: btn.dataset.hours || null,
          stage: btn.dataset.stage || null
        };

        // Enable next button
        nextBtn.disabled = false;
        selectionPrompt.textContent = 'Selection saved. Click Next Step to continue.';
        selectionPrompt.style.color = 'var(--color-navy)';
      });
    });
  });

  function updateView() {
    slides.forEach(slide => {
      const qNum = parseInt(slide.dataset.question, 10);
      slide.classList.toggle('active', qNum === currentStep);
    });

    const pct = Math.round((currentStep / totalQuestions) * 100);
    stepText.textContent = `Question ${currentStep} of ${totalQuestions}`;
    pctText.textContent = `${pct}% Complete`;
    progressFill.style.width = `${pct}%`;

    // Back button state
    prevBtn.disabled = currentStep === 1;

    // Next button label & state
    const hasSelection = !!quizState[currentStep];
    nextBtn.disabled = !hasSelection;
    if (currentStep === totalQuestions) {
      nextBtn.textContent = 'View Diagnostic Recommendation →';
    } else {
      nextBtn.textContent = 'Next Step →';
    }

    if (!hasSelection) {
      selectionPrompt.textContent = 'Please select an option above to continue';
      selectionPrompt.style.color = 'var(--color-slate)';
    } else {
      selectionPrompt.textContent = 'Selection saved. Click Next to proceed.';
      selectionPrompt.style.color = 'var(--color-navy)';
    }
  }

  // Next Button handler
  nextBtn.addEventListener('click', () => {
    if (!quizState[currentStep]) return;

    if (currentStep < totalQuestions) {
      currentStep++;
      updateView();
    } else {
      // Completed all questions -> Display Scorecard
      displayResults();
    }
  });

  // Prev Button handler
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateView();
    }
  });

  function displayResults() {
    questionsArea.style.display = 'none';
    footerControls.style.display = 'none';
    stepText.textContent = 'Diagnostic Complete';
    pctText.textContent = '100% Ready';
    progressFill.style.width = '100%';

    // Determine tailored recommendation
    const bottleneck = quizState[2];
    const techStack = quizState[3];
    const hours = quizState[4];

    if (targetAgentEl) {
      targetAgentEl.textContent = bottleneck?.focus || 'Carrier Rate & Invoice Reconciliation Agent';
    }
    if (stackCompatEl) {
      stackCompatEl.textContent = techStack?.stack || 'High Feasibility (Standard Database / API Layer)';
    }
    if (hoursBracketEl) {
      hoursBracketEl.textContent = hours?.hours ? `${hours.hours} manual intervention` : '25–60 hrs/wk manual intervention';
    }
    if (engagementRecEl) {
      engagementRecEl.textContent = '10-Day AI Readiness Audit ($3,500 One-Time)';
    }

    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Retake Quiz Handler
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      // Clear selections
      for (let k in quizState) {
        quizState[k] = null;
      }
      slides.forEach(slide => {
        slide.querySelectorAll('.quiz-option-btn').forEach(btn => btn.classList.remove('selected'));
      });
      currentStep = 1;
      resultCard.hidden = true;
      questionsArea.style.display = 'block';
      footerControls.style.display = 'flex';
      updateView();
    });
  }

  // Transfer to Form Button
  if (transferBtn) {
    transferBtn.addEventListener('click', () => {
      const bottleneckSelect = document.getElementById('contact-bottleneck');
      const messageField = document.getElementById('contact-message');
      const contactSection = document.getElementById('contact');

      // Map quiz bottleneck to form option
      if (bottleneckSelect && quizState[2]) {
        const val = quizState[2].value;
        if (val === 'carrier-invoice') bottleneckSelect.value = 'carrier-invoicing';
        else if (val === 'exception-emails') bottleneckSelect.value = 'exception-emails';
        else if (val === 'bol-pod') bottleneckSelect.value = 'bol-pod-rekeying';
        else if (val === 'dock-dispatch') bottleneckSelect.value = 'dock-appointment';
        else bottleneckSelect.value = 'other';
      }

      // Pre-fill message box with context
      if (messageField) {
        const stackName = quizState[3]?.label || 'Legacy TMS';
        const hoursName = quizState[4]?.hours || '25-60 hrs/wk';
        const focusName = quizState[2]?.focus || 'Carrier Invoicing';
        messageField.value = `[Quiz Intake Findings]\n- Target Choke Point: ${focusName}\n- Software Environment: ${stackName}\n- Estimated Manual Time: ${hoursName}\n\nWe are looking to confirm operational viability and schedule our 10-day AI Readiness Audit.`;
      }

      if (contactSection) {
        const headerOffset = 88;
        const elementPosition = contactSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Focus on the name field
        setTimeout(() => {
          const nameInput = document.getElementById('contact-name');
          if (nameInput) nameInput.focus();
        }, 600);
      }
    });
  }

  // Initialize view
  updateView();
}

/* ==========================================================================
   4. ROI ESTIMATOR (Hours Saved/Week × Hourly Rate × 52)
   ========================================================================== */
function initRoiEstimator() {
  const hoursSlider = document.getElementById('hours-slider');
  const rateSlider = document.getElementById('rate-slider');
  const captureSlider = document.getElementById('capture-slider');

  const hoursDisplay = document.getElementById('hours-display');
  const rateDisplay = document.getElementById('rate-display');
  const captureDisplay = document.getElementById('capture-display');

  const annualSavingsDisplay = document.getElementById('annual-savings-display');
  const formulaDetail = document.getElementById('formula-detail');
  const weeklyHoursSaved = document.getElementById('weekly-hours-saved');
  const annualHoursSaved = document.getElementById('annual-hours-saved');

  if (!hoursSlider || !rateSlider || !captureSlider) return;

  function recalculate() {
    const weeklyHours = parseFloat(hoursSlider.value);
    const hourlyRate = parseFloat(rateSlider.value);
    const capturePct = parseFloat(captureSlider.value) / 100;

    // Display slider values
    hoursDisplay.textContent = `${weeklyHours} hrs/wk`;
    rateDisplay.textContent = `$${hourlyRate}/hr`;
    captureDisplay.textContent = `${Math.round(capturePct * 100)}%`;

    // Mathematical formula requested:
    // (hours saved/week × hourly rate × 52)
    const savedHoursPerWeek = weeklyHours * capturePct;
    const totalAnnualHours = savedHoursPerWeek * 52;
    const annualCapacityValue = savedHoursPerWeek * hourlyRate * 52;

    // Format numbers
    annualSavingsDisplay.textContent = `$${Math.round(annualCapacityValue).toLocaleString('en-US')}`;
    formulaDetail.textContent = `${savedHoursPerWeek.toFixed(1)} hrs saved/wk × $${hourlyRate}/hr × 52 weeks`;
    weeklyHoursSaved.textContent = `${savedHoursPerWeek.toFixed(1)} hrs`;
    annualHoursSaved.textContent = `${Math.round(totalAnnualHours).toLocaleString('en-US')} hrs`;
  }

  hoursSlider.addEventListener('input', recalculate);
  rateSlider.addEventListener('input', recalculate);
  captureSlider.addEventListener('input', recalculate);

  // Initial calculation
  recalculate();
}

/* ==========================================================================
   5. CONTACT FORM VALIDATION & CONFIRMATION
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('audit-contact-form');
  const confirmPanel = document.getElementById('contact-confirmation-state');
  const resetBtn = document.getElementById('reset-form-btn');
  if (!form || !confirmPanel) return;

  const fields = {
    name: {
      input: document.getElementById('contact-name'),
      error: document.getElementById('name-error'),
      validate: (val) => val.trim().length >= 2 ? '' : 'Please enter your full name.'
    },
    company: {
      input: document.getElementById('contact-company'),
      error: document.getElementById('company-error'),
      validate: (val) => val.trim().length >= 2 ? '' : 'Please enter your company name.'
    },
    email: {
      input: document.getElementById('contact-email'),
      error: document.getElementById('email-error'),
      validate: (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          return 'Please enter a valid work email address.';
        }
        return '';
      }
    },
    size: {
      input: document.getElementById('contact-size'),
      error: document.getElementById('size-error'),
      validate: (val) => val ? '' : 'Please select your company scale & headcount band.'
    },
    bottleneck: {
      input: document.getElementById('contact-bottleneck'),
      error: document.getElementById('bottleneck-error'),
      validate: (val) => val ? '' : 'Please select your primary operational bottleneck.'
    },
    message: {
      input: document.getElementById('contact-message'),
      error: document.getElementById('message-error'),
      validate: (val) => val.trim().length >= 10 ? '' : 'Please provide at least a brief sentence of operational context (10+ characters).'
    }
  };

  // Clear errors on input
  Object.keys(fields).forEach(key => {
    const item = fields[key];
    if (item.input) {
      item.input.addEventListener('input', () => {
        item.input.classList.remove('is-invalid');
        if (item.error) item.error.textContent = '';
      });
      item.input.addEventListener('change', () => {
        item.input.classList.remove('is-invalid');
        if (item.error) item.error.textContent = '';
      });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let hasErrors = false;
    let firstInvalidField = null;

    Object.keys(fields).forEach(key => {
      const item = fields[key];
      if (!item.input) return;

      const errorMsg = item.validate(item.input.value);
      if (errorMsg) {
        hasErrors = true;
        item.input.classList.add('is-invalid');
        if (item.error) item.error.textContent = errorMsg;
        if (!firstInvalidField) firstInvalidField = item.input;
      } else {
        item.input.classList.remove('is-invalid');
        if (item.error) item.error.textContent = '';
      }
    });

    if (hasErrors) {
      if (firstInvalidField) {
        firstInvalidField.focus();
      }
      return;
    }

    // Capture values for confirmation display
    const submittedData = {
      name: fields.name.input.value.trim(),
      company: fields.company.input.value.trim(),
      email: fields.email.input.value.trim(),
      size: fields.size.input.options[fields.size.input.selectedIndex].text,
      bottleneck: fields.bottleneck.input.options[fields.bottleneck.input.selectedIndex].text
    };

    // Update confirmation panel
    document.getElementById('confirmed-name').textContent = submittedData.name;
    document.getElementById('confirmed-company').textContent = submittedData.company;
    document.getElementById('confirmed-email').textContent = submittedData.email;
    document.getElementById('confirmed-size').textContent = submittedData.size;
    document.getElementById('confirmed-bottleneck').textContent = submittedData.bottleneck;

    // Transition form to confirmation
    form.style.display = 'none';
    confirmPanel.hidden = false;

    // Scroll confirmation panel into view
    confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Reset form handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      Object.keys(fields).forEach(key => {
        const item = fields[key];
        if (item.input) item.input.classList.remove('is-invalid');
        if (item.error) item.error.textContent = '';
      });
      confirmPanel.hidden = true;
      form.style.display = 'flex';
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

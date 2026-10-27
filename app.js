/**
 * NEXUS AI STRATEGY — CLIENT-SIDE APPLICATION
 * Pragmatic, Boardroom-Credible Interactivity
 * - Mobile Navigation
 * - 5-Question Audit Intake Quiz with Tailored Scorecard (Zero Speculative ROI)
 * - Operational Capacity & ROI Estimator (Hours × Rate × 52)
 * - Contact Form Validation & Confirmation State
 */

// Pure helper functions (reusable in browser and unit tests)
function calculateRoi(weeklyHours, hourlyRate, capturePct) {
  const hours = parseFloat(weeklyHours) || 0;
  const rate = parseFloat(hourlyRate) || 0;
  const capture = parseFloat(capturePct) || 0;

  const savedHoursPerWeek = hours * capture;
  const totalAnnualHours = savedHoursPerWeek * 52;
  const annualCapacityValue = savedHoursPerWeek * rate * 52;

  return {
    savedHoursPerWeek,
    totalAnnualHours,
    annualCapacityValue
  };
}

function mapBottleneckValue(quizValue) {
  switch (quizValue) {
    case 'carrier-invoice':
      return 'carrier-invoicing';
    case 'exception-emails':
      return 'exception-emails';
    case 'bol-pod':
      return 'bol-pod-rekeying';
    case 'dock-dispatch':
      return 'dock-appointment';
    default:
      return 'other';
  }
}

function validateField(key, value) {
  const val = (value || '').trim();
  switch (key) {
    case 'name':
      return val.length >= 2 ? '' : 'Please enter your full name.';
    case 'company':
      return val.length >= 2 ? '' : 'Please enter your company name.';
    case 'email': {
      if (!val) return 'Please enter your work email address.';
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(val)) {
        return 'Please enter a valid work email address (e.g. name@company.com).';
      }
      return '';
    }
    case 'size':
      return val ? '' : 'Please select your company scale & headcount band.';
    case 'bottleneck':
      return val ? '' : 'Please select your primary operational bottleneck.';
    case 'message':
      return val.length >= 10
        ? ''
        : 'Please provide at least a brief sentence of operational context (10+ characters).';
    default:
      return '';
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initMobileNavigation();
    initAuditQuiz();
    initRoiEstimator();
    initContactForm();
    initSmoothScroll();
    initGrayscaleToggle();
  });
}

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
        const offsetPosition = elementPosition + (window.pageYOffset || 0) - headerHeight - 16;

        if (typeof window.scrollTo === 'function') {
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
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
  const totalQuestions = slides.length || 5;

  // Store user selections
  const quizState = {
    1: null, // Model & Scale
    2: null, // Bottleneck
    3: null, // Tech Stack
    4: null, // Weekly hours
    5: null  // AI stage
  };

  // Attach click listeners to option buttons and set accessibility
  slides.forEach((slide) => {
    const questionNum = parseInt(slide.dataset.question, 10);
    const optionBtns = slide.querySelectorAll('.quiz-option-btn');

    optionBtns.forEach(btn => {
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-pressed', 'false');

      btn.addEventListener('click', () => {
        // Deselect others in current slide
        optionBtns.forEach(b => {
          b.classList.remove('selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');

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
        if (currentStep === totalQuestions) {
          selectionPrompt.textContent = 'Selection saved. Click View Diagnostic Recommendation to view scorecard.';
        } else {
          selectionPrompt.textContent = 'Selection saved. Click Next Step to continue.';
        }
        selectionPrompt.style.color = 'var(--color-navy)';
      });
    });
  });

  function updateView() {
    slides.forEach(slide => {
      const qNum = parseInt(slide.dataset.question, 10);
      const isActive = qNum === currentStep;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', (!isActive).toString());
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
      selectionPrompt.textContent = currentStep === totalQuestions
        ? 'Please select an option above to view scorecard'
        : 'Please select an option above to continue';
      selectionPrompt.style.color = 'var(--color-slate)';
    } else {
      selectionPrompt.textContent = currentStep === totalQuestions
        ? 'Selection saved. Click View Diagnostic Recommendation to proceed.'
        : 'Selection saved. Click Next to proceed.';
      selectionPrompt.style.color = 'var(--color-navy)';
    }
  }

  // Next Button handler
  nextBtn.addEventListener('click', () => {
    if (!quizState[currentStep]) {
      selectionPrompt.textContent = 'Please select an option above to continue.';
      selectionPrompt.style.color = '#B91C1C';
      nextBtn.disabled = true;
      return;
    }

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
    const model = quizState[1];
    const bottleneck = quizState[2];
    const techStack = quizState[3];
    const hours = quizState[4];
    const stage = quizState[5];

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

    const subtitleEl = resultCard.querySelector('.result-subtitle');
    if (subtitleEl && model?.label) {
      subtitleEl.textContent = `Customized architectural recommendation for ${model.label} (${stage?.stage || 'Evaluation Stage'}):`;
    }

    resultCard.hidden = false;
    if (typeof resultCard.scrollIntoView === 'function') {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Retake Quiz Handler
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      // Clear selections
      for (let k in quizState) {
        quizState[k] = null;
      }
      slides.forEach(slide => {
        slide.querySelectorAll('.quiz-option-btn').forEach(btn => {
          btn.classList.remove('selected');
          btn.setAttribute('aria-pressed', 'false');
        });
      });
      currentStep = 1;
      resultCard.hidden = true;
      questionsArea.style.display = 'block';
      footerControls.style.display = 'flex';
      updateView();
      if (typeof quizContainer.scrollIntoView === 'function') {
        quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Transfer to Form Button
  if (transferBtn) {
    transferBtn.addEventListener('click', () => {
      const bottleneckSelect = document.getElementById('contact-bottleneck');
      const sizeSelect = document.getElementById('contact-size');
      const messageField = document.getElementById('contact-message');
      const contactSection = document.getElementById('contact');
      const form = document.getElementById('audit-contact-form');
      const confirmPanel = document.getElementById('contact-confirmation-state');

      // If confirmation was showing from previous submit, restore form
      if (confirmPanel && !confirmPanel.hidden) {
        confirmPanel.hidden = true;
        if (form) {
          form.style.display = '';
          form.hidden = false;
        }
      }

      // Map quiz bottleneck to form option
      if (bottleneckSelect && quizState[2]) {
        bottleneckSelect.value = mapBottleneckValue(quizState[2].value);
        bottleneckSelect.classList.remove('is-invalid');
        const bErr = document.getElementById('bottleneck-error');
        if (bErr) bErr.textContent = '';
      }

      // Pre-fill size band if unselected
      if (sizeSelect && !sizeSelect.value && quizState[1]) {
        const modelVal = quizState[1].value;
        if (modelVal === '3pl-freight' || modelVal === 'distributor') sizeSelect.value = '25m-50m';
        else if (modelVal === 'asset-carrier') sizeSelect.value = '25m-50m';
        else if (modelVal === 'intermodal-drayage') sizeSelect.value = '10m-25m';
        sizeSelect.classList.remove('is-invalid');
        const sErr = document.getElementById('size-error');
        if (sErr) sErr.textContent = '';
      }

      // Pre-fill message box with rich operational context
      if (messageField) {
        const modelName = quizState[1]?.label || 'Freight Brokerage / 3PL';
        const focusName = quizState[2]?.focus || 'Carrier Rate & Invoice Reconciliation Agent';
        const stackName = quizState[3]?.stack || quizState[3]?.label || 'Legacy TMS';
        const hoursName = quizState[4]?.hours || '25-60 hrs/wk';
        const stageName = quizState[5]?.stage || 'Immediate Operational Mandate';

        messageField.value = `[Quiz Intake Findings]\n- Operating Model: ${modelName}\n- Target Choke Point: ${focusName}\n- Software Environment: ${stackName}\n- Estimated Manual Time: ${hoursName}\n- Current AI Mandate: ${stageName}\n\nWe are looking to confirm operational viability and schedule our 10-day AI Readiness Audit.`;
        messageField.classList.remove('is-invalid');
        const mErr = document.getElementById('message-error');
        if (mErr) mErr.textContent = '';
      }

      if (contactSection) {
        const headerOffset = 88;
        const elementPosition = contactSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + (window.pageYOffset || 0) - headerOffset;
        if (typeof window.scrollTo === 'function') {
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }

        // Focus on the name field
        setTimeout(() => {
          const nameInput = document.getElementById('contact-name');
          if (nameInput) nameInput.focus();
        }, 500);
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

    // Mathematical formula requested:
    // (hours saved/week × hourly rate × 52)
    const { savedHoursPerWeek, totalAnnualHours, annualCapacityValue } = calculateRoi(
      weeklyHours,
      hourlyRate,
      capturePct
    );

    // Display slider values
    if (hoursDisplay) hoursDisplay.textContent = `${weeklyHours} hrs/wk`;
    if (rateDisplay) rateDisplay.textContent = `$${hourlyRate}/hr`;
    if (captureDisplay) captureDisplay.textContent = `${Math.round(capturePct * 100)}%`;

    // Accessibility attributes
    hoursSlider.setAttribute('aria-valuenow', weeklyHours.toString());
    hoursSlider.setAttribute('aria-valuetext', `${weeklyHours} hours per week`);
    rateSlider.setAttribute('aria-valuenow', hourlyRate.toString());
    rateSlider.setAttribute('aria-valuetext', `$${hourlyRate} per hour`);
    captureSlider.setAttribute('aria-valuenow', Math.round(capturePct * 100).toString());
    captureSlider.setAttribute('aria-valuetext', `${Math.round(capturePct * 100)} percent automation`);

    // Format output numbers
    if (annualSavingsDisplay) {
      annualSavingsDisplay.textContent = `$${Math.round(annualCapacityValue).toLocaleString('en-US')}`;
    }
    if (formulaDetail) {
      formulaDetail.textContent = `${savedHoursPerWeek.toFixed(1)} hrs saved/wk × $${hourlyRate}/hr × 52 weeks`;
    }
    if (weeklyHoursSaved) {
      weeklyHoursSaved.textContent = `${savedHoursPerWeek.toFixed(1)} hrs`;
    }
    if (annualHoursSaved) {
      annualHoursSaved.textContent = `${Math.round(totalAnnualHours).toLocaleString('en-US')} hrs`;
    }
  }

  // Real-time input and change listeners
  hoursSlider.addEventListener('input', recalculate);
  hoursSlider.addEventListener('change', recalculate);
  rateSlider.addEventListener('input', recalculate);
  rateSlider.addEventListener('change', recalculate);
  captureSlider.addEventListener('input', recalculate);
  captureSlider.addEventListener('change', recalculate);

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
      validate: (val) => validateField('name', val)
    },
    company: {
      input: document.getElementById('contact-company'),
      error: document.getElementById('company-error'),
      validate: (val) => validateField('company', val)
    },
    email: {
      input: document.getElementById('contact-email'),
      error: document.getElementById('email-error'),
      validate: (val) => validateField('email', val)
    },
    size: {
      input: document.getElementById('contact-size'),
      error: document.getElementById('size-error'),
      validate: (val) => validateField('size', val)
    },
    bottleneck: {
      input: document.getElementById('contact-bottleneck'),
      error: document.getElementById('bottleneck-error'),
      validate: (val) => validateField('bottleneck', val)
    },
    message: {
      input: document.getElementById('contact-message'),
      error: document.getElementById('message-error'),
      validate: (val) => validateField('message', val)
    }
  };

  // Clear errors on input and change
  Object.keys(fields).forEach(key => {
    const item = fields[key];
    if (item.input) {
      const clearError = () => {
        item.input.classList.remove('is-invalid');
        if (item.error) item.error.textContent = '';
      };
      item.input.addEventListener('input', clearError);
      item.input.addEventListener('change', clearError);
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
      if (firstInvalidField && typeof firstInvalidField.focus === 'function') {
        firstInvalidField.focus();
      }
      return;
    }

    // Capture values for confirmation display
    const submittedData = {
      name: fields.name.input.value.trim(),
      company: fields.company.input.value.trim(),
      email: fields.email.input.value.trim(),
      size: fields.size.input.options[fields.size.input.selectedIndex]?.text || fields.size.input.value,
      bottleneck: fields.bottleneck.input.options[fields.bottleneck.input.selectedIndex]?.text || fields.bottleneck.input.value
    };

    // Update confirmation panel
    const confirmedName = document.getElementById('confirmed-name');
    const confirmedCompany = document.getElementById('confirmed-company');
    const confirmedEmail = document.getElementById('confirmed-email');
    const confirmedSize = document.getElementById('confirmed-size');
    const confirmedBottleneck = document.getElementById('confirmed-bottleneck');

    if (confirmedName) confirmedName.textContent = submittedData.name;
    if (confirmedCompany) confirmedCompany.textContent = submittedData.company;
    if (confirmedEmail) confirmedEmail.textContent = submittedData.email;
    if (confirmedSize) confirmedSize.textContent = submittedData.size;
    if (confirmedBottleneck) confirmedBottleneck.textContent = submittedData.bottleneck;

    // Transition form to confirmation
    form.style.display = 'none';
    form.hidden = true;
    confirmPanel.hidden = false;

    // Scroll confirmation panel into view
    if (typeof confirmPanel.scrollIntoView === 'function') {
      confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
      form.hidden = false;
      form.style.display = '';
      if (typeof form.scrollIntoView === 'function') {
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}

/* ==========================================================================
   6. ACCESSIBILITY: GRAYSCALE & VALUE CONTRAST TOGGLE
   ========================================================================== */
function initGrayscaleToggle() {
  const toggleBtns = [
    document.getElementById('grayscale-toggle-btn'),
    document.getElementById('mobile-grayscale-toggle-btn'),
    document.getElementById('footer-grayscale-toggle-btn')
  ].filter(Boolean);

  if (toggleBtns.length === 0) return;

  function setGrayscale(enabled) {
    if (enabled) {
      document.body.classList.add('grayscale-mode');
    } else {
      document.body.classList.remove('grayscale-mode');
    }
    toggleBtns.forEach(btn => {
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.classList.toggle('active', enabled);
    });
    try {
      localStorage.setItem('nexus_a11y_grayscale', enabled ? '1' : '0');
    } catch (e) {}
  }

  // Restore stored user preference
  try {
    if (localStorage.getItem('nexus_a11y_grayscale') === '1') {
      setGrayscale(true);
    }
  } catch (e) {}

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isCurrently = document.body.classList.contains('grayscale-mode');
      setGrayscale(!isCurrently);
    });
  });
}

// Export for Node.js unit testing environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateRoi,
    mapBottleneckValue,
    validateField,
    initMobileNavigation,
    initSmoothScroll,
    initAuditQuiz,
    initRoiEstimator,
    initContactForm,
    initGrayscaleToggle
  };
}

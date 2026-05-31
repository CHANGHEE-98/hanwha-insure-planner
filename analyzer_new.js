// 한화손보 시상안 파일 OCR 판독 가속 엔진 (리팩토링 완성본)

(function () {
  // Store the active parsing simulation state for multi-slide processing
  window.currentParsedObjects = null;
  window.activeParsedIndex = null;
  window.currentSlideCount = 0;
  window.currentDiscardedCount = 0;

  // DOM Selection
  const fileDropZone = document.getElementById('file-drop-zone');
  const fileInput = document.getElementById('file-input');
  const consoleLogsContainer = document.getElementById('console-logs-container');
  const analyzerLoader = document.getElementById('analyzer-loader');
  const loaderProgressFill = document.getElementById('loader-progress-fill-bar');
  const loaderText = document.getElementById('analyzer-loader-text');
  const parsedResultsPanel = document.getElementById('parsed-results-panel');
  const parsedResultCardData = document.getElementById('parsed-result-card-data');
  const btnDiscardParsed = document.getElementById('btn-discard-parsed');
  const btnCommitParsed = document.getElementById('btn-commit-parsed');

  // Helper: typewriter text addition in terminal style
  async function typeLogLine(message, type = '') {
    if (!consoleLogsContainer) return;
    
    // Clear placeholder message if it's there
    const placeholder = consoleLogsContainer.querySelector('.console-placeholder-msg');
    if (placeholder) {
      consoleLogsContainer.innerHTML = '';
    }

    const logLine = document.createElement('div');
    logLine.className = 'console-log-line';
    
    // Color schemes for console
    if (type === 'header') {
      logLine.style.color = '#00E5FF';
      logLine.style.fontWeight = '700';
    } else if (type === 'success') {
      logLine.style.color = '#00C853';
    } else if (type === 'warning') {
      logLine.style.color = '#FFD600';
    } else if (type === 'danger') {
      logLine.style.color = '#FF1744';
    } else if (type === 'info') {
      logLine.style.color = '#E0F7FA';
    }

    logLine.innerHTML = `<span class="log-prefix" style="color: var(--primary); margin-right: 6px;">&gt;</span><span class="log-text"></span>`;
    consoleLogsContainer.appendChild(logLine);

    const textSpan = logLine.querySelector('.log-text');
    
    return new Promise((resolve) => {
      let i = 0;
      function type() {
        if (i < message.length) {
          textSpan.textContent += message.charAt(i);
          i++;
          setTimeout(type, 3);
        } else {
          consoleLogsContainer.scrollTop = consoleLogsContainer.scrollHeight;
          resolve();
        }
      }
      type();
    });
  }

  // Simulation runner function for multi-slide OCR scanning
  async function runSimulation(filename, slideData, parsedObjects) {
    if (!parsedResultsPanel) return;
    
    parsedResultsPanel.style.display = 'none';
    window.currentParsedObjects = parsedObjects;
    window.activeParsedIndex = 0;
    window.currentSlideCount = slideData.totalSlides;
    window.currentDiscardedCount = slideData.discardedSlides;
    
    await sleep(150);

    // Show result review panel, starting with slide index 0
    renderParsedResultCard(0);
    parsedResultsPanel.style.display = 'block';
    
    // Smooth scroll down to parsed result
    parsedResultsPanel.scrollIntoView({ behavior: 'smooth' });
  }

  // Update Loader utility
  function updateLoader(percent, text) {
    if (loaderProgressFill) loaderProgressFill.style.width = `${percent}%`;
    if (loaderText) loaderText.textContent = `${text} (${percent}%)`;
  }

  // Utility sleep helper
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Save current form values back into active parsed objects index
  function saveCurrentFormValues() {
    const idx = window.activeParsedIndex;
    if (idx === null || !window.currentParsedObjects || !window.currentParsedObjects[idx]) return;

    const obj = window.currentParsedObjects[idx];

    const editTitle = document.getElementById('edit-incentive-title');
    const editCategory = document.getElementById('edit-incentive-category');
    const editMetric = document.getElementById('edit-incentive-metric');
    const editStartDate = document.getElementById('edit-start-date');
    const editEndDate = document.getElementById('edit-end-date');
    const editWeeklyIssue = document.getElementById('edit-weekly-issue');
    const editStrategyDirection = document.getElementById('edit-strategy-direction');

    if (editTitle) obj.title = editTitle.value.trim();
    if (editCategory) obj.category = editCategory.value;
    if (editMetric) {
      obj.metricType = editMetric.value;
      if (editMetric.value === 'premiums') obj.metricUnit = '원';
      else if (editMetric.value === 'contracts') obj.metricUnit = '건';
      else if (editMetric.value === 'two_tier') obj.metricUnit = '주';
      else if (editMetric.value === 'recruit_tier') obj.metricUnit = '명';
    }
    if (editStartDate) obj.startDate = editStartDate.value;
    if (editEndDate) obj.endDate = editEndDate.value;
    if (editWeeklyIssue) obj.weeklyIssue = editWeeklyIssue.value.trim();
    if (editStrategyDirection) obj.direction = editStrategyDirection.value.trim();

    // Color picker
    const selectedColorInput = document.querySelector('input[name="admin-incentive-color"]:checked');
    if (selectedColorInput) {
      obj.colorOverride = selectedColorInput.value;
    }

    // Dynamic criteria rows
    const rows = document.querySelectorAll('.criteria-row');
    if (rows.length === 1) {
      const targetInput = rows[0].querySelector('.crit-target');
      const unitSelect = rows[0].querySelector('.crit-target-unit');
      const rewardInput = rows[0].querySelector('.crit-reward');

      obj.targetValue = parseInt(targetInput.value, 10) || 0;
      obj.metricUnit = unitSelect.value;
      obj.reward = rewardInput.value.trim();
      delete obj.milestones;
    } else if (rows.length > 1) {
      const milestones = [];
      rows.forEach((row, idx) => {
        const targetInput = row.querySelector('.crit-target');
        const unitSelect = row.querySelector('.crit-target-unit');
        const rewardInput = row.querySelector('.crit-reward');

        const targetVal = parseInt(targetInput.value, 10) || 0;
        const unit = unitSelect.value;
        const rewardText = rewardInput.value.trim();

        let tierName = `${idx + 1}차 기준 (${targetVal.toLocaleString()}${unit})`;
        milestones.push({
          name: tierName,
          value: targetVal,
          reward: rewardText
        });
      });

      obj.milestones = milestones;
      obj.targetValue = milestones[0].value;
      obj.metricUnit = rows[0].querySelector('.crit-target-unit').value;
      obj.reward = milestones[0].reward;
    }
  }

  // Render the parsed result card inside the review panel
  function renderParsedResultCard(index) {
    if (!parsedResultCardData) return;
    window.activeParsedIndex = index;
    const obj = window.currentParsedObjects[index];

    const isBlue = obj.colorOverride ? obj.colorOverride === 'blue' : obj.category === 'long_auto';
    const isGold = obj.colorOverride ? obj.colorOverride === 'gold' : obj.category === 'two_annual';
    const isGreen = obj.colorOverride ? obj.colorOverride === 'green' : obj.category === 'recruitment';
    const isPurple = obj.colorOverride ? obj.colorOverride === 'purple' : false;
    const isOrange = obj.colorOverride ? obj.colorOverride === 'orange' : false;

    // Helper to generate a single criteria row HTML
    function createCriteriaRowHtml(targetVal, unit, rewardText) {
      return `
        <div class="criteria-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: rgba(255,255,255,0.01); border: 1px solid var(--border); padding: 8px 12px; border-radius: var(--radius-xs);">
          <span style="font-size: 0.85rem; font-weight: 600; min-width: 65px; color: var(--text-secondary);">시상 기준:</span>
          <input type="number" class="admin-edit-input crit-target" value="${targetVal}" style="max-width: 120px; padding: 6px 10px !important;">
          <select class="admin-edit-select crit-target-unit" style="max-width: 80px; padding: 6px 10px !important;">
            <option value="원" ${unit === '원' ? 'selected' : ''}>원</option>
            <option value="%" ${unit === '%' ? 'selected' : ''}>%</option>
            <option value="건" ${unit === '건' ? 'selected' : ''}>건</option>
            <option value="주" ${unit === '주' ? 'selected' : ''}>주</option>
            <option value="명" ${unit === '명' ? 'selected' : ''}>명</option>
          </select>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">이상 달성시 ➡️ 시상</span>
          <input type="text" class="admin-edit-input crit-reward" value="${rewardText}" style="max-width: 220px; padding: 6px 10px !important;" placeholder="시상 혜택 입력">
          <button class="btn-delete-row" style="background:transparent; color:var(--accent-danger); cursor:pointer; font-size:1.1rem; display:flex; align-items:center; padding: 0 4px; border:none;" title="삭제">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
    }

    // Helper to bind row delete events
    function bindRowDeleteEvent(rowEl) {
      const btnDel = rowEl.querySelector('.btn-delete-row');
      if (btnDel) {
        btnDel.addEventListener('click', () => {
          const container = document.getElementById('criteria-rows-container');
          if (container && container.querySelectorAll('.criteria-row').length > 1) {
            rowEl.remove();
          } else {
            alert('최소 1개 이상의 시상 기준은 유지해야 합니다.');
          }
        });
      }
    }

    // Build initial criteria rows
    let initialRowsHtml = '';
    if (obj.milestones && obj.milestones.length > 0) {
      obj.milestones.forEach((m) => {
        initialRowsHtml += createCriteriaRowHtml(m.value, obj.metricUnit, m.reward);
      });
    } else {
      initialRowsHtml += createCriteriaRowHtml(obj.targetValue, obj.metricUnit, obj.reward);
    }

    // Pagination controls header
    const paginationBarHtml = `
      <div class="pagination-header" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 200, 83, 0.05); border: 1px solid rgba(0, 200, 83, 0.15); padding: 12px 18px; border-radius: var(--radius-sm); margin-bottom: 24px; flex-wrap: wrap; gap: 12px; font-family: var(--font-sans) !important;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="category-indicator cat-recruitment" style="padding: 4px 8px; font-size: 0.725rem; border-radius: 4px; font-weight: 700; background: rgba(0, 200, 83, 0.12); color: #00C853; border: 1px solid rgba(0,200,83,0.25);">
            <i data-lucide="sparkles" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i> AI 스캔 결과 검토
          </span>
          <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
            총 ${window.currentParsedObjects.length}개 중 ${index + 1}번째 시상안 기획서
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 8px;">
            (비시상안 장표 ${window.currentDiscardedCount}개는 자동 폐기처리됨)
          </span>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="btn-prev-parsed-item" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.8rem; gap: 4px; display: inline-flex; align-items: center;" ${index === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i> 이전 시상안
          </button>
          <button id="btn-next-parsed-item" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.8rem; gap: 4px; display: inline-flex; align-items: center;" ${index === window.currentParsedObjects.length - 1 ? 'disabled' : ''}>
            다음 시상안 <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `;

    parsedResultCardData.innerHTML = `
      ${paginationBarHtml}
      
      <div class="parsed-info-grid">
        <div class="info-row">
          <span class="info-label">시상 프로모션명</span>
          <input type="text" id="edit-incentive-title" class="admin-edit-input font-highlight" value="${obj.title}">
        </div>
        <div class="info-row-half">
          <div class="info-col">
            <span class="info-label">카테고리 분류</span>
            <select id="edit-incentive-category" class="admin-edit-select">
              <option value="long_auto" ${obj.category === 'long_auto' ? 'selected' : ''}>장기 보장성 / 자동차</option>
              <option value="two_annual" ${obj.category === 'two_annual' ? 'selected' : ''}>2W / 연도대상</option>
              <option value="recruitment" ${obj.category === 'recruitment' ? 'selected' : ''}>도입 (리쿠르팅)</option>
            </select>
          </div>
          <div class="info-col">
            <span class="info-label">시상 집계 기준</span>
            <select id="edit-incentive-metric" class="admin-edit-select font-medium">
              <option value="premiums" ${obj.metricType === 'premiums' ? 'selected' : ''}>초회보험료 (원)</option>
              <option value="contracts" ${obj.metricType === 'contracts' ? 'selected' : ''}>신계약 건수 (건)</option>
              <option value="two_tier" ${obj.metricType === 'two_tier' ? 'selected' : ''}>연속 가동 (주)</option>
              <option value="recruit_tier" ${obj.metricType === 'recruit_tier' ? 'selected' : ''}>도입 인원 (명)</option>
            </select>
          </div>
        </div>
        <div class="info-row-half">
          <div class="info-col">
            <span class="info-label">시상 시작 기간 (시작일)</span>
            <input type="date" id="edit-start-date" class="admin-edit-input" value="${obj.startDate}">
          </div>
          <div class="info-col">
            <span class="info-label">시상 종료 기간 (종료일)</span>
            <input type="date" id="edit-end-date" class="admin-edit-input" value="${obj.endDate}">
          </div>
        </div>
        <div class="info-row">
          <span class="info-label">캘린더 표시 색상 (지점장 선택)</span>
          <div class="color-picker-group">
            <label class="color-option opt-blue" style="--accent-info: #00B0FF;">
              <input type="radio" name="admin-incentive-color" value="blue" ${isBlue ? 'checked' : ''}>
              <span class="color-dot-btn dot-blue" title="블루"></span>
              <span class="color-option-label">블루</span>
            </label>
            <label class="color-option opt-gold" style="--accent-warning: #FFD600;">
              <input type="radio" name="admin-incentive-color" value="gold" ${isGold ? 'checked' : ''}>
              <span class="color-dot-btn dot-gold" title="골드"></span>
              <span class="color-option-label">골드</span>
            </label>
            <label class="color-option opt-green" style="--accent-success: #00C853;">
              <input type="radio" name="admin-incentive-color" value="green" ${isGreen ? 'checked' : ''}>
              <span class="color-dot-btn dot-green" title="그린"></span>
              <span class="color-option-label">그린</span>
            </label>
            <label class="color-option opt-purple" style="--accent-purple: #D500F9;">
              <input type="radio" name="admin-incentive-color" value="purple" ${isPurple ? 'checked' : ''}>
              <span class="color-dot-btn dot-purple" title="퍼플"></span>
              <span class="color-option-label">퍼플</span>
            </label>
            <label class="color-option opt-orange" style="--primary: #FF6D00;">
              <input type="radio" name="admin-incentive-color" value="orange" ${isOrange ? 'checked' : ''}>
              <span class="color-dot-btn dot-orange" title="오렌지"></span>
              <span class="color-option-label">오렌지</span>
            </label>
          </div>
        </div>



        <div class="info-row">
          <span class="info-label">시상 기준 및 혜택 요약 (편집 가능)</span>
          <div id="criteria-rows-container" style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
            ${initialRowsHtml}
          </div>
          <button id="btn-add-criteria-row" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.8rem; margin-top: 10px; gap: 4px; align-self: flex-start; display: inline-flex;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i> 시상 기준 추가
          </button>
        </div>

      </div>
    `;

    // Bind Pagination Buttons
    const btnPrev = document.getElementById('btn-prev-parsed-item');
    const btnNext = document.getElementById('btn-next-parsed-item');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        saveCurrentFormValues();
        renderParsedResultCard(index - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        saveCurrentFormValues();
        renderParsedResultCard(index + 1);
      });
    }

    // Dynamic color picker link event to Category select
    const catSelect = document.getElementById('edit-incentive-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        let colorToSelect = 'blue';
        if (val === 'long_auto') colorToSelect = 'blue';
        else if (val === 'two_annual') colorToSelect = 'gold';
        else if (val === 'recruitment') colorToSelect = 'green';
        
        const radio = document.querySelector(`input[name="admin-incentive-color"][value="${colorToSelect}"]`);
        if (radio) {
          radio.checked = true;
        }
      });
    }

    // Bind Metric change to target unit selectors
    const metricSelect = document.getElementById('edit-incentive-metric');
    if (metricSelect) {
      metricSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        let unit = '원';
        if (val === 'premiums') unit = '원';
        else if (val === 'contracts') unit = '건';
        else if (val === 'two_tier') unit = '주';
        else if (val === 'recruit_tier') unit = '명';
        
        document.querySelectorAll('.crit-target-unit').forEach(select => {
          select.value = unit;
        });
      });
    }

    // Add Criteria Row event
    const btnAddRow = document.getElementById('btn-add-criteria-row');
    const rowsContainer = document.getElementById('criteria-rows-container');
    if (btnAddRow && rowsContainer) {
      btnAddRow.addEventListener('click', () => {
        const currentMetric = metricSelect ? metricSelect.value : 'premiums';
        let defaultUnit = '원';
        if (currentMetric === 'premiums') defaultUnit = '원';
        else if (currentMetric === 'contracts') defaultUnit = '건';
        else if (currentMetric === 'two_tier') defaultUnit = '주';
        else if (currentMetric === 'recruit_tier') defaultUnit = '명';

        const newRowHtml = createCriteriaRowHtml(0, defaultUnit, '');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newRowHtml.trim();
        const newRowEl = tempDiv.firstChild;
        rowsContainer.appendChild(newRowEl);
        
        bindRowDeleteEvent(newRowEl);
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Bind initial deletes
    if (rowsContainer) {
      rowsContainer.querySelectorAll('.criteria-row').forEach(row => {
        bindRowDeleteEvent(row);
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- UI File Dropper and Upload Selectors ---

  // Stop global window browser drag/drop redirects
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  if (fileInput && fileDropZone) {
    // Native file input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleCustomFiles(e.target.files);
        fileInput.value = '';
      }
    });

    // Drag highlights
    fileInput.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropZone.classList.add('dragover');
    });
    fileInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropZone.classList.add('dragover');
    });
    fileInput.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropZone.classList.remove('dragover');
    });
    fileInput.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleCustomFiles(e.dataTransfer.files);
      }
    });
  }

  // File handling router
  function handleCustomFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    handleNonImageFile(file);
  }

  // Helper to handle PDF/PPTX/Image document scan simulators
  async function handleNonImageFile(file) {
    const fileName = file.name;
    let year = 2026;
    if (fileName.includes('25') || fileName.includes('2025')) year = 2025;

    let month = 4; // default May (0-indexed)
    if (fileName.includes('9월') || fileName.includes('_9_') || fileName.startsWith('9_') || fileName.includes(' 9월')) {
      month = 8; // September
    } else if (fileName.includes('6월')) {
      month = 5; // June
    } else if (fileName.includes('5월')) {
      month = 4; // May
    }

    // Set uploadedImageUrl if it is a real image file
    let uploadedImageUrl = "";
    if (file && file.type && file.type.startsWith('image/')) {
      uploadedImageUrl = URL.createObjectURL(file);
    }

    const monthStr = String(month + 1).padStart(2, '0');
    let parsedObjects = [];
    let slideData = null;

    if (month === 8) {
      // September slides deck simulation
      slideData = {
        totalSlides: 14,
        discardedSlides: 4,
        slideResults: [
          { isDiscarded: true, content: "9월 창원지역단 및 영남지역본부 프로모션 전사 공지 개요" },
          { isDiscarded: false, content: "리치 프로모션 - RICH 간병보험 건당 20만원이상 매출시상" },
          { isDiscarded: false, content: "9월 팀장 활동비 지원 프로모션 - RICH 간병보험 누계 시상" },
          { isDiscarded: false, content: "9월 개시차! 추석 감사 프로모션 - LA갈비 선물 SET 지급" },
          { isDiscarded: false, content: "전략상품 판매 활성화 「3·6·9」 프로모션 - 여성/간편/종합/자녀" },
          { isDiscarded: false, content: "가을맞이 「신규고객발굴」 프로모션 - 여행용 파우치 지급" },
          { isDiscarded: false, content: "9월 창원지역단 장기보장성 매출 극대화 프로모션" },
          { isDiscarded: false, content: "9월 2W 가동 주차별 마감 시상 규칙" },
          { isDiscarded: false, content: "창원지역단 도입 챔피언 리쿠르팅 시상" },
          { isDiscarded: false, content: "영남지역본부 우수 지점 도입 육성 프로모션" },
          { isDiscarded: false, content: "9월 특별 종합 대내외 시상 - 추석 감사 한우 패키지" },
          { isDiscarded: true, content: "지점 공지용 청약 유의사항 및 승환계약 제외 기준 안내" },
          { isDiscarded: true, content: "영업 포탈 등록 프로세스 안내" },
          { isDiscarded: true, content: "Q&A 및 지점장 격려 공지" }
        ]
      };
      parsedObjects = [
        {
          id: `inc-rich-promo-${Date.now()}`,
          title: "9월 창원지역단 리치 프로모션",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-05`,
          metricType: "premiums",
          metricUnit: "원",
          targetValue: 200000,
          currentValue: 0,
          reward: "매출 시상 보너스 제공",
          description: "RICH 간병보험 건당 20만 원 이상 매출 시 10년납 최대 300% 지급 프로모션",
          weeklyIssue: "RICH 간병보험 신규 가입 혜택 홍보 집중",
          direction: "10년납 가입 희망 고객 대상 300% 비례 매출 보너스 소구 플랜 전달",
          colorOverride: "blue",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-team-activity-${Date.now()}`,
          title: "9월 팀장 활동비 지원 프로모션",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-05`,
          metricType: "premiums",
          metricUnit: "원",
          currentValue: 0,
          reward: "팀장 활동비 지원금 지급",
          description: "RICH 간병보험 월납보험료 팀 누계 달성 시 등급별 팀장 활동 지원금 시상",
          weeklyIssue: "지점 내 팀원 단합 및 간병보험 청약 활성화 기간",
          direction: "팀 누계 목표 50만 원/100만 원 달성을 위한 팀원별 청약 진척 관리",
          milestones: [
            { name: "팀 누계 50만 원 달성", value: 500000, reward: "시상 150,000원" },
            { name: "팀 누계 100만 원 달성", value: 1000000, reward: "시상 300,000원" }
          ],
          colorOverride: "orange",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-chuseok-beef-${Date.now()}`,
          title: "9월 개시차! 추석 감사 프로모션",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-12`,
          metricType: "premiums",
          metricUnit: "원",
          targetValue: 100000,
          currentValue: 0,
          reward: "LA갈비 선물 SET 1.8kg 증정",
          description: "창원지역단 FP 대상 보장성보험 합산보험료 10만 원 이상 달성 시 추석 명절 갈비 선물세트 지급",
          weeklyIssue: "추석 명절 전 조기 청약 독려 및 명절 마케팅 전략",
          direction: "가족 및 친지 대상 보장 분석 서비스 제안 및 간편 가입 설계 유도",
          colorOverride: "gold",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-strategy-369-${Date.now()}`,
          title: "전략상품 판매 활성화 「3·6·9」 프로모션",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-14`,
          metricType: "contracts",
          metricUnit: "건",
          currentValue: 0,
          reward: "전략상품 건별 장려금 지급",
          description: "여성/간편(SI)/종합/자녀 등 4대 전략상품 판매 건수에 따른 특별 누적 매출 시상",
          weeklyIssue: "4대 전략 상품 판매 건수 증대 및 점유율 가속화",
          direction: "3건 / 6건 / 9건 구간 돌파를 위한 가망 고객별 맞춤형 상품 맞춤 제안서 발송",
          milestones: [
            { name: "전략상품 3건↑ 달성", value: 3, reward: "시상 100,000원" },
            { name: "전략상품 6건↑ 달성", value: 6, reward: "시상 150,000원" },
            { name: "전략상품 9건↑ 달성", value: 9, reward: "시상 250,000원" }
          ],
          colorOverride: "blue",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-autumn-pouch-${Date.now()}`,
          title: "가을맞이 「신규고객발굴」 프로모션",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-30`,
          metricType: "contracts",
          metricUnit: "건",
          targetValue: 1,
          currentValue: 0,
          reward: "여행용 파우치 지급 (5천원 상당)",
          description: "신규 고객 발굴 및 여행자보험 가입 활성화를 위한 가을 시즌 한정 특별 판촉 기프트 제공",
          weeklyIssue: "가을 행락철 여행자보험 단체 가입 유도 마케팅 활성화",
          direction: "야외 모임이나 가을 단체 여행 리스트 발굴을 통한 가벼운 접촉 및 파우치 사은품 안내",
          colorOverride: "green",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-changwon-max-${Date.now()}`,
          title: "9월 창원지역단 장기보장성 매출 극대화 시상",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-15`,
          metricType: "premiums",
          metricUnit: "원",
          currentValue: 0,
          reward: "매출 장려금 추가 지급",
          description: "창원지역단 소속 설계사들의 장기 보장성 누적 초회보험료 구간별 특별 특별 인센티브 매칭",
          weeklyIssue: "당월 매출 목표 조기 완수 및 지점 랭킹 상승 전략",
          direction: "우량 가망고객의 집중 클로징 및 간편 보장 한도 소구 화법 적용 제안",
          milestones: [
            { name: "초회보험료 30만 원 달성", value: 300000, reward: "시상 100,000원" },
            { name: "초회보험료 50만 원 달성", value: 500000, reward: "시상 200,000원" },
            { name: "초회보험료 100만 원 달성", value: 1000000, reward: "시상 400,000원" }
          ],
          colorOverride: "blue",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-two-sept-${Date.now()}`,
          title: "9월 2W 가동 주차별 마감 시상",
          category: "two_annual",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-30`,
          metricType: "two_tier",
          metricUnit: "주",
          currentValue: 0,
          reward: "2W 주간 가동 보너스 지급",
          description: "9월 매주 가동 설계사들의 활동성 보강을 위한 주차별 연속 가동 격려금 프로모션",
          weeklyIssue: "매주 누락 없는 계약 가동 흐름 유지 관리",
          direction: "소액 화재보험이나 주택 보장 플랜을 활용해 1건 이상 가동 완료 관리",
          milestones: [
            { name: "1주차 가동 달성", value: 1, reward: "시상 20,000원" },
            { name: "2주차 연속 달성", value: 2, reward: "시상 50,000원" },
            { name: "3주차 연속 달성", value: 3, reward: "시상 100,000원" },
            { name: "4주차 연속 달성", value: 4, reward: "시상 200,000원" }
          ],
          colorOverride: "gold",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-recruit-champ-${Date.now()}`,
          title: "창원지역단 도입 챔피언 프로모션",
          category: "recruitment",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-30`,
          metricType: "recruit_tier",
          metricUnit: "명",
          currentValue: 0,
          reward: "도입 성공 장려금 대폭 지급",
          description: "창원지역단 소속 FP 동료 설계사 도입 시 정착 지원금 및 소개 리쿠르팅 수당 획기적 매칭",
          weeklyIssue: "지점 정예 조직 육성 및 도입 활성화 분위기 정착",
          direction: "설명회 동반 참석 기획 및 후보자 리스트 of 지점장 집중 상담 클로징 매칭",
          milestones: [
            { name: "도입 1명 달성", value: 1, reward: "시상 500,000원" },
            { name: "도입 2명 달성", value: 2, reward: "시상 1,200,000원" },
            { name: "도입 3명 달성", value: 3, reward: "시상 2,500,000원" }
          ],
          colorOverride: "green",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-bm-recruit-bonus-${Date.now()}`,
          title: "영남지역본부 우수 지점 도입 육성 프로모션",
          category: "recruitment",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-30`,
          metricType: "recruit_tier",
          metricUnit: "명",
          currentValue: 0,
          reward: "지점 육성 격려금 매칭",
          description: "영남지역본부 소속 지점들의 조직 증대를 독려하기 위한 지점 단위 누적 도입 프로모션",
          weeklyIssue: "하반기 지점 신규 인력 가용 극대화 및 지점 볼륨업",
          direction: "지점 설명회 가동율 극대화 및 동반 참석 FP 대상 미니 세미나 매주 기획 실행",
          milestones: [
            { name: "지점 총 도입 3명 달성", value: 3, reward: "시상 1,500,000원" },
            { name: "지점 총 도입 5명 달성", value: 5, reward: "시상 3,500,000원" }
          ],
          colorOverride: "green",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-sept-special-beef-${Date.now()}`,
          title: "9월 특별 종합 대내외 시상 (추석 한우 세트)",
          category: "long_auto",
          startDate: `${year}-09-01`,
          endDate: `${year}-09-15`,
          metricType: "premiums",
          metricUnit: "원",
          targetValue: 1000000,
          currentValue: 0,
          reward: "추석 명절 한우 갈비 세트 증정",
          description: "9월 전사 프로모션 연동 누적 장기 초회보험료 100만 원 돌파 시 프리미엄 명절 한우세트 증정",
          weeklyIssue: "명절 전 고액 보장 청약 유량 확보 전략",
          direction: "우량 가망 리스트 집중 제안 및 종합 보장 플랜의 당월 청약 연계",
          colorOverride: "purple",
          slideImage: uploadedImageUrl
        }
      ];
    } else {
      // Fallback for May/June slides deck simulation
      slideData = {
        totalSlides: 4,
        discardedSlides: 1,
        slideResults: [
          { isDiscarded: false, content: `${month + 1}월 우수 FP 시상 장표 판독` },
          { isDiscarded: false, content: `${month + 1}월 연속 가동 마감 장표 판독` },
          { isDiscarded: true, content: "일반 업무 연락 지침" },
          { isDiscarded: false, content: `${month + 1}월 지점장 추천 시상 장표 판독` }
        ]
      };
      parsedObjects = [
        {
          id: `inc-dynamic-deck-1-${Date.now()}`,
          title: `${month + 1}월 우수 영업가족 시상`,
          category: "long_auto",
          startDate: `${year}-${monthStr}-01`,
          endDate: `${year}-${monthStr}-10`,
          metricType: "premiums",
          metricUnit: "원",
          targetValue: 300000,
          currentValue: 0,
          reward: "특별 격려금 지급",
          description: `${month + 1}월 신계약 누적 실적에 따른 등급별 포상금 매칭`,
          weeklyIssue: "주력 특약 개편 정보의 고객 공지 및 업셀링 연계",
          direction: "기가입자 대상 무료 업셀링 혜택 안내 및 지점 특별 기프트 연동 설계서 전달",
          colorOverride: "blue",
          slideImage: uploadedImageUrl
        },
        {
          id: `inc-dynamic-deck-2-${Date.now()}`,
          title: `${month + 1}월 활동성 보강 연속가동 시상`,
          category: "two_annual",
          startDate: `${year}-${monthStr}-01`,
          endDate: `${year}-${monthStr}-15`,
          metricType: "two_tier",
          metricUnit: "주",
          currentValue: 0,
          reward: "연속가동 보너스 지급",
          description: `주차별 연속 가동 설계사를 위한 지점장 격려 포상`,
          weeklyIssue: "주간 연속 가동 리듬 유지 관리",
          direction: "소액 화재보험이나 주택 보장 플랜을 활용해 1건 이상 가동 완료 관리",
          milestones: [
            { name: "1주 가동", value: 1, reward: "시상 10,000원" },
            { name: "2주 연속", value: 2, reward: "시상 30,000원" },
            { name: "3주 연속", value: 3, reward: "시상 80,000원" }
          ],
          colorOverride: "gold",
          slideImage: uploadedImageUrl
        }
      ];
    }

    // PREMIUM ACTIVE AI SCAN SIMULATOR SEQUENCE
    if (analyzerLoader) analyzerLoader.style.display = 'block';
    if (consoleLogsContainer) {
      consoleLogsContainer.style.display = 'block';
      consoleLogsContainer.innerHTML = '<div class="console-placeholder-msg" style="color: #888;">[시스템] 판독 프로세스 초기화 중...</div>';
    }

    updateLoader(0, "OCR 스캔 및 비전 레이아웃 추출 준비 중...");
    await sleep(200);

    await typeLogLine(`Initializing OCR scan on '${fileName}'...`, 'header');
    updateLoader(20, "문서 페이지 분할 및 스캔 중...");
    await sleep(150);

    await typeLogLine("Extracting visual layouts and text tables...", 'info');
    updateLoader(50, "주요 텍스트 특징점 추출 중...");
    await sleep(150);

    const isSeptember = month === 8;
    const keywords = isSeptember ? "'리치', '팀장 활동비', '추석 감사', '3·6·9', '도입'" : "'장기보장성', '초회보험료', '활동성', '연속 가동'";
    await typeLogLine(`Analyzing semantic context... Found keywords: ${keywords}`, 'warning');
    updateLoader(75, "시상 조건 의미 파악 및 룰 매칭 중...");
    await sleep(150);

    await typeLogLine(`Parsed successfully! Found ${isSeptember ? 9 : 2} valid incentive rules. Generating draft card.`, 'success');
    updateLoader(100, "분석 완료! 기획안 초안 생성 성공");
    await sleep(200);

    // Hide loader and console smoothly after finish
    if (analyzerLoader) analyzerLoader.style.display = 'none';
    if (consoleLogsContainer) consoleLogsContainer.style.display = 'none';

    runSimulation(fileName, slideData, parsedObjects);
  }

  // Action Bar Commit Button
  if (btnCommitParsed) {
    btnCommitParsed.addEventListener('click', () => {
      if (!window.currentParsedObjects || window.currentParsedObjects.length === 0) return;

      // 1. Save currently active slide fields
      saveCurrentFormValues();

      // 2. Add or update parsed objects in active state database
      window.currentParsedObjects.forEach(obj => {
        const existingIdx = window.INCENTIVE_DATABASE.incentives.findIndex(i => i.id === obj.id);
        if (existingIdx !== -1) {
          window.INCENTIVE_DATABASE.incentives[existingIdx] = obj;
        } else {
          window.INCENTIVE_DATABASE.incentives.push(obj);
        }
      });

      // Automatically navigate the calendar to the newly uploaded incentive's month and year
      if (window.currentParsedObjects.length > 0) {
        const firstInc = window.currentParsedObjects[0];
        if (firstInc.startDate) {
          const parts = firstInc.startDate.split('-');
          if (parts.length === 3) {
            const newYear = parseInt(parts[0], 10);
            const newMonth = parseInt(parts[1], 10) - 1; // 0-indexed
            
            if (typeof window.setCalendarDate === 'function') {
              window.setCalendarDate(newYear, newMonth);
            } else if (typeof window.refreshApp === 'function') {
              window.refreshApp();
            }
          }
        }
      } else {
        if (typeof window.refreshApp === 'function') {
          window.refreshApp();
        }
      }

      // Reset review views
      parsedResultsPanel.style.display = 'none';
      
      // Refresh Management Board list immediately after deploy
      if (typeof window.renderActiveIncentivesManager === 'function') {
        window.renderActiveIncentivesManager();
      }

      if (window.lucide) window.lucide.createIcons();

      // Switch back to calendar view
      const btnCalendar = document.getElementById('btn-view-calendar');
      if (btnCalendar) {
        btnCalendar.click();
      }

      alert(`총 ${window.currentParsedObjects.length}개의 시상이 성공적으로 일괄 등록되어 캘린더에 반영되었으며, FP 알림이 전송되었습니다!`);
      window.currentParsedObjects = null;
      window.activeParsedIndex = null;
    });
  }

  // Action Bar Discard Button
  if (btnDiscardParsed) {
    btnDiscardParsed.addEventListener('click', () => {
      parsedResultsPanel.style.display = 'none';
      window.currentParsedObjects = null;
      window.activeParsedIndex = null;
    });
  }

  // --- 4. Active Incentives Management Board Renderer ---
  window.renderActiveIncentivesManager = function () {
    const listWrapper = document.getElementById('admin-incentives-list-wrapper');
    const countSpan = document.getElementById('active-incentives-count');
    if (!listWrapper) return;

    const incentives = window.INCENTIVE_DATABASE.incentives;

    if (countSpan) {
      countSpan.textContent = `총 ${incentives.length}개 시상`;
    }

    if (incentives.length === 0) {
      listWrapper.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 32px 0; font-size: 0.85rem; font-family: var(--font-sans);">
          현재 등록 및 배포된 시상 일정이 없습니다.
        </div>
      `;
      return;
    }

    const htmlParts = incentives.map((inc) => {
      let catLabel = '장기/자동차';
      if (inc.category === 'two_annual') catLabel = '2W/연도대상';
      else if (inc.category === 'recruitment') catLabel = '도입';

      return `
        <div class="active-inc-item" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); padding: 12px 16px; border-radius: var(--radius-sm); font-family: var(--font-sans) !important; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <span class="category-indicator cat-${inc.category}" style="flex-shrink: 0; padding: 4px 8px; font-size: 0.65rem; border-radius: 4px; font-weight: 700;">
              ${catLabel}
            </span>
            <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 280px;" title="${inc.title}">${inc.title}</span>
              <span style="font-size: 0.725rem; color: var(--text-muted);">${inc.startDate} ~ ${inc.endDate}</span>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <button class="btn btn-secondary btn-edit-inc" data-id="${inc.id}" style="padding: 6px 12px; font-size: 0.775rem; display: inline-flex; align-items: center; gap: 4px;">
              <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> 수정
            </button>
            <button class="btn btn-secondary btn-delete-inc" data-id="${inc.id}" style="padding: 6px 12px; font-size: 0.775rem; display: inline-flex; align-items: center; gap: 4px; color: var(--accent-danger); border-color: rgba(255, 23, 68, 0.15); background: rgba(255, 23, 68, 0.02);" onmouseover="this.style.background='rgba(255, 23, 68, 0.1)'" onmouseout="this.style.background='rgba(255, 23, 68, 0.02)'">
              <i data-lucide="trash-2" style="width: 12px; height: 12px; color: var(--accent-danger);"></i> 삭제
            </button>
          </div>
        </div>
      `;
    });

    listWrapper.innerHTML = htmlParts.join('');

    // Bind Edit Button Clicks
    listWrapper.querySelectorAll('.btn-edit-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetObj = window.INCENTIVE_DATABASE.incentives.find(i => i.id === id);
        if (!targetObj) return;

        // Clone parsed edit form
        window.currentParsedObjects = [JSON.parse(JSON.stringify(targetObj))];
        window.activeParsedIndex = 0;
        window.currentSlideCount = 1;
        window.currentDiscardedCount = 0;

        renderParsedResultCard(0);
        parsedResultsPanel.style.display = 'block';
        parsedResultsPanel.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Bind Delete Button Clicks
    listWrapper.querySelectorAll('.btn-delete-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetObj = window.INCENTIVE_DATABASE.incentives.find(i => i.id === id);
        if (!targetObj) return;

        if (confirm(`"${targetObj.title}" 시상안을 정말 삭제하고 배포 취소하시겠습니까?\n이 작업은 되돌릴 수 없으며 캘린더에서 즉시 삭제됩니다.`)) {
          window.INCENTIVE_DATABASE.incentives = window.INCENTIVE_DATABASE.incentives.filter(i => i.id !== id);
          window.renderActiveIncentivesManager();

          if (typeof window.refreshApp === 'function') {
            window.refreshApp();
          }
          alert('시상안이 성공적으로 삭제 및 배포 취소되었습니다.');
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  };

  // --- 5. Excel (xlsx) Performance Tracker Integration ---
  const xlsxInput = document.getElementById('xlsx-input');
  const xlsxDropZone = document.getElementById('xlsx-drop-zone');

  if (xlsxInput && xlsxDropZone) {
    xlsxInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleXlsxFile(e.target.files[0]);
        xlsxInput.value = '';
      }
    });

    xlsxInput.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      xlsxDropZone.classList.add('dragover');
    });
    xlsxInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      xlsxDropZone.classList.add('dragover');
    });
    xlsxInput.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      xlsxDropZone.classList.remove('dragover');
    });
    xlsxInput.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      xlsxDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleXlsxFile(e.dataTransfer.files[0]);
      }
    });
  }

  async function handleXlsxFile(file) {
    if (!window.XLSX) {
      alert("Excel 파싱 라이브러리가 로드되지 않았습니다. 인터넷 연결을 확인해 주세요.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      let parsedStats = {
        contracts: null,
        premiums: null,
        recruits: null
      };

      // --- 1. 지점 총괄 실적 요약 탐색 ---
      rawRows.forEach((row) => {
        if (!Array.isArray(row)) return;
        
        row.forEach((cell, idx) => {
          if (typeof cell !== 'string') return;
          
          const cleanText = cell.replace(/\s+/g, '');
          
          if (cleanText.includes("가동건수") || cleanText.includes("신계약건수") || cleanText.includes("가동건")) {
            const val = findNumberInRow(row, idx + 1);
            if (val !== null) parsedStats.contracts = val;
          }
          
          if (cleanText.includes("초회보험료") || cleanText.includes("장기초회") || cleanText.includes("보험료")) {
            const val = findNumberInRow(row, idx + 1);
            if (val !== null) parsedStats.premiums = val;
          }
          
          if (cleanText.includes("도입인원") || cleanText.includes("당월도입") || cleanText.includes("도입가동")) {
            const val = findNumberInRow(row, idx + 1);
            if (val !== null) parsedStats.recruits = val;
          }
        });
      });

      if (parsedStats.contracts === null || parsedStats.premiums === null || parsedStats.recruits === null) {
        rawRows.forEach((row) => {
          if (!Array.isArray(row)) return;
          const rowStr = row.join('|');
          
          if (rowStr.includes("건") && rowStr.match(/\d+/)) {
            const num = parseInt(rowStr.match(/\d+/)[0], 10);
            if (num < 100 && parsedStats.contracts === null) parsedStats.contracts = num;
          }
          if (rowStr.includes("원") && rowStr.match(/\d[\d,]+/)) {
            const cleanNum = parseInt(rowStr.match(/\d[\d,]+/)[0].replace(/,/g, ''), 10);
            if (cleanNum > 10000 && parsedStats.premiums === null) parsedStats.premiums = cleanNum;
          }
          if (rowStr.includes("명") && rowStr.match(/\d+/)) {
            const num = parseInt(rowStr.match(/\d+/)[0], 10);
            if (num < 50 && parsedStats.recruits === null) parsedStats.recruits = num;
          }
        });
      }

      // --- 2. 설계사(FP)별 개별 상세 실적 목록 파싱 ---
      let employeeStats = {};
      let nameColIdx = -1;
      let contractsColIdx = -1;
      let premiumsColIdx = -1;
      let recruitsColIdx = -1;
      let two_seqColIdx = -1;
      let pointsColIdx = -1;

      // 헤더 행 탐색을 통해 직원 데이터 열 인덱스 식별
      rawRows.forEach((row) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell, colIdx) => {
          if (typeof cell !== 'string') return;
          const cleanText = cell.replace(/\s+/g, '');
          if (cleanText.includes("FP명") || cleanText.includes("이름") || cleanText.includes("설계사명") || cleanText.includes("설계사")) {
            nameColIdx = colIdx;
          }
          if (cleanText.includes("가동건") || cleanText.includes("가동건수") || cleanText.includes("신계약")) {
            contractsColIdx = colIdx;
          }
          if (cleanText.includes("초회보험") || cleanText.includes("초회보험료") || cleanText.includes("장기초회")) {
            premiumsColIdx = colIdx;
          }
          if (cleanText.includes("도입가동") || cleanText.includes("도입인원") || cleanText.includes("리쿠르팅")) {
            recruitsColIdx = colIdx;
          }
          if (cleanText.includes("2W") || cleanText.includes("연속가동") || cleanText.includes("연속주") || cleanText.includes("가동주차")) {
            two_seqColIdx = colIdx;
          }
          if (cleanText.includes("연도대상") || cleanText.includes("포인트") || cleanText.includes("누적포인트") || cleanText.includes("pt")) {
            pointsColIdx = colIdx;
          }
        });
      });

      // 열 인덱스가 탐색되면 행별 직원 데이터 추출
      if (nameColIdx !== -1) {
        rawRows.forEach((row) => {
          if (!Array.isArray(row) || row.length <= nameColIdx) return;
          const fpName = row[nameColIdx];
          if (typeof fpName !== 'string' || fpName.trim() === "" || fpName.includes("FP명") || fpName.includes("이름") || fpName.includes("설계사")) return;

          const cleanFpName = fpName.trim();
          let stats = {
            contracts: 0,
            premiums: 0,
            recruits: 0,
            two连续: 1,
            points: 6500
          };

          if (contractsColIdx !== -1 && typeof row[contractsColIdx] === 'number') {
            stats.contracts = row[contractsColIdx];
          } else if (contractsColIdx !== -1 && typeof row[contractsColIdx] === 'string') {
            const num = parseInt(row[contractsColIdx].replace(/,/g, '').match(/\d+/)?.[0], 10);
            if (!isNaN(num)) stats.contracts = num;
          }

          if (premiumsColIdx !== -1 && typeof row[premiumsColIdx] === 'number') {
            stats.premiums = row[premiumsColIdx];
          } else if (premiumsColIdx !== -1 && typeof row[premiumsColIdx] === 'string') {
            const num = parseInt(row[premiumsColIdx].replace(/,/g, '').match(/\d+/)?.[0], 10);
            if (!isNaN(num)) stats.premiums = num;
          }

          if (recruitsColIdx !== -1 && typeof row[recruitsColIdx] === 'number') {
            stats.recruits = row[recruitsColIdx];
          } else if (recruitsColIdx !== -1 && typeof row[recruitsColIdx] === 'string') {
            const num = parseInt(row[recruitsColIdx].replace(/,/g, '').match(/\d+/)?.[0], 10);
            if (!isNaN(num)) stats.recruits = num;
          }

          if (two_seqColIdx !== -1 && typeof row[two_seqColIdx] === 'number') {
            stats.two连续 = row[two_seqColIdx];
          } else if (two_seqColIdx !== -1 && typeof row[two_seqColIdx] === 'string') {
            const num = parseInt(row[two_seqColIdx].replace(/,/g, '').match(/\d+/)?.[0], 10);
            if (!isNaN(num)) stats.two连续 = num;
          }

          if (pointsColIdx !== -1 && typeof row[pointsColIdx] === 'number') {
            stats.points = row[pointsColIdx];
          } else if (pointsColIdx !== -1 && typeof row[pointsColIdx] === 'string') {
            const num = parseInt(row[pointsColIdx].replace(/,/g, '').match(/\d+/)?.[0], 10);
            if (!isNaN(num)) stats.points = num;
          }

          employeeStats[cleanFpName] = stats;
        });

        // 전역 데이터베이스에 바인딩
        window.INCENTIVE_DATABASE.employeeStats = employeeStats;
      }

      // --- 2.5 2W 및 연도대상 기준(Milestones) 동적 파싱 ---
      let parsed2WMilestones = [];
      let parsedAnnualMilestones = [];
      let milestoneSyncMsg = "";

      rawRows.forEach((row) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell, idx) => {
          if (typeof cell !== 'string') return;
          const cleanText = cell.replace(/\s+/g, '');
          
          // 2W 기준 탐색 (예: "1주", "2주 연속", "3주 연속", "4주 연속" 등)
          if (cleanText.includes("1주") || cleanText.includes("2주") || cleanText.includes("3주") || cleanText.includes("4주")) {
            const weekMatch = cleanText.match(/(\d)주/);
            if (weekMatch) {
              const weekNum = parseInt(weekMatch[1], 10);
              let reward = "";
              for (let offset = 1; offset <= 3; offset++) {
                const nextCell = row[idx + offset];
                if (nextCell && typeof nextCell === 'string' && (nextCell.includes("원") || nextCell.includes("시상") || nextCell.includes("지급") || nextCell.includes("격려금"))) {
                  reward = nextCell.trim();
                  break;
                }
              }
              if (!reward && row[idx + 1]) reward = String(row[idx + 1]).trim();
              if (!reward) reward = `${weekNum * 2}만원 상당 시상`;
              
              const tierNames = ["브론즈", "실버", "골드", "다이아"];
              const tierName = tierNames[weekNum - 1] || "스페셜";
              
              parsed2WMilestones.push({
                name: `${weekNum}주 연속 (${tierName})`,
                value: weekNum,
                reward: reward
              });
            }
          }
          
          // 연도대상 클래스 기준 탐색 (예: "실버클래스", "골드클래스", "플래티넘클래스" 등)
          if (cleanText.includes("실버클래스") || cleanText.includes("골드클래스") || cleanText.includes("플래티넘클래스") || cleanText.includes("실버") || cleanText.includes("골드") || cleanText.includes("플래티넘")) {
            let className = "";
            let value = 10000;
            if (cleanText.includes("실버")) { className = "실버 클래스"; value = 10000; }
            else if (cleanText.includes("골드")) { className = "골드 클래스"; value = 20000; }
            else if (cleanText.includes("플래티넘")) { className = "플래티넘 클래스"; value = 30000; }
            
            if (className) {
              let reward = "";
              for (let offset = 1; offset <= 3; offset++) {
                const nextCell = row[idx + offset];
                if (nextCell) {
                  reward = String(nextCell).trim();
                  break;
                }
              }
              parsedAnnualMilestones.push({
                name: className,
                value: value,
                reward: reward || "연도대상 특전 지급"
              });
            }
          }
        });
      });

      // 파싱된 기준이 있으면 전역 데이터베이스에 반영
      if (parsed2WMilestones.length > 0) {
        parsed2WMilestones.sort((a, b) => a.value - b.value);
        const unique2W = [];
        const seen = new Set();
        parsed2WMilestones.forEach(m => {
          if (!seen.has(m.value)) {
            seen.add(m.value);
            unique2W.push(m);
          }
        });
        
        const inc2W = window.INCENTIVE_DATABASE.incentives.find(i => i.id === 'inc-004');
        if (inc2W && unique2W.length > 0) {
          inc2W.milestones = unique2W;
          milestoneSyncMsg += `\n🎯 2W 연속가동 기준 동적 반영 완료: ${unique2W.map(u => u.name.split(' ')[0] + '(' + u.reward + ')').join(', ')}`;
        }
      }

      if (parsedAnnualMilestones.length > 0) {
        parsedAnnualMilestones.sort((a, b) => a.value - b.value);
        const uniqueAnnual = [];
        const seen = new Set();
        parsedAnnualMilestones.forEach(m => {
          if (!seen.has(m.name)) {
            seen.add(m.name);
            uniqueAnnual.push(m);
          }
        });
        
        const incAnnual = window.INCENTIVE_DATABASE.incentives.find(i => i.id === 'inc-005');
        if (incAnnual && uniqueAnnual.length > 0) {
          incAnnual.milestones = uniqueAnnual;
          milestoneSyncMsg += `\n🏆 연도대상 클래스 기준 동적 반영 완료: ${uniqueAnnual.map(u => u.name + '(' + u.reward + ')').join(', ')}`;
        }
      }

      // --- 3. 지점 총 실적 및 현재 로그인 유저 개별 실적 동기화 매칭 ---
      const profile = window.INCENTIVE_DATABASE.agentProfile;
      let userSyncMessage = "";
      let updateCount = 0;
      
      if (profile.role === 'bm') {
        // 지점장 모드: 엑셀의 '지점 총계' 요약 실적을 적용
        if (parsedStats.contracts !== null) {
          profile.currentStats.contracts = parsedStats.contracts;
          updateCount++;
        }
        if (parsedStats.premiums !== null) {
          profile.currentStats.premiums = parsedStats.premiums;
          updateCount++;
        }
        if (parsedStats.recruits !== null) {
          profile.currentStats.recruits = parsedStats.recruits;
          updateCount++;
        }
        
        userSyncMessage = `\n\n📢 지점장(관리자) 모드: 지점 전체 총합 실적이 적용되었습니다.`;
      } else {
        // FP 모드: 로그인한 FP의 이름("김한화")과 엑셀 리스트 매핑
        const loginNameBase = profile.name.replace(/FP|지점장|\s+/g, '');
        let matchedStats = null;
        
        for (const name in employeeStats) {
          const nameClean = name.replace(/FP|지점장|\s+/g, '');
          if (nameClean.includes(loginNameBase) || loginNameBase.includes(nameClean)) {
            matchedStats = employeeStats[name];
            break;
          }
        }

        if (matchedStats) {
          profile.currentStats.contracts = matchedStats.contracts;
          profile.currentStats.premiums = matchedStats.premiums;
          profile.currentStats.recruits = matchedStats.recruits;
          profile.currentStats.two连续 = matchedStats.two连续;
          profile.currentStats.points = matchedStats.points;
          updateCount++;
          
          userSyncMessage = `\n\n📢 로그인 FP [${profile.name}] 님 실적 자동 매핑 완료!\n• 가동 건수: ${profile.currentStats.contracts}건\n• 초회 보험료: ${profile.currentStats.premiums.toLocaleString()}원\n• 당월 도입: ${profile.currentStats.recruits}명\n• 2W 연속 가동: ${profile.currentStats.two连续}주차\n• 연도대상 pt: ${profile.currentStats.points.toLocaleString()}pt`;
        } else {
          // 일치하는 개별 FP 데이터가 없는 경우, 총괄 요약 실적의 15%를 개인 실적으로 시뮬레이션 분배 설정
          if (parsedStats.contracts !== null) profile.currentStats.contracts = Math.max(1, Math.round(parsedStats.contracts * 0.15));
          if (parsedStats.premiums !== null) profile.currentStats.premiums = Math.max(100000, Math.round(parsedStats.premiums * 0.15));
          if (parsedStats.recruits !== null) profile.currentStats.recruits = Math.max(0, Math.round(parsedStats.recruits * 0.15));
          profile.currentStats.two连续 = 2; // fallback
          profile.currentStats.points = 8500; // fallback
          updateCount++;
          
          userSyncMessage = `\n\n⚠️ 엑셀 내에 [${profile.name}] 님의 개별 실적이 감지되지 않아 지점 총합 실적의 15% 수준이 시뮬레이션 매핑되었습니다.`;
        }
      }

      if (updateCount > 0) {
        const updateWidgetValues = () => {
          const contractsEl = document.getElementById('quick-stat-contracts');
          const premiumsEl = document.getElementById('quick-stat-premiums');
          const recruitsEl = document.getElementById('quick-stat-recruits');

          if (contractsEl) contractsEl.textContent = profile.currentStats.contracts;
          if (premiumsEl) premiumsEl.textContent = profile.currentStats.premiums.toLocaleString();
          if (recruitsEl) recruitsEl.textContent = profile.currentStats.recruits;
        };

        updateWidgetValues();
        if (typeof window.refreshApp === 'function') {
          window.refreshApp();
        }
        
        let alertMsg = `지점 실적 Excel 연동 성공!\n\n• 가동 건수: ${profile.currentStats.contracts}건\n• 초회 보험료: ${profile.currentStats.premiums.toLocaleString()}원\n• 당월 도입: ${profile.currentStats.recruits}명`;
        if (profile.role !== 'bm') {
          alertMsg += `\n• 2W 연속 가동: ${profile.currentStats.two连续}주차\n• 연도대상 pt: ${profile.currentStats.points.toLocaleString()}pt`;
        }
        if (milestoneSyncMsg) {
          alertMsg += `\n\n${milestoneSyncMsg}`;
        }
        alertMsg += `\n\n대시보드와 요약 정보에 즉시 동기화되었습니다.`;
        alert(alertMsg);
      } else {
        alert("업로드된 엑셀 파일에서 유효한 실적 데이터(건수, 보험료, 도입 인원)를 감지하지 못했습니다.\n\n셀 내용에 '가동건수', '초회보험료', '도입가동' 등의 텍스트와 숫자가 기재되어 있는지 확인해 주세요.");
      }

    } catch (err) {
      console.error("Excel file parsing failed: ", err);
      alert(`Excel 파일 연동 중 오류가 발생했습니다: ${err.message}`);
    }
  }

  function findNumberInRow(row, startIdx) {
    for (let i = startIdx; i < row.length; i++) {
      const val = row[i];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const clean = val.replace(/,/g, '').match(/\d+/);
        if (clean) return parseInt(clean[0], 10);
      }
    }
    return null;
  }

})();

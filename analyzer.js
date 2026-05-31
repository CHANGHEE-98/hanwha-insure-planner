// C:\Users\user\.gemini\antigravity\scratch\hanwha-insure-incentives\analyzer.js

(function () {
  // Store the active parsing simulation state for multi-slide processing
  window.currentParsedObjects = null;
  window.activeParsedIndex = null;
  window.currentSlideCount = 0;
  window.currentDiscardedCount = 0;

  // Available high-fidelity slide screenshots for manual selection in review board
  const AVAILABLE_SLIDES = [
    { name: "9월 리치 프로모션", url: "images/media__1780194708878.png" },
    { name: "9월 팀장 활동비", url: "images/media__1780194704189.png" },
    { name: "9월 추석 LA갈비", url: "images/media__1780194714188.png" },
    { name: "9월 3·6·9 전략상품", url: "images/media__1780194720206.png" },
    { name: "9월 신규고객 파우치", url: "images/media__1780193024121.png" },
    { name: "9월 매출 극대화", url: "images/media__1780194694232.png" },
    { name: "9월 2W 마감 시상", url: "images/media__1780195822119.png" },
    { name: "9월 도입 챔피언", url: "images/media__1780196127685.png" },
    { name: "9월 추석 한우 세트", url: "images/media__1780196878797.png" },
    { name: "5월 장기 초회보험", url: "images/media__1780136981494.png" },
    { name: "5월 자동차 가동", url: "images/media__1780137267439.png" },
    { name: "6월 2W 연속가동", url: "images/media__1780137432412.png" },
    { name: "6월 연도대상 가점", url: "images/media__1780137850190.png" },
    { name: "도입 정착지원 안내", url: "images/media__1780137378464.png" },
    { name: "신인 도입활성 시상", url: "images/media__1780137762632.png" }
  ];

  // DOM Selection
  const fileDropZone = document.getElementById('file-drop-zone');
  const fileInput = document.getElementById('file-input');
  const mockFileButtons = document.querySelectorAll('.mock-file-btn');
  const consoleLogsContainer = document.getElementById('console-logs-container');
  const analyzerLoader = document.getElementById('analyzer-loader');
  const loaderProgressFill = document.getElementById('loader-progress-fill-bar');
  const loaderText = document.getElementById('analyzer-loader-text');
  const parsedResultsPanel = document.getElementById('parsed-results-panel');
  const parsedResultCardData = document.getElementById('parsed-result-card-data');
  const btnDiscardParsed = document.getElementById('btn-discard-parsed');
  const btnCommitParsed = document.getElementById('btn-commit-parsed');

  // Helper: typewriter text addition in terminal style with visual type categories
  async function typeLogLine(message, type = '') {
    // Clear placeholder message if it's there
    const placeholder = consoleLogsContainer.querySelector('.console-placeholder-msg');
    if (placeholder) {
      consoleLogsContainer.innerHTML = '';
    }

    const logLine = document.createElement('div');
    logLine.className = 'console-log-line';
    
    // Colorful log categories for premium matrix screen feel
    if (type === 'header') {
      logLine.style.color = '#00E5FF'; // cyan
      logLine.style.fontWeight = '700';
    } else if (type === 'success') {
      logLine.style.color = '#00C853'; // green
    } else if (type === 'warning') {
      logLine.style.color = '#FFD600'; // yellow
    } else if (type === 'danger') {
      logLine.style.color = '#FF1744'; // red
    } else if (type === 'info') {
      logLine.style.color = '#E0F7FA'; // soft white
    }

    logLine.innerHTML = `<span class="log-prefix" style="color: var(--primary); margin-right: 6px;">&gt;</span><span class="log-text"></span>`;
    consoleLogsContainer.appendChild(logLine);

    const textSpan = logLine.querySelector('.log-text');
    
    // Fast typewriter effect
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
    // Reset review views
    parsedResultsPanel.style.display = 'none';
    window.currentParsedObjects = parsedObjects;
    window.activeParsedIndex = 0;
    window.currentSlideCount = slideData.totalSlides;
    window.currentDiscardedCount = slideData.discardedSlides;
    consoleLogsContainer.innerHTML = '';
    
    // Disable mock buttons & upload zone during process
    toggleControls(false);

    // Show Loader
    analyzerLoader.style.display = 'flex';
    updateLoader(0, 'OCR 스캔 초기화 중...');

    // 1. Initializing scan
    await typeLogLine(`Initializing multi-slide scan on '${filename}' (총 ${slideData.totalSlides}장표)...`, 'header');
    await sleep(400);

    // 2. Loop through each slide for slide-to-image conversion and discard logic
    for (let s = 1; s <= slideData.totalSlides; s++) {
      const pct = Math.round((s / slideData.totalSlides) * 90);
      updateLoader(pct, `[Slide ${s}/${slideData.totalSlides}] 이미지 변환 및 지능형 판독 중...`);
      
      await typeLogLine(`[Slide ${s}/${slideData.totalSlides}] Converting slide to high-resolution image file...`, 'info');
      await sleep(350);
      
      const slideInfo = slideData.slideResults[s - 1];
      await typeLogLine(`   ↳ Scanned slide content: "${slideInfo.content}"`, 'info');
      
      if (slideInfo.isDiscarded) {
        await typeLogLine(`   ↳ [분석 결과] 비시상안 장표 감지 ➡️ 자동 폐기 처리 완료`, 'warning');
      } else {
        await typeLogLine(`   ↳ [분석 결과] 활성 시상안 규정 감지! ➡️ 시상 규칙 메타데이터 추출 성공!`, 'success');
      }
      await sleep(350);
    }

    // 3. Parsing completed summary
    updateLoader(100, '분석 완수!');
    await typeLogLine(`--------------------------------------------------`, 'info');
    await typeLogLine(`AI 분석 결과 요약: 총 장표 ${slideData.totalSlides}장 중 시상안 ${parsedObjects.length}개 추출, 불필요한 장표 ${slideData.discardedSlides}개 자동 폐기 완료.`, 'success');
    await typeLogLine(`각 시상안을 순차적으로 검토하고 필요시 즉시 수정하실 수 있도록 이전/다음 형태의 검토 편집기를 활성화합니다.`, 'header');
    await sleep(500);

    // Hide loader
    analyzerLoader.style.display = 'none';
    toggleControls(true);

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

  // Enable/Disable interactive controls during analysis
  function toggleControls(enable) {
    mockFileButtons.forEach(btn => btn.disabled = !enable);
    if (fileDropZone) {
      if (enable) {
        fileDropZone.style.pointerEvents = 'auto';
        fileDropZone.style.opacity = '1';
      } else {
        fileDropZone.style.pointerEvents = 'none';
        fileDropZone.style.opacity = '0.6';
      }
    }
  }

  // Utility sleep helper
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Save current form values back into active parsed objects index before tab/slide transitions
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

    // Helper to parse numbers robustly
    function extractNumber(str) {
      if (!str) return 0;
      let matchMan = str.match(/([\d\.]+)\s*만/);
      if (matchMan) {
        return parseFloat(matchMan[1]) * 10000;
      }
      let matchRaw = str.match(/[\d,]+/);
      if (matchRaw) {
        return parseInt(matchRaw[0].replace(/,/g, ''), 10);
      }
      return 0;
    }

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

    // Pagination controls header at the top
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

        <div class="info-row" style="margin-top: 16px;">
          <span class="info-label" style="display: block; margin-bottom: 8px;">연동할 시상 장표 이미지 (클릭하여 매칭)</span>
          <div style="display: flex; gap: 16px; align-items: flex-start; margin-top: 8px; flex-wrap: wrap;">
            <!-- Current Image Preview -->
            <div style="flex: 0 0 160px; background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; text-align: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
              <span style="font-size: 0.7rem; color: var(--text-secondary); display: block; margin-bottom: 6px; font-weight: 600;">현재 매칭 장표</span>
              <img id="admin-incentive-image-preview" src="${obj.slideImage || 'images/media__1780136989005.png'}" style="width: 100%; height: 95px; object-fit: contain; border-radius: var(--radius-xs); border: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="window.open(this.src, '_blank')" title="클릭하여 원본 크게 보기">
            </div>
            
            <!-- Thumbnail Horizontal List -->
            <div style="flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 8px;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">시상 이미지 리스트에서 선택:</span>
              <div class="image-thumbnail-selector" style="display: flex; gap: 8px; overflow-x: auto; padding: 6px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgba(0,0,0,0.15); max-height: 125px; scrollbar-width: thin;">
                ${(() => {
                  const isInAvailable = AVAILABLE_SLIDES.some(slide => slide.url === obj.slideImage);
                  let html = '';
                  if (obj.slideImage && !isInAvailable) {
                    html += `
                      <div class="slide-thumb-card active" data-url="${obj.slideImage}" style="flex: 0 0 95px; text-align: center; cursor: pointer; border: 2px solid var(--primary); border-radius: var(--radius-xs); padding: 6px; background: rgba(255, 115, 33, 0.15); transition: all var(--transition-fast) ease; box-shadow: 0 0 8px rgba(243, 115, 33, 0.3);">
                        <img src="${obj.slideImage}" style="width: 100%; height: 50px; object-fit: contain; border-radius: var(--radius-xs);">
                        <span style="font-size: 0.65rem; color: var(--primary); display: block; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; font-weight: 700;" title="직접 업로드 이미지">직접 업로드</span>
                      </div>
                    `;
                  }
                  AVAILABLE_SLIDES.forEach(slide => {
                    const isSelected = obj.slideImage === slide.url;
                    html += `
                      <div class="slide-thumb-card ${isSelected ? 'active' : ''}" data-url="${slide.url}" style="flex: 0 0 95px; text-align: center; cursor: pointer; border: 2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; border-radius: var(--radius-xs); padding: 6px; background: ${isSelected ? 'rgba(255, 115, 33, 0.15)' : 'rgba(255,255,255,0.02)'}; transition: all var(--transition-fast) ease; box-shadow: ${isSelected ? '0 0 8px rgba(243, 115, 33, 0.3)' : 'none'};">
                        <img src="${slide.url}" style="width: 100%; height: 50px; object-fit: contain; border-radius: var(--radius-xs);">
                        <span style="font-size: 0.65rem; color: ${isSelected ? 'var(--primary)' : 'var(--text-secondary)'}; display: block; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; font-weight: ${isSelected ? '700' : '500'};" title="${slide.name}">${slide.name}</span>
                      </div>
                    `;
                  });
                  return html;
                })()}
              </div>
            </div>
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
        <div class="info-row bg-sub">
          <span class="info-label">추출된 지점 전략 방향 (AI 추천 & 편집 가능)</span>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">금주 핵심 영업 이슈</span>
              <textarea id="edit-weekly-issue" class="admin-edit-textarea" rows="2">${obj.weeklyIssue || ''}</textarea>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">지점 제안 실행 방향</span>
              <textarea id="edit-strategy-direction" class="admin-edit-textarea" rows="3">${obj.direction || ''}</textarea>
            </div>
          </div>
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

    // Bind Metric change to target unit selectors for existing rows
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

    // Bind slide image selector thumbnails
    const thumbCards = parsedResultCardData.querySelectorAll('.slide-thumb-card');
    const previewImg = document.getElementById('admin-incentive-image-preview');
    if (thumbCards && thumbCards.length > 0) {
      thumbCards.forEach(card => {
        card.addEventListener('click', () => {
          const clickedUrl = card.getAttribute('data-url');
          obj.slideImage = clickedUrl;
          
          if (previewImg) {
            previewImg.src = clickedUrl;
          }
          
          thumbCards.forEach(c => {
            c.classList.remove('active');
            c.style.borderColor = 'rgba(255,255,255,0.1)';
            c.style.background = 'rgba(255,255,255,0.02)';
            c.style.boxShadow = 'none';
            const label = c.querySelector('span');
            if (label) {
              label.style.color = 'var(--text-secondary)';
              label.style.fontWeight = '500';
            }
          });
          
          card.classList.add('active');
          card.style.borderColor = 'var(--primary)';
          card.style.background = 'rgba(255, 115, 33, 0.15)';
          card.style.boxShadow = '0 0 8px rgba(243, 115, 33, 0.3)';
          const label = card.querySelector('span');
          if (label) {
            label.style.color = 'var(--primary)';
            label.style.fontWeight = '700';
          }
        });
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- UI File Dropper and Upload Selectors ---

  if (fileDropZone && fileInput) {
    fileDropZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        handleCustomFile(file);
      }
    });

    fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZone.classList.add('dragover');
    });

    fileDropZone.addEventListener('dragleave', () => {
      fileDropZone.classList.remove('dragover');
    });

    fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleCustomFile(file);
      }
    });
  }

  // Helper to construct custom parsed incentives for manually dropped files
  function handleCustomFile(file) {
    const fileName = file.name;
    const isImage = file.type.startsWith('image/');
    
    let year = 2026;
    if (fileName.includes('25') || fileName.includes('2025')) {
      year = 2025;
    }

    let month = 4; // default May (0-indexed)
    if (fileName.includes('9월') || fileName.includes('_9_') || fileName.startsWith('9_') || fileName.includes(' 9월')) {
      month = 8; // September
    } else if (fileName.includes('6월')) {
      month = 5; // June
    } else if (fileName.includes('5월')) {
      month = 4; // May
    }

    const monthStr = String(month + 1).padStart(2, '0');

    if (isImage) {
      // 1. If it's a single slide image upload, create EXACTLY ONE incentive using the uploaded image!
      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        
        // Detect category from filename
        let category = 'long_auto';
        let colorOverride = 'blue';
        if (fileName.includes('도입') || fileName.includes('리쿠') || fileName.includes('recruit')) {
          category = 'recruitment';
          colorOverride = 'green';
        } else if (fileName.includes('2W') || fileName.includes('연속') || fileName.includes('가동')) {
          category = 'two_annual';
          colorOverride = 'gold';
        }

        const title = fileName.split('.')[0].replace(/_/g, ' ');
        const obj = {
          id: `inc-dynamic-img-${Date.now()}`,
          title: title,
          category: category,
          startDate: `${year}-${monthStr}-01`,
          endDate: `${year}-${monthStr}-15`,
          metricType: "premiums",
          metricUnit: "원",
          targetValue: 200000,
          currentValue: 0,
          reward: "매출 시상 보너스 제공",
          description: "업로드된 시상 장표의 기준에 따른 매출 달성 시 특별 시상 지급",
          weeklyIssue: `${title} 영업 전략 활성화`,
          direction: "고객 맞춤 제안서 발송 및 모바일 청약 간소화 가이드 전달",
          colorOverride: colorOverride,
          slideImage: dataUrl
        };

        const slideData = {
          totalSlides: 1,
          discardedSlides: 0,
          slideResults: [
            { isDiscarded: false, content: `[단독 장표 스캔] ${title}` }
          ]
        };

        runSimulation(fileName, slideData, [obj]);
      };
      reader.readAsDataURL(file);
    } else {
      // 2. If it's a PPTX/PDF slide deck file
      let parsedObjects = [];
      let slideData = null;

      if (month === 8) {
        // September slides deck
        slideData = {
          totalSlides: 14,
          discardedSlides: 4,
          slideResults: [
            { isDiscarded: true, content: "9월 창원지역단 및 영남지역본부 프로모션 전사 공지 개요" },
            { isDiscarded: false, content: "리치 프로모션 - 리치간병보험 건당 20만원이상 매출시상" },
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
            description: "리치간병보험 건당 20만 원 이상 매출 시 10년납 최대 300% 지급 프로모션",
            weeklyIssue: "리치간병보험 신규 가입 혜택 홍보 집중",
            direction: "10년납 가입 희망 고객 대상 300% 비례 매출 보너스 소구 플랜 전달",
            colorOverride: "blue",
            slideImage: "images/media__1780194708878.png"
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
            slideImage: "images/media__1780194704189.png"
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
            slideImage: "images/media__1780194714188.png"
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
            slideImage: "images/media__1780194720206.png"
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
            slideImage: "images/media__1780193024121.png"
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
            slideImage: "images/media__1780194694232.png"
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
            slideImage: "images/media__1780195822119.png"
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
            direction: "설명회 동반 참석 기획 및 후보자 리스트의 지점장 집중 상담 클로징 매칭",
            milestones: [
              { name: "도입 1명 달성", value: 1, reward: "시상 500,000원" },
              { name: "도입 2명 달성", value: 2, reward: "시상 1,200,000원" },
              { name: "도입 3명 달성", value: 3, reward: "시상 2,500,000원" }
            ],
            colorOverride: "green",
            slideImage: "images/media__1780196127685.png"
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
            slideImage: "images/media__1780196127685.png"
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
            slideImage: "images/media__1780196878797.png"
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
            slideImage: "images/media__1780136981494.png"
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
            slideImage: "images/media__1780137432412.png"
          }
        ];
      }

      runSimulation(fileName, slideData, parsedObjects);
    }
  }

  // Mock file buttons listener
  mockFileButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mockKey = btn.getAttribute('data-mock');
      let filename = '';
      let slideData = null;
      let parsedObjects = [];

      if (mockKey === 'long_auto_pct') {
        filename = '5월_4주_장기_초회보험료_시상.pptx';
        slideData = {
          totalSlides: 4,
          discardedSlides: 2,
          slideResults: [
            { isDiscarded: true, content: "5월 4주차 영업 방향 및 지점 공지사항 (공지용)" },
            { isDiscarded: false, content: "5월 4주 장기보장성 초회보험료 달성 시상 규칙" },
            { isDiscarded: false, content: "5월 4주 자동차보험 특별 가동 시상 규칙" },
            { isDiscarded: true, content: "당월 조기 마감 격려 및 지점 슬로건" }
          ]
        };
        parsedObjects = [
          {
            id: "inc-parsed-long-auto-1",
            title: "5월 4주 장기보장성 초회보험료 달성 시상",
            category: "long_auto",
            startDate: "2026-05-25",
            endDate: "2026-05-29",
            metricType: "premiums",
            metricUnit: "원",
            targetValue: 500000,
            currentValue: 0,
            reward: "시상금 500,000원 지급",
            description: "5월 4주차 장기 보장성 초회보험료 50만 원 이상 달성 설계사 대상 현금 시상",
            weeklyIssue: "운전자보험 한도 축소 전 막판 스퍼트 절판 마케팅 집중 필요",
            direction: "기존 고객 대상 운전자보험 업셀링 플랜 제안서 전달 및 가족 일괄 가입 전략 활용",
            slideImage: "images/media__1780136981494.png"
          },
          {
            id: "inc-parsed-long-auto-2",
            title: "5월 4주 자동차보험 특별 가동 시상",
            category: "long_auto",
            startDate: "2026-05-25",
            endDate: "2026-05-29",
            metricType: "contracts",
            metricUnit: "건",
            targetValue: 3,
            currentValue: 0,
            reward: "시상금 100,000원 지급",
            description: "5월 4주차 자동차보험 신규 청약 3건 이상 가동 설계사 대상 특별 장려금 시상",
            weeklyIssue: "운전자보험과 자동차보험 연계 청약 마케팅 효과 극대화",
            direction: "가족 단위 자동차보험 갱신 리스트 활용 및 차별화된 다이렉트 대비 혜택 강조 제안",
            slideImage: "images/media__1780137267439.png"
          }
        ];
      } else if (mockKey === 'two_june') {
        filename = '6월_연속가동_2W_시상안.jpg';
        slideData = {
          totalSlides: 4,
          discardedSlides: 2,
          slideResults: [
            { isDiscarded: true, content: "6월 상반기 2W 기준 변경사항 및 37회차 이하 승환 제외 지침" },
            { isDiscarded: false, content: "6월 연속가동 2W 주차별 등급 마감 시상 규칙" },
            { isDiscarded: false, content: "6월 연도대상 특별 가점 프로모션 포인트 부여 기준" },
            { isDiscarded: true, content: "2026년 1월 전속영업부문 FP 채널 프로모션 대내 문서 요약" }
          ]
        };
        parsedObjects = [
          {
            id: "inc-parsed-two-june-1",
            title: "6월 연속가동 2W 시상안",
            category: "two_annual",
            startDate: "2026-06-01",
            endDate: "2026-06-12",
            metricType: "two_tier",
            metricUnit: "주",
            currentValue: 0,
            reward: "실버 이상 달성 시 보너스 지급",
            description: "6월 상반기 연속 가동 달성 시 등급별 파격 보너스 및 연도대상 포인트 가산 프로모션",
            weeklyIssue: "주간 연속 가동 리듬 유지 및 소액 건이라도 매주 청약 완료하는 습관 정착",
            direction: "화재보험 또는 소액 운전자보험 위주의 초단기 청약으로 주간 가동 흐름 유지 관리",
            milestones: [
              { name: "브론즈 (1주 가동)", value: 1, reward: "시상 10,000원" },
              { name: "실버 (2주 연속)", value: 2, reward: "시상 150,000원" },
              { name: "골드 (3주 연속)", value: 3, reward: "시상 350,000원" }
            ],
            slideImage: "images/media__1780137432412.png"
          },
          {
            id: "inc-parsed-two-june-2",
            title: "6월 연도대상 특별 가점 프로모션",
            category: "two_annual",
            startDate: "2026-06-01",
            endDate: "2026-06-12",
            metricType: "premiums",
            metricUnit: "원",
            targetValue: 2000000,
            currentValue: 0,
            reward: "특별 가점 5,000 pt 부여",
            description: "6월 상반기 누적 초회보험료 200만 원 달성 시 연도대상 특별 승급 가점 포인트 가산",
            weeklyIssue: "상반기 연도대상 포인트 목표 달성을 위한 마지막 누적 스퍼트 시점",
            direction: "지점 내 우수 고객 단체 보장 제안서 발송 및 핵심 종합보험 집중 클로징",
            slideImage: "images/media__1780137850190.png"
          }
        ];
      } else if (mockKey === 'recruit_gold') {
        filename = '하반기_도입_정착지원_안내.pdf';
        slideData = {
          totalSlides: 4,
          discardedSlides: 2,
          slideResults: [
            { isDiscarded: true, content: "하반기 전사 조직 확대 전략 및 팔용지점 도입 목표 안내" },
            { isDiscarded: false, content: "하반기 설계사 도입 및 정착지원금 등급별 지급 요약" },
            { isDiscarded: false, content: "신인 도입 활성화 특별 주간 추가 소개비 장려 규칙" },
            { isDiscarded: true, content: "도입 우수 FP 본사 연수 및 명예 포상 시상 안내" }
          ]
        };
        parsedObjects = [
          {
            id: "inc-parsed-recruit-gold-1",
            title: "하반기 도입 및 정착지원 프로모션",
            category: "recruitment",
            startDate: "2026-05-18",
            endDate: "2026-06-12",
            metricType: "recruit_tier",
            metricUnit: "명",
            currentValue: 0,
            reward: "정착 지원금 및 특전 제공",
            description: "하반기 동료 설계사 도입 시 정착 지원금 및 지점 육성 수당 대폭 인상 프로모션",
            weeklyIssue: "타사 경력 설계사 대상 한화손보의 차별화된 수수료 체계 및 교육 시스템 홍보",
            direction: "지인 중 영업직 전향 희망자 또는 타사 경력자를 지점 주말 설명회에 초청 연계",
            milestones: [
              { name: "도입 1명 달성", value: 1, reward: "시상 300,000원" },
              { name: "도입 3명 달성", value: 3, reward: "시상 1,500,000원" },
              { name: "도입 5명 달성", value: 5, reward: "시상 4,000,000원" }
            ],
            slideImage: "images/media__1780137378464.png"
          },
          {
            id: "inc-parsed-recruit-gold-2",
            title: "신인 도입 활성화 특별 주간 시상",
            category: "recruitment",
            startDate: "2026-05-25",
            endDate: "2026-05-29",
            metricType: "recruit_tier",
            metricUnit: "명",
            targetValue: 1,
            currentValue: 0,
            reward: "추가 소개비 200,000원 지급",
            description: "5월 4주차 신인 설계사 1명 도입 시 기존 소개 수당 외에 지점장 특별 추가 소개비 매칭",
            weeklyIssue: "주간 도입 타겟 FP 발굴 및 1:1 티타임 적극 권장",
            direction: "활동력 있는 후보자를 발굴하여 지점장 동반 미팅 추진 및 지점 분위기 활성화 유도",
            slideImage: "images/media__1780137762632.png"
          }
        ];
      }

      if (parsedObjects.length > 0) {
        runSimulation(filename, slideData, parsedObjects);
      }
    });
  });

  // Action Bar Commit Button
  if (btnCommitParsed) {
    btnCommitParsed.addEventListener('click', () => {
      if (!window.currentParsedObjects || window.currentParsedObjects.length === 0) return;

      // 1. Save currently active slide fields
      saveCurrentFormValues();

      // 2. Add all parsed objects to active state database
      window.currentParsedObjects.forEach(obj => {
        window.INCENTIVE_DATABASE.incentives.push(obj);
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
      
      // Setup successful log info in console
      consoleLogsContainer.innerHTML = `
        <div class="console-placeholder-msg">
          <i data-lucide="check-circle" class="color-success"></i>
          <p>총 ${window.currentParsedObjects.length}개의 시상 일정 등록 및 FP 배포가 성공적으로 완료되었습니다!<br>새로운 시상 일정이 캘린더에 실시간 연동되었습니다.</p>
        </div>
      `;

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

      consoleLogsContainer.innerHTML = `
        <div class="console-placeholder-msg">
          <i data-lucide="terminal"></i>
          <p>시상안 업로드 결과 검토를 취소했습니다.<br>시뮬레이션 데모 파일을 선택해 다시 시작해보세요.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    });
  }

})();

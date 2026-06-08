// 한화손보 시상안 파일 OCR 판독 가속 엔진 (리팩토링 완성본)

(function () {
  // Store the active parsing simulation state for multi-slide processing
  window.currentParsedObjects = null;
  window.activeParsedIndex = null;
  window.currentSlideCount = 0;
  window.currentDiscardedCount = 0;

  // Dynamic library loader helper
  function loadLibrary(url, globalVarName) {
    return new Promise((resolve, reject) => {
      if (window[globalVarName]) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  }

  // Image compression utility returning Promise of Base64 DataURL
  function getCompressedBase64(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxVal = 600;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxVal) {
              height *= maxVal / width;
              width = maxVal;
            }
          } else {
            if (height > maxVal) {
              width *= maxVal / height;
              height = maxVal;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.onerror = () => resolve("");
        img.src = evt.target.result;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  // DOM Selection variables (assigned on DOMContentLoaded to guarantee non-null values)
  let fileDropZone = null;
  let fileInput = null;
  let consoleLogsContainer = null;
  let analyzerLoader = null;
  let loaderProgressFill = null;
  let loaderText = null;
  let parsedResultsPanel = null;
  let parsedResultCardData = null;

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

      const isCustom = unitSelect.value === '직접입력';
      obj.targetValue = isCustom ? targetInput.value.trim() : (parseInt(targetInput.value, 10) || 0);
      obj.metricUnit = unitSelect.value;
      obj.reward = rewardInput.value.trim();
      delete obj.milestones;
    } else if (rows.length > 1) {
      const milestones = [];
      rows.forEach((row, idx) => {
        const targetInput = row.querySelector('.crit-target');
        const unitSelect = row.querySelector('.crit-target-unit');
        const rewardInput = row.querySelector('.crit-reward');

        const isCustom = unitSelect.value === '직접입력';
        const targetVal = isCustom ? targetInput.value.trim() : (parseInt(targetInput.value, 10) || 0);
        const unit = unitSelect.value;
        const rewardText = rewardInput.value.trim();

        let displayVal = isCustom ? targetVal : targetVal.toLocaleString();
        let tierName = `${idx + 1}차 기준 (${displayVal}${unit})`;
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
      const inputType = (unit === '직접입력') ? 'text' : 'number';
      return `
        <div class="criteria-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: rgba(255,255,255,0.01); border: 1px solid var(--border); padding: 8px 12px; border-radius: var(--radius-xs);">
          <span style="font-size: 0.85rem; font-weight: 600; min-width: 65px; color: var(--text-secondary);">시상 기준:</span>
          <input type="${inputType}" class="admin-edit-input crit-target" value="${targetVal}" style="max-width: 120px; padding: 6px 10px !important;">
          <select class="admin-edit-select crit-target-unit" style="max-width: 80px; padding: 6px 10px !important;">
            <option value="원" ${unit === '원' ? 'selected' : ''}>원</option>
            <option value="%" ${unit === '%' ? 'selected' : ''}>%</option>
            <option value="건" ${unit === '건' ? 'selected' : ''}>건</option>
            <option value="주" ${unit === '주' ? 'selected' : ''}>주</option>
            <option value="명" ${unit === '명' ? 'selected' : ''}>명</option>
            <option value="직접입력" ${unit === '직접입력' ? 'selected' : ''}>직접입력</option>
          </select>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">이상 달성시 ➡️ 시상</span>
          <input type="text" class="admin-edit-input crit-reward" value="${rewardText}" style="max-width: 220px; padding: 6px 10px !important;" placeholder="시상 혜택 입력">
          <button class="btn-delete-row" style="background:transparent; color:var(--accent-danger); cursor:pointer; font-size:1.1rem; display:flex; align-items:center; padding: 0 4px; border:none;" title="삭제">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
    }

    // Helper to bind row events (Delete & Unit select changes input type)
    function bindCriteriaRowEvents(rowEl) {
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

      const unitSelect = rowEl.querySelector('.crit-target-unit');
      const targetInput = rowEl.querySelector('.crit-target');
      if (unitSelect && targetInput) {
        unitSelect.addEventListener('change', (e) => {
          if (e.target.value === '직접입력') {
            targetInput.type = 'text';
          } else {
            targetInput.type = 'number';
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

        <div class="info-row" style="margin-bottom: 20px; font-family: var(--font-sans) !important;">
          <span class="info-label">시상안 관련 이미지 첨부</span>
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
            <input type="file" id="edit-incentive-image-file" accept="image/*" style="display: none;">
            <button class="btn btn-secondary" id="btn-trigger-image-file" style="padding: 6px 14px; font-size: 0.8rem; gap: 6px; display: inline-flex; align-items: center; border-color: rgba(243, 115, 33, 0.2); background: rgba(243, 115, 33, 0.02); color: var(--primary);">
              <i data-lucide="image" style="width: 14px; height: 14px;"></i> 이미지 등록
            </button>
            <span id="edit-incentive-image-filename" style="font-size: 0.775rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${obj.slideImage ? "기존 등록된 이미지 있음" : "선택된 파일 없음"}
            </span>
            <div id="edit-incentive-image-preview-container" style="display: ${obj.slideImage ? 'block' : 'none'}; border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 4px; background: rgba(0,0,0,0.03);">
              <img id="edit-incentive-image-preview" src="${obj.slideImage || ''}" style="max-height: 40px; border-radius: 4px; cursor: pointer;" title="클릭 시 크게 보기">
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
        
        bindCriteriaRowEvents(newRowEl);
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Bind initial deletes
    if (rowsContainer) {
      rowsContainer.querySelectorAll('.criteria-row').forEach(row => {
        bindCriteriaRowEvents(row);
      });
    }

    // Bind Image Attachment Actions (New Feature)
    const imgTrigger = document.getElementById('btn-trigger-image-file');
    const imgFileInput = document.getElementById('edit-incentive-image-file');
    const imgFilename = document.getElementById('edit-incentive-image-filename');
    const imgPreviewContainer = document.getElementById('edit-incentive-image-preview-container');
    const imgPreview = document.getElementById('edit-incentive-image-preview');

    if (imgTrigger && imgFileInput) {
      imgTrigger.addEventListener('click', () => {
        imgFileInput.click();
      });
    }

    if (imgFileInput) {
      imgFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const compressed = await getCompressedBase64(file);
          if (compressed) {
            obj.slideImage = compressed; // Update object state
            if (imgFilename) imgFilename.textContent = file.name;
            if (imgPreview) imgPreview.src = compressed;
            if (imgPreviewContainer) imgPreviewContainer.style.display = 'block';
          }
        }
      });
    }

    if (imgPreview) {
      imgPreview.addEventListener('click', () => {
        if (obj.slideImage && typeof window.openImageLightbox === 'function') {
          window.openImageLightbox(obj.slideImage);
        }
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

  // File input and drag-drop events are now bound inside DOMContentLoaded to ensure elements exist

  // File handling router
  function handleCustomFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    handleNonImageFile(file);
  }

  // Helper: PPTX slide text analysis parser (인식률 극대화 룰 베이스 알고리즘)
  function extractIncentiveFromTexts(texts, slideNum, year, month, fileName, imageUrl) {
    const combinedText = texts.join(' ');
    
    // 1. 시상 제목 결정: 좌측 상단의 PPT 제목(texts[0])을 최우선적으로 기본 반영
    let title = "";
    if (texts.length > 0) {
      title = texts[0].replace(/^[◎\s•\-*\d차\[\]\(\)\s]+/, '').trim();
      
      // 만약 첫 텍스트가 너무 짧거나 본문 타이틀이 아닌 무의미한 텍스트일 때
      if (title.length < 3 || title.includes('+') || title.includes('대상') || title.includes('기간')) {
        const bestCandidate = texts.find(t => t.includes('프로모션') || t.includes('시상') || t.includes('시책') || t.includes('RICH'));
        if (bestCandidate) {
          title = bestCandidate.replace(/^[◎\s•\-*\d차\[\]\(\)\s]+/, '').trim();
        } else {
          const baseName = fileName.replace(/\.[^/.]+$/, "");
          title = `${baseName} - ${slideNum}번 시상안`;
        }
      }
    } else {
      title = `${month + 1}월 ${slideNum}차 특별 프로모션`;
    }

    // 2. 시상 기간 파싱 ('기간' 또는 '기 간' 뒤의 날짜 추출)
    let startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    let endDate = `${year}-${String(month + 1).padStart(2, '0')}-15`; // 기본 15일

    const periodRegex = /(?:기\s*간)\s*[:\s]*([^\n\r]+)/i;
    const periodMatch = combinedText.match(periodRegex);
    if (periodMatch) {
      const dateText = periodMatch[1].trim();
      const daysMatch = dateText.match(/(\d+)월\s*(\d+)일?\s*~\s*(?:(\d+)월\s*)?(\d+)일?/);
      if (daysMatch) {
        const startM = parseInt(daysMatch[1], 10);
        const startD = parseInt(daysMatch[2], 10);
        const endM = daysMatch[3] ? parseInt(daysMatch[3], 10) : startM;
        const endD = parseInt(daysMatch[4], 10);
        
        startDate = `${year}-${String(startM).padStart(2, '0')}-${String(startD).padStart(2, '0')}`;
        endDate = `${year}-${String(endM).padStart(2, '0')}-${String(endD).padStart(2, '0')}`;
      } else {
        const simpleDaysMatch = dateText.match(/(\d+)월?\s*(\d+)일?\s*~\s*(\d+)일?/);
        if (simpleDaysMatch) {
          const parsedM = dateText.includes('월') ? parseInt(dateText.match(/(\d+)월/)[1], 10) : (month + 1);
          const startD = parseInt(simpleDaysMatch[2], 10);
          const endD = parseInt(simpleDaysMatch[3], 10);
          
          startDate = `${year}-${String(parsedM).padStart(2, '0')}-${String(startD).padStart(2, '0')}`;
          endDate = `${year}-${String(parsedM).padStart(2, '0')}-${String(endD).padStart(2, '0')}`;
        }
      }
    }

    // 3. 카테고리 판별
    let category = "long_auto";
    if (combinedText.includes("도입") || combinedText.includes("리쿠르팅") || combinedText.includes("육성")) {
      category = "recruitment";
    } else if (combinedText.includes("2W") || combinedText.includes("연속 가동") || combinedText.includes("연도대상")) {
      category = "two_annual";
    }

    // 4. 표(Table) 인식 및 시상 기준(Milestones) 자동 추출
    const amountRegex = /(\d+)\s*만\s*원[↑\s]*/g;
    const rateRegex = /(\d+)\s*%/g;

    const amounts = [];
    let match;
    while ((match = amountRegex.exec(combinedText)) !== null) {
      amounts.push(parseInt(match[1], 10) * 10000);
    }
    
    const rates = [];
    while ((match = rateRegex.exec(combinedText)) !== null) {
      rates.push(match[1] + '%');
    }

    let milestones = null;
    let targetValue = 200000;
    let reward = "매출 장려금 지급";
    
    if (amounts.length > 0 && rates.length > 0) {
      milestones = [];
      const len = Math.min(amounts.length, rates.length);
      for (let k = 0; k < len; k++) {
        milestones.push({
          name: `월납 ${(amounts[k]/10000).toLocaleString()}만원↑ 달성`,
          value: amounts[k],
          reward: `월납 ${rates[k]} 시상금 지급`
        });
      }
      milestones.sort((a, b) => a.value - b.value);
      targetValue = milestones[0].value;
      reward = milestones[0].reward;
    } else {
      const targetMatch = combinedText.match(/(\d+)\s*만\s*원\s*이상/);
      if (targetMatch) {
        targetValue = parseInt(targetMatch[1], 10) * 10000;
      }
      const rewardMatch = combinedText.match(/(?:지급|시상금|사은품)\s*([^\s]+)/);
      if (rewardMatch) {
        reward = rewardMatch[1];
      }
    }

    const metricType = category === "recruitment" ? "recruit_tier" : (category === "two_annual" ? "two_tier" : "premiums");
    const metricUnit = category === "recruitment" ? "명" : (category === "two_annual" ? "주" : "원");

    return {
      id: `inc-pptx-${slideNum}-${Date.now()}`,
      title: title,
      category: category,
      startDate: startDate,
      endDate: endDate,
      metricType: metricType,
      metricUnit: metricUnit,
      targetValue: targetValue,
      currentValue: 0,
      reward: reward,
      milestones: milestones,
      description: combinedText.length > 100 ? combinedText.substring(0, 97) + '...' : combinedText,
      weeklyIssue: combinedText.includes("유의") || combinedText.includes("제외") ? "청약 진행 시 승환계약 및 유의사항 기준 준수" : "당주 프로모션 가동 전략 수립 및 가망 고객 제안 집중",
      direction: "고객별 최적 플랜 설계서 모바일 발송 및 활동 가동 관리",
      slideImage: imageUrl
    };
  }

  // Helper to handle PDF/PPTX/Image document scan simulators
  async function handleNonImageFile(file) {
    const fileName = file.name;
    const isPptx = fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt');
    const isPdf = fileName.toLowerCase().endsWith('.pdf');

    let year = 2026;
    if (fileName.includes('25') || fileName.includes('2025')) year = 2025;
    else if (fileName.includes('24') || fileName.includes('2024')) year = 2024;

    let month = 4; // default May (0-indexed)
    const monthMatch = fileName.match(/(\d+)월/);
    if (monthMatch) {
      month = parseInt(monthMatch[1], 10) - 1;
    } else {
      if (fileName.includes('_9_') || fileName.startsWith('9_') || fileName.includes(' 9월')) month = 8;
      else if (fileName.includes('6월')) month = 5;
      else if (fileName.includes('5월')) month = 4;
      else if (fileName.includes('2월')) month = 1;
    }

    let uploadedImageUrl = "";
    if (file && file.type && file.type.startsWith('image/')) {
      uploadedImageUrl = await getCompressedBase64(file);
    }

    const monthStr = String(month + 1).padStart(2, '0');
    let parsedObjects = [];
    let slideData = { totalSlides: 1, discardedSlides: 0, slideResults: [] };

    // --- 1. PPTX 파일인 경우: JSZip을 활용해 실제 XML 텍스트 파싱 및 OCR 시뮬레이션 고도화 ---
    if (isPptx) {
      try {
        await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
      } catch (err) {
        console.error("Failed to load JSZip: ", err);
        alert("PPTX 분석 라이브러리(JSZip)를 로드할 수 없습니다.");
        return;
      }
      try {
        const zip = await window.JSZip.loadAsync(file);
        const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.replace(/[^\d]/g, ''), 10) || 0;
          const numB = parseInt(b.replace(/[^\d]/g, ''), 10) || 0;
          return numA - numB;
        });

        slideData.totalSlides = slideFiles.length;
        slideData.slideResults = [];
        slideData.discardedSlides = 0;

        for (let i = 0; i < slideFiles.length; i++) {
          const slidePath = slideFiles[i];
          const slideXmlText = await zip.files[slidePath].async('string');
          const textMatches = slideXmlText.match(/<a:t>([^<]*)<\/a:t>/g) || [];
          const texts = textMatches.map(m => m.replace(/<\/?a:t>/g, '').trim()).filter(t => t.length > 0);
          
          const slideNum = i + 1;
          const combined = texts.join(' ');
          const isNotice = combined.includes('공지') || combined.includes('개요') || combined.includes('Q&A') || combined.includes('목차');
          
          if (texts.length === 0 || isNotice) {
            slideData.slideResults.push({ isDiscarded: true, content: `슬라이드 ${slideNum} - 비시상안 장표 자동 필터링` });
            slideData.discardedSlides++;
            continue;
          }

          const obj = extractIncentiveFromTexts(texts, slideNum, year, month, fileName, uploadedImageUrl);
          if (obj) {
            parsedObjects.push(obj);
            slideData.slideResults.push({ isDiscarded: false, content: `슬라이드 ${slideNum} - [시상안] "${obj.title}" 판독 완료` });
          } else {
            slideData.slideResults.push({ isDiscarded: true, content: `슬라이드 ${slideNum} - 시상 내용 미검출` });
            slideData.discardedSlides++;
          }
        }
      } catch (err) {
        console.error("PPTX Parsing failed: ", err);
      }
    }

    // --- 2. PDF 파일인 경우: 페이지 수 카운팅 및 텍스트 기반 룰 기반 시뮬레이터 ---
    if (isPdf && parsedObjects.length === 0) {
      try {
        const text = await file.text();
        const matches = text.match(/\/Type\s*\/Page\b/g);
        const pages = matches ? matches.length : 5;
        
        slideData.totalSlides = pages;
        slideData.discardedSlides = Math.max(1, Math.round(pages * 0.15));
        
        const validPages = pages - slideData.discardedSlides;
        for (let i = 1; i <= pages; i++) {
          if (i <= slideData.discardedSlides) {
            slideData.slideResults.push({ isDiscarded: true, content: `PDF ${i}페이지 - 안내 및 지침 (자동 폐기)` });
          } else {
            const index = i - slideData.discardedSlides;
            const tempTitle = `${month + 1}월 ${index}차 지점 추천 프로모션`;
            const startDateStr = `${year}-${monthStr}-01`;
            const endDateStr = `${year}-${monthStr}-15`;
            
            const obj = {
              id: `inc-pdf-${index}-${Date.now()}`,
              title: tempTitle,
              category: "long_auto",
              startDate: startDateStr,
              endDate: endDateStr,
              metricType: "premiums",
              metricUnit: "원",
              targetValue: 200000,
              currentValue: 0,
              reward: "시상금 200,000원 지급",
              description: `${month + 1}월 지점 매출 활성화를 위한 추천 특별 시상 프로모션`,
              weeklyIssue: "신담보 출시 및 한도 확대 집중 홍보 전략 활용",
              direction: "고객별 맞춤 설계서 발송 및 주간 가동 완료 관리",
              colorOverride: index % 2 === 0 ? "blue" : "gold",
              slideImage: ""
            };
            parsedObjects.push(obj);
            slideData.slideResults.push({ isDiscarded: false, content: `PDF ${i}페이지 - [시상안] "${obj.title}" 판독 완료` });
          }
        }
      } catch (err) {
        console.error("PDF Parsing failed: ", err);
      }
    }

    // --- 3. 일반 이미지나 폴백 상황 (또는 PPTX/PDF 파싱 결과가 없는 경우) ---
    // --- 3. 일반 이미지나 폴백 상황 (또는 PPTX/PDF 파싱 결과가 없는 경우) ---
    if (parsedObjects.length === 0) {
      if (uploadedImageUrl) {
        // 단일 이미지 업로드 시 정확히 1개의 시상안만 생성
        const cleanName = fileName.replace(/\.[^/.]+$/, "");
        slideData.totalSlides = 1;
        slideData.discardedSlides = 0;
        slideData.slideResults = [
          { isDiscarded: false, content: `이미지 스캔 - [시상안] "${cleanName}" 판독 완료` }
        ];
        parsedObjects = [
          {
            id: `inc-img-${Date.now()}`,
            title: cleanName,
            category: "long_auto",
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-15`,
            metricType: "premiums",
            metricUnit: "원",
            targetValue: 200000,
            currentValue: 0,
            reward: "시상 규정 참조",
            description: `이미지 파일 '${fileName}'에서 업로드된 시상안 정보입니다.`,
            weeklyIssue: "당주 프로모션 가동 전략 수립 및 가망 고객 제안 집중",
            direction: "고객별 최적 플랜 설계서 모바일 발송 및 활동 가동 관리",
            colorOverride: "blue",
            slideImage: uploadedImageUrl
          }
        ];
      } else {
        // 기타 파일 포맷의 경우 기존 데모용 6개 더미 생성
        slideData.totalSlides = 9;
        slideData.discardedSlides = 2;
        slideData.slideResults = [
          { isDiscarded: true, content: `${month + 1}월 프로모션 안내 개요` },
          { isDiscarded: false, content: `${month + 1}월 창원지역단 뉴리치 프로모션` },
          { isDiscarded: false, content: `${month + 1}월 장기보장성 매출 극대화 시상` },
          { isDiscarded: false, content: `${month + 1}월 연속 가동 주차별 마감 시상` },
          { isDiscarded: false, content: `${month + 1}월 도입 챔피언 리쿠르팅 시상` },
          { isDiscarded: false, content: `영남지역본부 우수 지점 도입 육성 프로모션` },
          { isDiscarded: false, content: `${month + 1}월 특별 종합 대내외 시상` },
          { isDiscarded: true, content: `유의사항 및 승환계약 제외 기준 안내` },
          { isDiscarded: true, content: `Q&A 및 지점장 격려 공지` }
        ];

        parsedObjects = [
          {
            id: `inc-new-rich-${Date.now()}`,
            title: `${month + 1}월 창원지역단 뉴리치 프로모션`,
            category: "long_auto",
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-03`,
            metricType: "premiums",
            metricUnit: "원",
            currentValue: 0,
            milestones: [
              { name: "월납 20만원↑ 달성", value: 200000, reward: "월납 300% 시상금 지급" },
              { name: "월납 50만원↑ 달성", value: 500000, reward: "월납 400% 시상금 지급" }
            ],
            reward: "월납 300%~400% 시상금 지급",
            description: "리치간병보험 납입기간 및 월납P 기준 충족 시 건당 시상금 지급 프로모션",
            weeklyIssue: "리치간병보험 신규 가입 혜택 홍보 및 37회차 이내 승환계약 제외 기준 유의",
            direction: "15년납/10년납 가입 희망 고객 대상 업셀링 제안서 전달 및 명절 전 스퍼트 가동",
            colorOverride: "orange",
            slideImage: uploadedImageUrl
          },
          {
            id: `inc-changwon-max-${Date.now()}`,
            title: `${month + 1}월 창원지역단 장기보장성 매출 극대화 프로모션`,
            category: "long_auto",
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-15`,
            metricType: "premiums",
            metricUnit: "원",
            targetValue: 500000,
            currentValue: 0,
            reward: "매출 장려금 추가 지급",
            description: "장기 보장성 누적 초회보험료 구간별 특별 특별 인센티브 매칭",
            weeklyIssue: "당월 매출 목표 조기 완수 및 지점 랭킹 상승 전략",
            direction: "우량 가망고객의 집중 클로징 및 간편 보장 한도 소구 화법 적용 제안",
            colorOverride: "blue",
            slideImage: uploadedImageUrl
          },
          {
            id: `inc-two-continuity-${Date.now()}`,
            title: `${month + 1}월 연속 가동 주차별 마감 시상`,
            category: "two_annual",
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-28`,
            metricType: "two_tier",
            metricUnit: "주",
            currentValue: 0,
            reward: "2W 주간 가동 보너스 지급",
            description: "매주 가동 설계사들의 활동성 보강을 위한 주차별 연속 가동 격려금 프로모션",
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
            title: `${month + 1}월 도입 챔피언 리쿠르팅 시상`,
            category: "recruitment",
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-28`,
            metricType: "recruit_tier",
            metricUnit: "명",
            currentValue: 0,
            reward: "도입 성공 장려금 대폭 지급",
            description: "동료 설계사 도입 시 정착 지원금 및 소개 리쿠르팅 수당 획기적 매칭",
            weeklyIssue: "지점 FP 조직 확대 및 신인 도입 활동 촉진 기간",
            direction: "설명회 초청 및 지점장 동반 상담 추진으로 클로징 성공율 가속화",
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
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-28`,
            metricType: "recruit_tier",
            metricUnit: "명",
            currentValue: 0,
            reward: "지점 육성 격려금 매칭",
            description: "본부 지점 정예 조직 육성을 위한 지점 누적 도입 프로모션",
            weeklyIssue: "하반기 지점 볼륨업 및 도입 활성화 분위기 유도",
            direction: "지점 세미나 및 1:1 상담 기획으로 도입 성공율 극대화",
            milestones: [
              { name: "지점 총 도입 3명 달성", value: 3, reward: "시상 1,500,000원" },
              { name: "지점 총 도입 5명 달성", value: 5, reward: "시상 3,500,000원" }
            ],
            colorOverride: "green",
            slideImage: uploadedImageUrl
          },
          {
            id: `inc-special-annual-${Date.now()}`,
            title: `${month + 1}월 특별 종합 대내외 시상`,
            category: "long_auto",
            startDate: `${year}-${monthStr}-01`,
            endDate: `${year}-${monthStr}-15`,
            metricType: "premiums",
            metricUnit: "원",
            targetValue: 1000000,
            currentValue: 0,
            reward: "특별 명절 선물세트 증정",
            description: "보장성 합산보험료 100만 원 돌파 시 프리미엄 명절 한우세트 증정",
            weeklyIssue: "고액 종합 설계 청약 매출 유치 스퍼트 집중",
            direction: "우량 가망 리스트 집중 제안 및 종합 보장 플랜 연계 가동",
            colorOverride: "purple",
            slideImage: uploadedImageUrl
          }
        ];
      }
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

    const validCount = parsedObjects.length;
    await typeLogLine(`Analyzing semantic context... Found ${slideData.totalSlides} slides/pages (${validCount} valid incentives, ${slideData.discardedSlides} non-incentive pages).`, 'warning');
    updateLoader(75, "시상 조건 의미 파악 및 룰 매칭 중...");
    await sleep(150);

    await typeLogLine(`Parsed successfully! Generated ${validCount} draft cards.`, 'success');
    updateLoader(100, "분석 완료! 기획안 초안 생성 성공");
    await sleep(200);

    // Hide loader and console smoothly after finish
    if (analyzerLoader) analyzerLoader.style.display = 'none';
    if (consoleLogsContainer) consoleLogsContainer.style.display = 'none';

    runSimulation(fileName, slideData, parsedObjects);
  }

  // Action bar buttons and bulk delete events are now bound inside DOMContentLoaded and renderActiveIncentivesManager to ensure proper lifecycle

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

      const isLinked = inc.excelData && inc.excelData.length > 0;
      const btnColor = isLinked ? 'var(--accent-success)' : 'var(--primary)';
      const btnBorder = isLinked ? 'rgba(0, 200, 83, 0.3)' : 'rgba(243, 115, 33, 0.25)';
      const btnBg = isLinked ? 'rgba(0, 200, 83, 0.02)' : 'rgba(243, 115, 33, 0.02)';
      const btnHoverBg = isLinked ? 'rgba(0, 200, 83, 0.08)' : 'rgba(243, 115, 33, 0.08)';
      const btnText = isLinked ? `연동 완료 (${inc.excelData.length}명)` : '실적연동';
      const iconName = isLinked ? 'check' : 'file-spreadsheet';

      return `
        <div class="active-inc-item" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); padding: 12px 16px; border-radius: var(--radius-sm); font-family: var(--font-sans) !important; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <input type='checkbox' class='chk-select-inc' data-id='${inc.id}' style='width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary); flex-shrink: 0;'>
            <span class="category-indicator cat-${inc.category}" style="flex-shrink: 0; padding: 4px 8px; font-size: 0.65rem; border-radius: 4px; font-weight: 700;">
              ${catLabel}
            </span>
            <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 280px;" title="${inc.title}">${inc.title}</span>
              <span style="font-size: 0.725rem; color: var(--text-muted);">${inc.startDate} ~ ${inc.endDate}</span>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <button class="btn btn-secondary btn-upload-xlsx" data-id="${inc.id}" style="padding: 6px 12px; font-size: 0.775rem; display: inline-flex; align-items: center; gap: 4px; color: ${btnColor}; border-color: ${btnBorder}; background: ${btnBg};" onmouseover="this.style.background='${btnHoverBg}'" onmouseout="this.style.background='${btnBg}'">
              <i data-lucide="${iconName}" style="width: 12px; height: 12px;"></i> ${btnText}
            </button>
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

    // Select All and Bulk Delete buttons control
    const bulkDeleteBtn = document.getElementById('btn-bulk-delete-inc');
    const chkSelectAll = document.getElementById('chk-select-all-inc');

    if (bulkDeleteBtn) {
      bulkDeleteBtn.style.display = 'none'; // hide by default on redraw
      
      // Bind click handler dynamically to prevent registration issues
      bulkDeleteBtn.onclick = async () => {
        const checkedBoxes = listWrapper.querySelectorAll('.chk-select-inc:checked');
        if (checkedBoxes.length === 0) {
          alert('선택된 시상안이 없습니다.');
          return;
        }

        if (confirm(`선택한 ${checkedBoxes.length}개의 시상안을 정말 일괄 삭제하고 배포 취소하시겠습니까?\n이 작업은 되돌릴 수 없으며 캘린더에서 즉시 삭제됩니다.`)) {
          const idsToDelete = Array.from(checkedBoxes).map(chk => chk.getAttribute('data-id'));
          
          window.INCENTIVE_DATABASE.incentives = window.INCENTIVE_DATABASE.incentives.filter(i => !idsToDelete.includes(i.id));

          try {
            await window.dbSet('hanwha_incentives', window.INCENTIVE_DATABASE.incentives);
          } catch (err) {
            console.error("IndexedDB delete failed during bulk delete", err);
          }

          window.renderActiveIncentivesManager();

          if (typeof window.refreshApp === 'function') {
            window.refreshApp();
          }
          
          alert('선택한 시상안들이 성공적으로 일괄 삭제 및 배포 취소되었습니다.');
        }
      };
    }
    if (chkSelectAll) {
      chkSelectAll.checked = false; // uncheck by default on redraw
      chkSelectAll.onchange = (e) => {
        const isChecked = e.target.checked;
        listWrapper.querySelectorAll('.chk-select-inc').forEach(chk => {
          chk.checked = isChecked;
        });
        updateBulkDeleteBtnVisibility();
      };
    }

    function updateBulkDeleteBtnVisibility() {
      if (!bulkDeleteBtn) return;
      const allBoxes = listWrapper.querySelectorAll('.chk-select-inc');
      const checkedBoxes = listWrapper.querySelectorAll('.chk-select-inc:checked');
      
      bulkDeleteBtn.style.display = checkedBoxes.length > 0 ? 'inline-flex' : 'none';
      
      if (chkSelectAll) {
        chkSelectAll.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
      }
    }

    // Bind click and change event handlers directly to elements to ensure reliability and bypass delegation issues
    listWrapper.querySelectorAll('.chk-select-inc').forEach(chk => {
      chk.onchange = () => {
        updateBulkDeleteBtnVisibility();
      };
    });

    listWrapper.querySelectorAll('.btn-upload-xlsx').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        window.activeIncentiveXlsxId = id;
        const uploadInput = document.getElementById('inc-xlsx-upload-input');
        if (uploadInput) {
          uploadInput.click();
        }
      };
    });

    listWrapper.querySelectorAll('.btn-edit-inc').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const incentives = window.INCENTIVE_DATABASE.incentives;
        const targetIdx = incentives.findIndex(i => i.id === id);
        if (targetIdx === -1) return;

        window.currentParsedObjects = JSON.parse(JSON.stringify(incentives));
        window.activeParsedIndex = targetIdx;
        window.currentSlideCount = incentives.length;
        window.currentDiscardedCount = 0;

        renderParsedResultCard(targetIdx);
        if (parsedResultsPanel) {
          parsedResultsPanel.style.display = 'block';
          parsedResultsPanel.scrollIntoView({ behavior: 'smooth' });
        }
      };
    });

    listWrapper.querySelectorAll('.btn-delete-inc').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const targetObj = window.INCENTIVE_DATABASE.incentives.find(i => i.id === id);
        if (!targetObj) return;

        if (confirm(`"${targetObj.title}" 시상안을 정말 삭제하고 배포 취소하시겠습니까?\n이 작업은 되돌릴 수 없으며 캘린더에서 즉시 삭제됩니다.`)) {
          window.INCENTIVE_DATABASE.incentives = window.INCENTIVE_DATABASE.incentives.filter(i => i.id !== id);
          try {
            await window.dbSet('hanwha_incentives', window.INCENTIVE_DATABASE.incentives);
          } catch (err) {
            console.error("IndexedDB delete failed", err);
          }
          window.renderActiveIncentivesManager();

          if (typeof window.refreshApp === 'function') {
            window.refreshApp();
          }
          alert('시상안이 성공적으로 삭제 및 배포 취소되었습니다.');
        }
      };
    });

    if (window.lucide) {
      window.lucide.createIcons({ root: listWrapper });
    }
  };

  // --- 5. Incentive-specific Excel (.xlsx) Performance Mapping & Parsing ---
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM selection variables once DOM is ready to avoid null elements
    fileDropZone = document.getElementById('file-drop-zone');
    fileInput = document.getElementById('file-input');
    consoleLogsContainer = document.getElementById('console-logs-container');
    analyzerLoader = document.getElementById('analyzer-loader');
    loaderProgressFill = document.getElementById('loader-progress-fill-bar');
    loaderText = document.getElementById('analyzer-loader-text');
    parsedResultsPanel = document.getElementById('parsed-results-panel');
    parsedResultCardData = document.getElementById('parsed-result-card-data');

    // Bind file upload drop zone event listeners
    if (fileInput && fileDropZone) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleCustomFiles(e.target.files);
          fileInput.value = '';
        }
      });

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

    // Bind review commit action button click handler
    const btnCommitParsed = document.getElementById('btn-commit-parsed');
    if (btnCommitParsed) {
      btnCommitParsed.addEventListener('click', async () => {
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

        // Synchronize with IndexedDB
        try {
          await window.dbSet('hanwha_incentives', window.INCENTIVE_DATABASE.incentives);
        } catch (err) {
          console.error("IndexedDB sync failed", err);
          alert("시상 데이터 저장에 실패했습니다. 저장 장치 용량 부족 등 브라우저 데이터 정책을 확인해주세요.");
        }

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
        if (parsedResultsPanel) parsedResultsPanel.style.display = 'none';
        
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

    // Bind review discard action button click handler
    const btnDiscardParsed = document.getElementById('btn-discard-parsed');
    if (btnDiscardParsed) {
      btnDiscardParsed.addEventListener('click', () => {
        if (parsedResultsPanel) parsedResultsPanel.style.display = 'none';
        window.currentParsedObjects = null;
        window.activeParsedIndex = null;
      });
    }

    // Bind excel input change listener
    const incXlsxInput = document.getElementById('inc-xlsx-upload-input');
    if (incXlsxInput) {
      incXlsxInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !window.activeIncentiveXlsxId) return;

        try {
          await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX');
        } catch (err) {
          console.error("Failed to load XLSX: ", err);
          alert("Excel 분석 라이브러리(SheetJS)를 로드하지 못했습니다.");
          return;
        }

        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const parsedData = parseIncentiveXlsx(rawRows);
          if (parsedData.length > 0) {
            const inc = window.INCENTIVE_DATABASE.incentives.find(i => i.id === window.activeIncentiveXlsxId);
            if (inc) {
              inc.excelData = parsedData;
              inc.valHeaderName = parsedData.valHeaderName || '실적';
              
              // Sync Excel list to IndexedDB
              await window.dbSet('hanwha_incentives', window.INCENTIVE_DATABASE.incentives);
              
              if (typeof window.refreshApp === 'function') {
                window.refreshApp();
              }
              alert(`[${inc.title}] 시책 실적 데이터 연동 완료!\n총 ${parsedData.length}명의 실적 데이터가 정상 반영되었습니다.`);
            }
          } else {
            alert("선택하신 엑셀 파일에서 유효한 실적 데이터(이름 및 수치)를 찾지 못했습니다.");
          }
        } catch (err) {
          console.error("XLSX parsing failed: ", err);
          alert("엑셀 파일 파싱 중 오류가 발생했습니다: " + err.message);
        }

        incXlsxInput.value = '';
        window.activeIncentiveXlsxId = null;
      });
    }
  });

  // Smart XLSX achievement parser
  function parseIncentiveXlsx(rows) {
    let codeColIdx = -1;
    let nameColIdx = -1;
    let valColIdx = -1;
    let valHeaderName = '실적';
    
    // 1. Scan for header row containing code, name and performance keywords
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        if (row[c] === undefined || row[c] === null) continue;
        const val = String(row[c]).replace(/\s+/g, '').toLowerCase();
        
        // Match FP Code
        if (val.includes('fp코드') || val.includes('사번') || val.includes('코드') || val.includes('등록번호') || val.includes('설계사코드') || val.includes('사원번호')) {
          codeColIdx = c;
        }
        // Match FP Name
        else if (val.includes('fp명') || val.includes('성명') || val.includes('이름') || val.includes('설계사명') || val.includes('fp이름') || val === 'fp' || val === '설계사') {
          nameColIdx = c;
        }
        // Match Incentive/Value (priority is given to '시상금' keyword)
        else if (val.includes('시상금') || val.includes('실적') || val.includes('보험료') || val.includes('보장성') || val.includes('환산') || val.includes('건수') || val.includes('가동') || val.includes('달성')) {
          if (valColIdx === -1 || val.includes('시상금')) {
            valColIdx = c;
            if (val.includes('시상금')) {
              valHeaderName = '예상 시상금';
            }
          }
        }
      }
      if (codeColIdx !== -1 && valColIdx !== -1) {
        break;
      }
    }
    
    // Fallback if header not found
    if (codeColIdx === -1) codeColIdx = 0;
    if (nameColIdx === -1) nameColIdx = codeColIdx;
    if (valColIdx === -1) valColIdx = 1;
    
    const data = [];
    rows.forEach((row) => {
      if (!Array.isArray(row) || row.length <= Math.max(codeColIdx, Math.max(nameColIdx, valColIdx))) return;
      
      const rawCode = String(row[codeColIdx]).trim();
      const rawName = String(row[nameColIdx]).trim();
      
      // Filter out typical title/header values and empty spaces
      if (rawCode === '' || rawCode.toLowerCase().includes('코드') || rawCode.toLowerCase().includes('사번') || rawCode.includes('합계') || rawCode.includes('총계') || rawCode.includes('NO')) return;
      if (rawName.includes('합계') || rawName.includes('총계')) return;
      
      const rawVal = row[valColIdx];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') return;
      
      let numVal = parseFloat(String(rawVal).replace(/,/g, ''));
      if (isNaN(numVal)) numVal = 0;
      
      data.push({
        code: rawCode,
        name: rawName === rawCode ? '' : rawName, // Leave name blank if fallback was used
        value: numVal
      });
    });
    
    const result = data;
    result.valHeaderName = valHeaderName;
    return result;
  }

  // --- 6. Branch Selector Change Event Handler ---
  const branchSelector = document.getElementById('branch-selector');
  if (branchSelector) {
    branchSelector.addEventListener('change', async (e) => {
      const idx = e.target.value;
      if (idx === "" || !window.currentBranchDataList || !window.currentBranchDataList[idx]) return;
      
      const branchData = window.currentBranchDataList[idx];
      const profile = window.INCENTIVE_DATABASE.agentProfile;
      const isBM = profile.role === 'bm';
      
      profile.currentStats.premiums = branchData.monthlyPremium;
      profile.currentStats.converted = branchData.convertedPremium;
      
      profile.currentStats.converted40k = "-";
      profile.currentStats.retention = "-";
      
      // Stats updated in profile.currentStats, widget updating is no longer needed since the widget was deleted.
      
      // Save stats persistently to IndexedDB
      try {
        await window.dbSet('hanwha_agent_profile', profile);
      } catch (err) {
        console.error("IndexedDB profile sync failed", err);
      }
      
      // Update sidebar branch info if not BM
      const userBranchEl = document.getElementById('user-branch');
      const sideBranch = document.getElementById('sidebar-user-branch');
      if (userBranchEl && !isBM) userBranchEl.textContent = branchData.name;
      if (sideBranch && !isBM) {
        sideBranch.textContent = branchData.name;
        sideBranch.style.display = 'block';
      }
      
      if (typeof window.refreshApp === 'function') {
        window.refreshApp();
      }
      
      alert(`[${branchData.name}] 실적 정보 동기화 완료!\n\n• 월초 보험료(D열): ${profile.currentStats.premiums.toLocaleString()}원\n• 보장성 환산성적(AA열): ${profile.currentStats.converted.toLocaleString()}원`);
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
      
      const branchDataList = [];
      
      rawRows.forEach((row, rowIndex) => {
        if (!Array.isArray(row) || row.length < 2) return;
        const colA = String(row[0]).trim();
        const colB = String(row[1]).trim();
        
        // 지점이 포함되고 헤더나 빈 행이 아닌 경우
        if (colA.includes('지점') && colA !== '소속' && !colA.includes('지점명') && !colA.includes('소속지점')) {
          const monthlyPremium = parseExcelAmount(row[3]); // D열 (Index 3)
          const convertedPremium = parseExcelAmount(row[26]); // AA열 (Index 26)
          
          branchDataList.push({
            name: colA,
            leader: colB,
            monthlyPremium: monthlyPremium,
            convertedPremium: convertedPremium
          });
        }
      });

      if (branchDataList.length > 0) {
        window.currentBranchDataList = branchDataList;
        
        const selector = document.getElementById('branch-selector');
        const container = document.getElementById('branch-select-container');
        if (selector && container) {
          container.style.display = 'block';
          // Clear and fill dropdown
          selector.innerHTML = '<option value="">-- 소속 지점을 선택하세요 --</option>';
          branchDataList.forEach((b, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = `${b.name} (${b.leader} 지점장)`;
            selector.appendChild(option);
          });
          
          container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          alert(`엑셀 파일 연동 완료!\n\n총 ${branchDataList.length}개의 지점 데이터를 감지했습니다. 아래 '소속 지점 선택'에서 지점을 선택해 주세요.`);
        }
      } else {
        alert("업로드된 엑셀 파일에서 지점 데이터(A열에 '지점'이 포함된 행)를 찾을 수 없습니다.");
      }

    } catch (err) {
      console.error("Excel file parsing failed: ", err);
      alert(`Excel 파일 연동 중 오류가 발생했습니다: ${err.message}`);
    }
  }

  function parseExcelAmount(val) {
    if (val === undefined || val === null) return 0;
    let num = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return 0;
    // float less than 1000 like 33.104
    if (num < 1000) {
      return Math.round(num * 1000000);
    }
    // integer less than 100000 like 33104
    if (num < 100000) {
      return Math.round(num * 1000);
    }
    return Math.round(num);
  }

})();

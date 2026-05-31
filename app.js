// C:\Users\user\.gemini\antigravity\scratch\hanwha-insure-incentives\app.js

// Declare state variables
let currentYear = 2026;
let currentMonth = 4; // May (0-indexed)
let activeIssueIndex = 0;
let selectedDate = "2026-05-30";

const TWOW_DEADLINES = {
  2026: {
    0: { 9: 'yellow', 16: 'green', 23: 'blue', 30: 'orange' }, // Jan
    1: { 6: 'yellow', 12: 'green', 23: 'blue', 27: 'orange' }, // Feb
    2: { 6: 'yellow', 13: 'green', 20: 'blue', 31: 'orange' }, // Mar
    3: { 7: 'yellow', 14: 'green', 21: 'blue', 30: 'orange' }, // Apr
    4: { 8: 'yellow', 15: 'green', 22: 'blue', 29: 'orange' }, // May
    5: { 5: 'yellow', 12: 'green', 19: 'blue', 30: 'orange' }, // Jun
    6: { 7: 'yellow', 14: 'green', 21: 'blue', 31: 'orange' }, // Jul
    7: { 7: 'yellow', 14: 'green', 21: 'blue', 31: 'orange' }, // Aug
    8: { 4: 'yellow', 11: 'green', 18: 'blue', 30: 'orange' }, // Sep
    9: { 8: 'yellow', 16: 'green', 23: 'blue', 30: 'orange' }, // Oct
    10: { 6: 'yellow', 13: 'green', 20: 'blue', 30: 'orange' }, // Nov
    11: { 4: 'yellow', 11: 'green', 18: 'blue', 31: 'orange' }  // Dec
  }
};

// Expose refresh function to window context so analyzer.js can access it
window.refreshApp = null;

// Helper function to return short compact text titles for mobile screen sizes
function getCompactTitle(title) {
  if (title.includes("장기보장성")) return "장기보장성";
  if (title.includes("자동차보험")) return "자동차보험";
  if (title.includes("도입")) return "신인도입";
  if (title.includes("2W")) return "2W 연속";
  if (title.includes("연도대상")) return "연도대상";
  return title.length > 5 ? title.substring(0, 4) + "…" : title;
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State
  if (!window.INCENTIVE_DATABASE) {
    console.error("Incentive Database mock not found!");
    return;
  }

  // 2. DOM Selection
  const btnCalendar = document.getElementById('btn-view-calendar');
  const btnAdmin = document.getElementById('btn-view-admin');
  const panelCalendar = document.getElementById('panel-calendar-view');
  const panelAdmin = document.getElementById('panel-admin-view');
  
  const roleToggle = document.getElementById('role-toggle');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const calendarCategoryFilters = document.getElementById('calendar-category-filters');
  
  const bottomSheetOverlay = document.getElementById('detail-panel-overlay');
  const btnCloseBottomSheet = document.getElementById('btn-close-detail-panel');

  // 3. SPA Routing Tabs Setup
  if (btnCalendar && btnAdmin && panelCalendar && panelAdmin) {
    btnCalendar.addEventListener('click', () => {
      btnCalendar.classList.add('active');
      btnAdmin.classList.remove('active');
      panelCalendar.classList.add('active');
      panelAdmin.classList.remove('active');
    });

    btnAdmin.addEventListener('click', () => {
      btnAdmin.classList.add('active');
      btnCalendar.classList.remove('active');
      panelAdmin.classList.add('active');
      panelCalendar.classList.remove('active');
      
      // 관리자 탭 활성화 시 등록된 시상안 목록 편집 관리 보드 즉시 렌더링
      if (typeof window.renderActiveIncentivesManager === 'function') {
        window.renderActiveIncentivesManager();
      }
    });
  }

  // 4. Calendar Navigation & Filter Event Handlers
  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  }

  if (calendarCategoryFilters) {
    calendarCategoryFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (chip) {
        calendarCategoryFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderCalendar();
      }
    });
  }

  // 5. Login & Logout Navigation Event Handlers
  const loginScreen = document.getElementById('login-screen');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnLogout = document.getElementById('btn-logout');
  
  if (btnLoginSubmit && loginScreen) {
    btnLoginSubmit.addEventListener('click', () => {
      const usernameInput = document.getElementById('login-username'); // Code input field
      const passwordInput = document.getElementById('login-password'); // Password input field
      const isAdminCheckbox = document.getElementById('login-is-admin');
      
      const profile = window.INCENTIVE_DATABASE.agentProfile;
      
      // Registered users database mapping codes to credentials and roles
      const registeredUsers = {
        "112233": { role: "fp", name: "김한화", password: "112233", branch: "팔용지점" },
        "8094780": { role: "bm", name: "이창희", password: "8094780", branch: "팔용지점" }
      };
      
      const enteredCode = usernameInput ? usernameInput.value.trim() : "";
      const enteredPassword = passwordInput ? passwordInput.value : "";
      
      const user = registeredUsers[enteredCode];
      
      const errorMsgBox = document.getElementById('login-error-msg');
      const errorTextEl = document.getElementById('login-error-text');
      
      // 1. Code registration validation
      if (!user) {
        if (errorMsgBox && errorTextEl) {
          errorTextEl.textContent = "등록되지 않은 코드입니다";
          errorMsgBox.style.display = "flex";
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
      
      // 2. Password correctness validation
      if (user.password !== enteredPassword) {
        if (errorMsgBox && errorTextEl) {
          errorTextEl.textContent = "비밀번호가 틀렸습니다";
          errorMsgBox.style.display = "flex";
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
      
      // 3. Role checkbox matching validation (BM code must check Admin Mode)
      if (user.role === "bm" && (!isAdminCheckbox || !isAdminCheckbox.checked)) {
        if (errorMsgBox && errorTextEl) {
          errorTextEl.textContent = "관리자 코드는 관리자 모드를 체크해야 로그인 가능합니다";
          errorMsgBox.style.display = "flex";
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
      
      // Block FP code logins if Admin Mode is checked
      if (user.role === "fp" && isAdminCheckbox && isAdminCheckbox.checked) {
        if (errorMsgBox && errorTextEl) {
          errorTextEl.textContent = "FP 코드는 관리자 모드로 로그인할 수 없습니다";
          errorMsgBox.style.display = "flex";
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
      
      // Clear error on successful validation
      if (errorMsgBox) {
        errorMsgBox.style.display = "none";
      }
      
      const role = user.role;
      const name = user.name;
      const branch = user.branch;
      
      // Sync checkbox state for visual consistency
      if (isAdminCheckbox) {
        isAdminCheckbox.checked = (role === "bm");
      }
      
      // Update profile database state
      profile.name = name;
      profile.branch = branch;
      profile.role = role;
      
      // Depending on the role, update stats values
      if (role === 'bm') {
        profile.currentStats = {
          contracts: 48,
          premiums: 4200000,
          goods: 1,
          two连续: 3,
          points: 18500,
          recruits: 8
        };
      } else {
        profile.currentStats = {
          contracts: 3,
          premiums: 180000,
          goods: 1,
          two连续: 1,
          points: 6500,
          recruits: 1
        };
      }
      
      // Sync all dynamic widgets, lists and header text displays
      updateUserRoleView();
      renderCalendar();
      renderSummaryList();
      renderSelectedDateEvents(selectedDate);
      
      // Hide login overlay with beautiful animation transition
      loginScreen.classList.add('fade-out');
    });
  }

  if (btnLogout && loginScreen) {
    btnLogout.addEventListener('click', () => {
      // Show login overlay back
      loginScreen.classList.remove('fade-out');
      
      // Hide error box if visible
      const errorMsgBox = document.getElementById('login-error-msg');
      if (errorMsgBox) {
        errorMsgBox.style.display = "none";
      }
      
      // Reset input fields to defaults
      const usernameInput = document.getElementById('login-username');
      if (usernameInput) {
        usernameInput.value = "112233";
      }
      const passwordInput = document.getElementById('login-password');
      if (passwordInput) {
        passwordInput.value = "112233";
      }
      const isAdminCheckbox = document.getElementById('login-is-admin');
      if (isAdminCheckbox) {
        isAdminCheckbox.checked = false;
      }
    });
  }

  // 6. Bottom Sheet Overlay Closing Handlers
  if (btnCloseBottomSheet) {
    btnCloseBottomSheet.addEventListener('click', closeBottomSheet);
  }

  if (bottomSheetOverlay) {
    bottomSheetOverlay.addEventListener('click', (e) => {
      if (e.target === bottomSheetOverlay) {
        closeBottomSheet();
      }
    });
  }

  // 7. Core Render Orchestrators

  // Render Calendar Grid for Active Month with Horizontal Spanning Ribbons
  function renderCalendar() {
    const daysWrapper = document.getElementById('calendar-days-wrapper');
    const titleEl = document.getElementById('calendar-title');
    if (!daysWrapper || !titleEl) return;

    // Set month & year title
    titleEl.textContent = `${currentYear}년 ${currentMonth + 1}월`;

    // Get active category filter
    const activeFilterBtn = document.querySelector('#calendar-category-filters .filter-chip.active');
    const activeCategory = activeFilterBtn ? activeFilterBtn.getAttribute('data-category') : 'all';

    // Render Dynamic Top Hero Dashboard for 2W / Annual Award
    renderHeroDashboard(activeCategory);

    // Clear previous elements
    daysWrapper.innerHTML = '';

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // 1. Flat array of exactly 42 cells representing the calendar grid days
    const daysArray = [];

    // Prev Month Trailing Days (Padding)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dayStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      daysArray.push({ dateStr: dayStr, label: dayNum, isActiveMonth: false, isToday: false });
    }

    // Active Month Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = currentYear === 2026 && currentMonth === 4 && d === 30; // Simulated timeline today
      daysArray.push({ dateStr: dayStr, label: d, isActiveMonth: true, isToday: isToday });
    }

    // Next Month Leading Days
    const totalCells = 42;
    const nextMonthDaysNeeded = totalCells - daysArray.length;
    for (let d = 1; d <= nextMonthDaysNeeded; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dayStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArray.push({ dateStr: dayStr, label: d, isActiveMonth: false, isToday: false });
    }

    // 2. Filter active incentives for the grid
    const gridIncentives = window.INCENTIVE_DATABASE.incentives.filter(inc => {
      if (activeCategory !== 'all' && inc.category !== activeCategory) return false;
      return true;
    });

    const totalSlots = gridIncentives.length;
    const fragment = document.createDocumentFragment();

    // 3. Render 42 day cells in the grid using DocumentFragment for maximum performance
    daysArray.forEach((dayObj, cellIndex) => {
      const isSelected = selectedDate === dayObj.dateStr;
      const dayBox = document.createElement('div');
      dayBox.className = `calendar-day-cell ${dayObj.isActiveMonth ? '' : 'inactive'} ${dayObj.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
      dayBox.setAttribute('data-date', dayObj.dateStr);
      dayBox.style.zIndex = 42 - cellIndex;

      // Day Header Row
      const headerRow = document.createElement('div');
      headerRow.className = 'calendar-day-header-row';
      headerRow.style.display = 'flex';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.alignItems = 'center';
      headerRow.style.width = '100%';
      headerRow.style.pointerEvents = 'none';

      // Day Number Label
      const numSpan = document.createElement('span');
      numSpan.className = 'calendar-day-number';
      numSpan.textContent = dayObj.label;

      // Highlight 2W weekly closing deadline circled badge & text
      const dateParts = dayObj.dateStr.split('-');
      const yVal = parseInt(dateParts[0], 10);
      const mVal = parseInt(dateParts[1], 10) - 1;
      const dVal = parseInt(dateParts[2], 10);
      const deadlineColor = TWOW_DEADLINES[yVal]?.[mVal]?.[dVal];
      
      if (deadlineColor) {
        numSpan.classList.add(`deadline-${deadlineColor}`);
        let weekNum = 1;
        if (deadlineColor === 'green') weekNum = 2;
        else if (deadlineColor === 'blue') weekNum = 3;
        else if (deadlineColor === 'orange') weekNum = 4;
        numSpan.title = `2W 가동 ${weekNum}주차 마감일`;

        const badgeSpan = document.createElement('span');
        badgeSpan.className = `deadline-text-badge text-${deadlineColor}`;
        badgeSpan.textContent = '2W 마감';
        badgeSpan.title = `2W 가동 ${weekNum}주차 마감일`;
        badgeSpan.style.pointerEvents = 'auto';
        
        badgeSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedDate = dayObj.dateStr;
          renderCalendar();
          renderSelectedDateEvents(dayObj.dateStr);
        });
        
        headerRow.appendChild(badgeSpan);
      } else {
        const spacer = document.createElement('span');
        spacer.style.width = '1px';
        spacer.style.height = '1px';
        headerRow.appendChild(spacer);
      }

      headerRow.appendChild(numSpan);
      dayBox.appendChild(headerRow);

      // Chips Container
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'event-chips-container';
      dayBox.appendChild(chipsContainer);

      // Determine active slot height dynamically to avoid vertical overlaps
      let maxActiveSlot = -1;
      for (let s = 0; s < totalSlots; s++) {
        const inc = gridIncentives[s];
        const diffTime = Math.abs(new Date(inc.endDate) - new Date(inc.startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isLongTerm = diffDays >= 30;

        const isActiveToday = isLongTerm 
          ? (dayObj.dateStr === inc.endDate) 
          : (dayObj.dateStr >= inc.startDate && dayObj.dateStr <= inc.endDate);

        if (isActiveToday) {
          maxActiveSlot = s;
        }
      }

      for (let s = 0; s <= maxActiveSlot; s++) {
        const inc = gridIncentives[s];
        const diffTime = Math.abs(new Date(inc.endDate) - new Date(inc.startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isLongTerm = diffDays >= 30;

        const isActiveToday = isLongTerm 
          ? (dayObj.dateStr === inc.endDate) 
          : (dayObj.dateStr >= inc.startDate && dayObj.dateStr <= inc.endDate);

        if (isActiveToday) {
          const isPrevActive = !isLongTerm && 
                               cellIndex > 0 && 
                               (cellIndex % 7 !== 0) && 
                               (daysArray[cellIndex - 1].dateStr >= inc.startDate && daysArray[cellIndex - 1].dateStr <= inc.endDate);

          const isNextActive = !isLongTerm && 
                               cellIndex < 41 && 
                               (cellIndex % 7 !== 6) && 
                               (daysArray[cellIndex + 1].dateStr >= inc.startDate && daysArray[cellIndex + 1].dateStr <= inc.endDate);

          const chip = document.createElement('div');
          let colorClass = inc.colorOverride ? `override-${inc.colorOverride}` : `cat-${inc.category}`;
          chip.className = `event-chip ${colorClass}`;
          chip.setAttribute('data-inc-id', inc.id);
          chip.title = inc.title;

          const isMobile = window.innerWidth <= 768;

          if (!isPrevActive) {
            let spanCount = 1;
            let nextIndex = cellIndex + 1;
            let continuesPrevWeek = cellIndex > 0 && 
                                    (cellIndex % 7 === 0) && 
                                    (daysArray[cellIndex - 1].dateStr >= inc.startDate && daysArray[cellIndex - 1].dateStr <= inc.endDate);
            let continuesNextWeek = false;
            while (nextIndex < 42) {
              if (nextIndex % 7 === 0) {
                const nextDayStr = daysArray[nextIndex].dateStr;
                if (nextDayStr >= inc.startDate && nextDayStr <= inc.endDate) {
                  continuesNextWeek = true;
                }
                break;
              }
              const nextDayStr = daysArray[nextIndex].dateStr;
              if (nextDayStr >= inc.startDate && nextDayStr <= inc.endDate) {
                spanCount++;
                nextIndex++;
              } else {
                break;
              }
            }
            
            let leftBridgeVar = continuesPrevWeek ? 'var(--right-bridge, 10px)' : '0px';
            let rightBridgeVar = continuesNextWeek ? 'var(--right-bridge, 10px)' : '0px';
            
            if (!isMobile) {
              chip.style.setProperty('width', `calc(${spanCount} * 100% + ${spanCount - 1} * var(--cell-gap-pad, 32px) + ${leftBridgeVar} + ${rightBridgeVar})`, 'important');
              chip.style.setProperty('margin-right', `calc(-${spanCount - 1} * (100% + var(--cell-gap-pad, 32px)) - ${rightBridgeVar})`, 'important');
              
              if (continuesPrevWeek) {
                chip.style.setProperty('margin-left', `calc(-1 * ${leftBridgeVar})`, 'important');
                chip.classList.add('continues-prev');
              }
              if (continuesNextWeek) {
                chip.classList.add('continues-next');
              }
            }
          }

          let displayTitle = isMobile ? getCompactTitle(inc.title) : (inc.title.length > 25 ? inc.title.substring(0, 24) + '…' : inc.title);
          if (isLongTerm) {
            displayTitle = `[마감] ${displayTitle}`;
          }

          if (!isPrevActive && isNextActive) {
            chip.classList.add('span-start');
            chip.textContent = displayTitle;
          } else if (isPrevActive && isNextActive) {
            chip.classList.add('span-middle');
            chip.textContent = isMobile ? displayTitle : '';
            if (!isMobile) chip.innerHTML = '&nbsp;';
          } else if (isPrevActive && !isNextActive) {
            chip.classList.add('span-end');
            chip.textContent = isMobile ? displayTitle : '';
            if (!isMobile) chip.innerHTML = '&nbsp;';
          } else {
            chip.textContent = displayTitle;
          }

          chip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openBottomSheet(inc.id);
          });

          chipsContainer.appendChild(chip);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'event-chip-placeholder';
          chipsContainer.appendChild(placeholder);
        }
      }

      // Cell selection event
      dayBox.addEventListener('click', (e) => {
        if (e.target.closest('.event-chip')) return;
        selectedDate = dayObj.dateStr;
        renderCalendar();
        renderSelectedDateEvents(dayObj.dateStr);
      });

      fragment.appendChild(dayBox);
    });

    // Bulk append to wrappers to trigger single DOM reflow
    daysWrapper.appendChild(fragment);
  }

  // Render Dynamic Top Hero Dashboard for 2W / Annual Award category
  function renderHeroDashboard(activeCategory) {
    const heroDashboard = document.getElementById('two-annual-hero-dashboard');
    if (!heroDashboard) return;

    if (activeCategory === 'two_annual') {
      // 1. Fetch current agent profile stats
      const stats = window.INCENTIVE_DATABASE.agentProfile.currentStats;
      
      // 2. Fetch incentives to obtain milestones
      const inc2W = window.INCENTIVE_DATABASE.incentives.find(i => i.id === 'inc-004') || {};
      const incAnnual = window.INCENTIVE_DATABASE.incentives.find(i => i.id === 'inc-005') || {};
      
      // Calculate 2W continuity progress
      const twoCurrent = stats.two连续 || 1;
      const twoMilestones = inc2W.milestones || [];
      const twoMax = twoMilestones.length > 0 ? twoMilestones[twoMilestones.length - 1].value : 4;
      const twoPct = Math.min(100, (twoCurrent / twoMax) * 100);
      
      let twoActiveMilestone = null;
      let twoNextMilestone = null;
      for (let i = 0; i < twoMilestones.length; i++) {
        if (twoCurrent >= twoMilestones[i].value) {
          twoActiveMilestone = twoMilestones[i];
        } else {
          twoNextMilestone = twoMilestones[i];
          break;
        }
      }
      
      const twoGap = twoNextMilestone ? twoNextMilestone.value - twoCurrent : 0;
      
      // Calculate Annual cumulative progress
      const annualCurrent = stats.points || 6500;
      const annualMilestones = incAnnual.milestones || [];
      const annualMax = annualMilestones.length > 0 ? annualMilestones[annualMilestones.length - 1].value : 30000;
      const annualPct = Math.min(100, (annualCurrent / annualMax) * 100);
      
      let annualActiveMilestone = null;
      let annualNextMilestone = null;
      for (let i = 0; i < annualMilestones.length; i++) {
        if (annualCurrent >= annualMilestones[i].value) {
          annualActiveMilestone = annualMilestones[i];
        } else {
          annualNextMilestone = annualMilestones[i];
          break;
        }
      }
      
      const annualGap = annualNextMilestone ? annualNextMilestone.value - annualCurrent : 0;

      // Draw milestones markers along visual gauge tracks
      let twoNodes = '';
      twoMilestones.forEach(m => {
        const pct = (m.value / twoMax) * 100;
        twoNodes += `<div class="hero-milestone-indicator ${twoCurrent >= m.value ? 'achieved' : ''}" style="left: ${pct}%;" title="${m.name}: ${m.reward}"></div>`;
      });

      let annualNodes = '';
      annualMilestones.forEach(m => {
        const pct = (m.value / annualMax) * 100;
        annualNodes += `<div class="hero-milestone-indicator ${annualCurrent >= m.value ? 'achieved' : ''}" style="left: ${pct}%;" title="${m.name}: ${m.reward}"></div>`;
      });

      heroDashboard.innerHTML = `
        <div class="hero-dashboard-title">
          <i data-lucide="award"></i> 2W 가동 및 2026 연도대상 통합 대시보드
        </div>
        <div class="hero-grid">
          
          <!-- Card A: 2W 연속 가동 현황 -->
          <div class="hero-card">
            <div class="hero-card-header">
              <span class="hero-card-title">2W 연속 가동 현황 (주수)</span>
              <span class="hero-card-value">${twoCurrent}주 연속 가동</span>
            </div>
            
            <div class="hero-gauge-wrapper">
              <div class="hero-gauge-track">
                <div class="hero-gauge-fill" style="width: ${twoPct}%;"></div>
                ${twoNodes}
              </div>
            </div>
            
            <div class="hero-gap-message">
              ${twoNextMilestone ? `다음 단계 <b>[${twoNextMilestone.name}]</b>까지 <b>${twoGap}주</b> 연속 가동 필요` : '<b class="color-success">최고 등급 달성 완료!</b>'}
            </div>
            
            ${twoActiveMilestone ? `
              <div class="hero-reward-pill">
                <i data-lucide="gift" class="icon-xs inline-icon"></i> 달성 보상: ${twoActiveMilestone.reward}
              </div>
            ` : ''}
          </div>

          <!-- Card B: 연도대상 진척현황 -->
          <div class="hero-card">
            <div class="hero-card-header">
              <span class="hero-card-title">2026 연도대상 누적 포인트</span>
              <span class="hero-card-value">${annualCurrent.toLocaleString()} pt</span>
            </div>
            
            <div class="hero-gauge-wrapper">
              <div class="hero-gauge-track">
                <div class="hero-gauge-fill" style="width: ${annualPct}%;"></div>
                ${annualNodes}
              </div>
            </div>
            
            <div class="hero-gap-message">
              ${annualNextMilestone ? `다음 등급 <b>[${annualNextMilestone.name}]</b>까지 <b>${annualGap.toLocaleString()} pt</b> 남음` : '<b class="color-success">연도대상 최종 통과!</b>'}
            </div>
            
            ${annualActiveMilestone ? `
              <div class="hero-reward-pill">
                <i data-lucide="trophy" class="icon-xs inline-icon"></i> 현재 등급 특전: ${annualActiveMilestone.reward}
              </div>
            ` : ''}
          </div>

        </div>
      `;

      heroDashboard.style.display = 'block';
      if (window.lucide) window.lucide.createIcons();
    } else {
      heroDashboard.style.display = 'none';
      heroDashboard.innerHTML = '';
    }
  }

  // Render Pinned Selected Date Incentives List (tactile schedule row list)
  function renderSelectedDateEvents(dayStr) {
    const listWrapper = document.getElementById('selected-date-incentives-list');
    const titleEl = document.getElementById('selected-date-title');
    if (!listWrapper || !titleEl) return;

    // Parse and format date title
    const date = new Date(dayStr);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const formattedTitle = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;
    titleEl.textContent = formattedTitle;

    // Filter active incentives on this specific day (excluding long term championship for better focus)
    const activeIncentives = window.INCENTIVE_DATABASE.incentives.filter(inc => {
      // Keep only short-term active ones on this day
      const diffTime = Math.abs(new Date(inc.endDate) - new Date(inc.startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 60) return false;
      return dayStr >= inc.startDate && dayStr <= inc.endDate;
    });

    // Check for 2W Weekly closing deadline
    const dateParts = dayStr.split('-');
    const yVal = parseInt(dateParts[0], 10);
    const mVal = parseInt(dateParts[1], 10) - 1;
    const dVal = parseInt(dateParts[2], 10);
    const deadlineColor = TWOW_DEADLINES[yVal]?.[mVal]?.[dVal];

    let html = '';

    // Render 2W Weekly closing deadline notice card if applicable
    if (deadlineColor) {
      let weekNum = 1;
      let deadlineText = "2W 가동 1주차 마감일";
      let colorHex = "#FFD600";
      if (deadlineColor === 'green') {
        weekNum = 2;
        deadlineText = "2W 가동 2주차 마감일";
        colorHex = "#00C853";
      } else if (deadlineColor === 'blue') {
        weekNum = 3;
        deadlineText = "2W 가동 3주차 마감일";
        colorHex = "#00B0FF";
      } else if (deadlineColor === 'orange') {
        weekNum = 4;
        deadlineText = "2W 가동 4주차 마감일 (당월 마감)";
        colorHex = "#FF6D00";
      }

      html += `
        <div class="deadline-notice-card notice-${deadlineColor}">
          <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); flex-shrink: 0;">
            <i data-lucide="alert-circle" style="width: 18px; height: 18px; color: ${colorHex};"></i>
          </div>
          <div style="flex-grow: 1;">
            <h5 style="font-size: 0.85rem; font-weight: 700; margin: 0; color: ${colorHex};">
              ${deadlineText}
            </h5>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">
              <div style="font-weight: 600; color: #ff5252;">• 26년 2W 기준 변경사항: 37회차 이하 유의 승환계약 제외</div>
              <div style="color: var(--text-muted); margin-top: 2px;">• [참고] [대내-2512-11022] 2026년 1월 전속영업부문 FP(SFP)채널 프로모션 안내</div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeIncentives.length === 0) {
      html += `
        <div style="text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 0.825rem; font-family: var(--font-sans);">
          선택하신 날짜에 등록된 시상 일정이 없습니다.
        </div>
      `;
    } else {
      activeIncentives.forEach(inc => {
        const maxMilestone = inc.milestones ? inc.milestones[inc.milestones.length - 1].value : inc.targetValue;
        const percentage = Math.min(100, Math.round((inc.currentValue / maxMilestone) * 100));

        let catLabel = '장기/자동차';
        let iconName = 'shield';
        if (inc.category === 'two_annual') {
          catLabel = '2W/연도대상';
          iconName = 'award';
        } else if (inc.category === 'recruitment') {
          catLabel = '도입';
          iconName = 'user-plus';
        }

        html += `
          <div class="selected-date-row cat-${inc.category}" data-inc-id="${inc.id}" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border); padding: 14px 18px; border-radius: var(--radius-sm); cursor: pointer; margin-bottom: 2px;">
            <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
              <span class="category-indicator cat-${inc.category}" style="flex-shrink: 0; padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="${iconName}" style="width: 10px; height: 10px;"></i>
                ${catLabel}
              </span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${inc.title}</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
              <span style="font-size: 0.8rem; font-weight: 700; color: ${percentage >= 100 ? 'var(--accent-success)' : 'var(--text-secondary)'};">${percentage}% 달성</span>
              <i data-lucide="chevron-right" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
            </div>
          </div>
        `;
      });
    }

    listWrapper.innerHTML = html;

    // Add click listeners
    listWrapper.querySelectorAll('.selected-date-row').forEach(row => {
      row.addEventListener('click', () => {
        const incId = row.getAttribute('data-inc-id');
        openBottomSheet(incId);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Render "금주 영업 이슈 & 방향" Strategy Carousel
  function renderWeeklyIssues() {
    const wrapper = document.getElementById('issue-cards-wrapper');
    const indicators = document.getElementById('issue-indicators');
    if (!wrapper || !indicators) return;

    const issues = window.INCENTIVE_DATABASE.weeklyIssues;
    
    // Generate Cards
    let cardsHtml = '';
    issues.forEach(issue => {
      const actionLines = issue.actionPlan.split('\n');
      const actionListHtml = actionLines.map(line => `<li>${line}</li>`).join('');
      cardsHtml += `
        <div class="issue-slide-card">
          <span class="issue-badge">${issue.badge}</span>
          <span class="issue-subtitle">${issue.subtitle}</span>
          <h4 class="issue-title">${issue.title}</h4>
          <p class="issue-content">${issue.content}</p>
          <div class="action-plan-box">
            <h5><i data-lucide="check-square" class="icon-xs"></i> 실행 가이드</h5>
            <ul>${actionListHtml}</ul>
          </div>
        </div>
      `;
    });
    wrapper.innerHTML = cardsHtml;

    // Generate Carousel Dot Indicators
    let dotsHtml = '';
    issues.forEach((_, idx) => {
      dotsHtml += `<span class="indicator-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>`;
    });
    indicators.innerHTML = dotsHtml;

    // Carousel CSS flow layout setup
    wrapper.style.display = 'flex';
    wrapper.style.flexFlow = 'row nowrap';
    wrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
    wrapper.style.transform = 'translateX(0%)';

    const cards = wrapper.querySelectorAll('.issue-slide-card');
    cards.forEach(card => {
      card.style.flex = '0 0 100%';
      card.style.width = '100%';
      card.style.boxSizing = 'border-box';
    });

    // Carousel Event listener
    indicators.addEventListener('click', (e) => {
      const dot = e.target.closest('.indicator-dot');
      if (dot) {
        const idx = parseInt(dot.getAttribute('data-index'), 10);
        showIssueSlide(idx);
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Slide between issue strategy cards
  function showIssueSlide(index) {
    const wrapper = document.getElementById('issue-cards-wrapper');
    const dots = document.querySelectorAll('#issue-indicators .indicator-dot');
    if (!wrapper) return;

    activeIssueIndex = index;
    wrapper.style.transform = `translateX(-${index * 100}%)`;

    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Populate "주요 시상 요약 및 달성률" Panel in the Sidebar
  function renderSummaryList() {
    const wrapper = document.getElementById('summary-list-wrapper');
    if (!wrapper) return;

    const incentives = window.INCENTIVE_DATABASE.incentives;
    let html = '';
    
    incentives.forEach(inc => {
      const maxMilestone = inc.milestones ? inc.milestones[inc.milestones.length - 1].value : inc.targetValue;
      const percentage = Math.min(100, Math.round((inc.currentValue / maxMilestone) * 100));
      
      let displayVal = `${inc.currentValue}${inc.metricUnit} / ${maxMilestone}${inc.metricUnit}`;
      if (inc.metricType === 'premiums') {
        displayVal = `${(inc.currentValue / 10000).toFixed(0)}만 / ${(maxMilestone / 10000).toFixed(0)}만원`;
      }
      
      // Category tag mapping
      let catLabel = '장기/자동차';
      let iconName = 'shield';
      if (inc.category === 'two_annual') {
        catLabel = '2W/연도대상';
        iconName = 'calendar';
      } else if (inc.category === 'recruitment') {
        catLabel = '도입';
        iconName = 'user-plus';
      }
      
      html += `
        <div class="summary-item-card" data-inc-id="${inc.id}">
          <div class="summary-card-header">
            <span class="category-indicator cat-${inc.category}">
              <i data-lucide="${iconName}" class="icon-xs"></i>
              ${catLabel}
            </span>
            <h5 class="summary-card-title">${inc.title}</h5>
          </div>
          <div class="summary-progress-area">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill cat-${inc.category}" style="width: ${percentage}%"></div>
            </div>
            <div class="progress-values">
              <span class="progress-val-text">${displayVal}</span>
              <span class="pct-text ${percentage >= 100 ? 'complete' : ''}">${percentage}%</span>
            </div>
          </div>
        </div>
      `;
    });
    
    wrapper.innerHTML = html;
    
    // Add click listeners to shortcut directly to bottom sheets
    wrapper.querySelectorAll('.summary-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const incId = card.getAttribute('data-inc-id');
        openBottomSheet(incId);
      });
    });
    
    if (window.lucide) window.lucide.createIcons();
  }

  // Handle User Role Mode Switching (Visual Updates & Stats Sync)
  function updateUserRoleView() {
    const profile = window.INCENTIVE_DATABASE.agentProfile;
    const role = profile.role;
    const name = profile.name;
    const branch = profile.branch;
    
    const adminBtn = document.getElementById('btn-view-admin');
    const sideAdminTab = document.getElementById('sidebar-tab-admin');
    
    const userBranchEl = document.getElementById('user-branch');
    const userNameEl = document.getElementById('user-name');
    
    const sideName = document.getElementById('sidebar-user-name');
    const sideBranch = document.getElementById('sidebar-user-branch');
    
    const welcomeHeader = document.querySelector('.welcome-header h3');
    
    if (role === 'bm') {
      // Branch Manager Mode: show admin views
      if (adminBtn) adminBtn.style.display = 'inline-flex';
      if (sideAdminTab) sideAdminTab.style.display = 'flex';
      
      // Update profile info (Clear header branch text and remove duplicate icon)
      if (userBranchEl) {
        userBranchEl.textContent = '';
        userBranchEl.style.display = 'none'; // Completely hide element to avoid phantom margin spacing
      }
      if (userNameEl) userNameEl.textContent = `${name} 지점장`;
      
      if (sideName) sideName.textContent = `${name} 지점장`;
      if (sideBranch) {
        sideBranch.textContent = '';
        sideBranch.style.display = 'none'; // Completely hide to prevent spacing gaps
      }
      
      // Swap stats with aggregate Branch metrics
      document.getElementById('quick-stat-contracts').textContent = '48';
      document.getElementById('quick-stat-premiums').textContent = '4,200,000';
      document.getElementById('quick-stat-recruits').textContent = '8';
      
      if (welcomeHeader) {
        welcomeHeader.textContent = '지점 실적 현황';
      }
    } else {
      // FP Mode: hide admin views
      if (adminBtn) {
        adminBtn.style.display = 'none';
        adminBtn.classList.remove('active');
      }
      if (sideAdminTab) {
        sideAdminTab.style.display = 'none';
        sideAdminTab.classList.remove('active');
      }
      
      // If currently on admin panel, route back to calendar view
      const panelAdmin = document.getElementById('panel-admin-view');
      const panelCalendar = document.getElementById('panel-calendar-view');
      const btnCalendar = document.getElementById('btn-view-calendar');
      
      if (panelAdmin && panelCalendar && btnCalendar) {
        panelAdmin.classList.remove('active');
        btnCalendar.classList.add('active');
        panelCalendar.classList.add('active');
      }
      
      // Update profile info
      if (userBranchEl) {
        userBranchEl.textContent = branch;
        userBranchEl.style.display = 'inline-block'; // Restore display state for FP mode
      }
      if (userNameEl) userNameEl.textContent = `${name} FP`;
      
      if (sideName) sideName.textContent = `${name} FP`;
      if (sideBranch) {
        sideBranch.textContent = branch;
        sideBranch.style.display = 'block'; // Restore display state for FP mode
      }
      
      // Revert stats back to individual metrics
      document.getElementById('quick-stat-contracts').textContent = '3';
      document.getElementById('quick-stat-premiums').textContent = '180,000';
      document.getElementById('quick-stat-recruits').textContent = '1';
      
      if (welcomeHeader) {
        welcomeHeader.innerHTML = `오늘도 파이팅입니다! <span class="highlight-text" id="welcome-agent-name">${name} FP</span>님`;
      }
    }
    
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Dynamic Bottom Sheet Simulator Engine ---

  // Slide up bottom sheet overlay
  function openBottomSheet(incentiveId) {
    const inc = window.INCENTIVE_DATABASE.incentives.find(i => i.id === incentiveId);
    if (!inc) return;

    window.currentActiveIncentiveId = incentiveId;
    window.temporarySimulationValue = inc.currentValue;

    // Fill metadata headers
    document.getElementById('detail-incentive-title').textContent = inc.title;
    document.getElementById('detail-incentive-desc').textContent = inc.description;

    const categoryBadge = document.getElementById('detail-category-badge');
    categoryBadge.className = `cat-badge cat-${inc.category}`;
    categoryBadge.textContent = inc.title;

    document.getElementById('detail-date-duration').textContent = `${formatDateShort(inc.startDate)} ~ ${formatDateShort(inc.endDate)}`;



    // Render interactive simulation slider layout
    renderDynamicCategoryLayout(inc);

    // Show slide sheet container overlay
    if (bottomSheetOverlay) {
      bottomSheetOverlay.classList.add('active');
    }
  }

  // Slide down bottom sheet overlay
  function closeBottomSheet() {
    if (bottomSheetOverlay) {
      bottomSheetOverlay.classList.remove('active');
    }
  }

  // Format Date strings beautifully for metadata tags
  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
  }

  // Inject interactive range slider simulator matching specific category structures
  function renderDynamicCategoryLayout(inc) {
    const container = document.getElementById('dynamic-category-layout');
    if (!container) return;

    // Determine layout type based on milestones presence
    const hasMilestones = inc.milestones && inc.milestones.length > 0;
    const profile = window.INCENTIVE_DATABASE.agentProfile;

    if (!hasMilestones) {
      // --- Case A: Simple Track Simulator (Contracts & Premiums) ---
      let min = 0;
      let max = 10;
      let step = 1;
      
      if (inc.metricType === 'premiums') {
        max = Math.max(600000, inc.targetValue * 1.5);
        step = 10000;
      } else if (inc.metricType === 'goods') {
        max = 2;
        step = 1;
      } else {
        max = Math.max(10, inc.targetValue * 2);
        step = 1;
      }

      container.innerHTML = `
        <div class="simulator-wrapper">
          <div class="simulator-header">
            <span class="simulator-tag"><i data-lucide="sliders"></i> 시상 달성 시뮬레이터</span>
            <div id="bottom-sheet-achieved-badge"></div>
          </div>

          <!-- 설계사 개별 실적 연동 인포 바 -->
          <div style="background: rgba(243, 115, 33, 0.03); border: 1px solid rgba(243, 115, 33, 0.1); padding: 8px 14px; border-radius: 8px; font-size: 0.775rem; color: var(--text-secondary); margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; font-family: var(--font-sans) !important;">
            <span><i data-lucide="user" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; color: var(--primary); margin-right: 4px;"></i> 현재 연동 FP: <b style="color: var(--text-primary);">${profile.name}</b></span>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">Excel 첨부 시 실시간 매핑</span>
          </div>
          
          <div class="simulation-metric-display">
            <div class="metric-block">
              <span class="metric-label">현재 실적</span>
              <span class="metric-value color-primary" id="sim-current-val-display">0</span>
            </div>
            <div class="metric-arrow"><i data-lucide="chevrons-right"></i></div>
            <div class="metric-block">
              <span class="metric-label">목표 기준</span>
              <span class="metric-value" id="sim-target-val-display">${inc.metricType === 'premiums' ? inc.targetValue.toLocaleString() + '원' : inc.targetValue + inc.metricUnit}</span>
            </div>
          </div>

          <!-- Premium Interactive Number Input Panel (Replaces Slider) -->
          <div class="simulator-input-container" style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 24px 0 12px 0; font-family: var(--font-sans) !important;">
            <button class="btn-sim-adjust" id="btn-sim-decrease" style="width: 44px; height: 44px; border-radius: 12px; border: 2px solid rgba(243, 115, 33, 0.2); background: #FFFFFF; color: var(--primary); font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(243, 115, 33, 0.04); cursor: pointer;" title="감소">-</button>
            <div class="sim-input-box-wrapper" style="position: relative; display: flex; align-items: center;">
              <input type="number" class="simulator-num-input" id="bottom-sheet-input" min="0" step="${step}" value="${inc.currentValue}" style="width: 190px; height: 46px; text-align: center; font-size: 1.35rem; font-weight: 900; color: var(--primary); background: #FFFFFF; border: 2.5px solid var(--primary); border-radius: 14px; padding: 0 35px 0 15px; box-shadow: 0 4px 12px rgba(243, 115, 33, 0.06); transition: all 0.2s ease;">
              <span class="sim-input-unit" style="position: absolute; right: 15px; font-size: 0.95rem; font-weight: 800; color: var(--text-secondary); pointer-events: none;">${inc.metricUnit}</span>
            </div>
            <button class="btn-sim-adjust" id="btn-sim-increase" style="width: 44px; height: 44px; border-radius: 12px; border: 2px solid rgba(243, 115, 33, 0.2); background: #FFFFFF; color: var(--primary); font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(243, 115, 33, 0.04); cursor: pointer;" title="증가">+</button>
          </div>

          <!-- Visual Progress Gauge Bar -->
          <div class="sim-progress-bar-container" style="width: 100%; height: 8px; background: rgba(0, 0, 0, 0.05); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 8px; position: relative;">
            <div class="sim-progress-bar-fill" id="bottom-sheet-progress-bar-fill" style="height: 100%; background: linear-gradient(to right, var(--primary), var(--secondary)); border-radius: var(--radius-full); width: 0%; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);"></div>
          </div>
          
          <div class="slider-progress-percentage" id="bottom-sheet-slider-percentage" style="margin-bottom: 20px;">
            시뮬레이션 달성률: 0%
          </div>
          
          <div class="reward-highlight-box">
            <div class="reward-icon-circle"><i data-lucide="gift"></i></div>
            <div class="reward-info-text">
              <span class="reward-label" id="bottom-sheet-reward-label">달성 시 획득 시상안</span>
              <h4 class="reward-title" id="bottom-sheet-reward-text" style="transition: color 0.3s; font-weight: 800;">${inc.reward}</h4>
            </div>
          </div>
        </div>
      `;

      // Cache Interactive Controls
      const simInput = document.getElementById('bottom-sheet-input');
      const progressBarFill = document.getElementById('bottom-sheet-progress-bar-fill');
      const btnDecrease = document.getElementById('btn-sim-decrease');
      const btnIncrease = document.getElementById('btn-sim-increase');
      const currentValDisplay = document.getElementById('sim-current-val-display');
      const percentageDisplay = document.getElementById('bottom-sheet-slider-percentage');
      const badgeContainer = document.getElementById('bottom-sheet-achieved-badge');
      const rewardBox = document.querySelector('.reward-highlight-box');
      const rewardTextEl = document.getElementById('bottom-sheet-reward-text');
      const rewardLabelEl = document.getElementById('bottom-sheet-reward-label');

      const updateSimulation = (simVal) => {
        simVal = Number(simVal);
        window.temporarySimulationValue = simVal;
        let displayVal = simVal;
        
        if (inc.metricType === 'premiums') {
          displayVal = simVal.toLocaleString() + '원';
        } else if (inc.metricType === 'goods') {
          displayVal = simVal === 0 ? '미가동' : simVal === 1 ? '모바일 가동완료' : '초과 달성';
        } else {
          displayVal = simVal + inc.metricUnit;
        }
        currentValDisplay.textContent = displayVal;
        
        // Sync input field value
        simInput.value = simVal;

        // Calculate progress percentage
        const percentage = Math.min(100, Math.round((simVal / inc.targetValue) * 100));
        percentageDisplay.innerHTML = `시뮬레이션 달성률: <b class="color-primary">${percentage}%</b>`;
        
        // Progress track fill calculation
        progressBarFill.style.width = `${percentage}%`;
        
        // Dynamic Reward Payout Calculation
        let currentReward = inc.reward;
        
        // If the reward is '시상 0원' or contains '300%' or '비례' or is a percentage payout
        if (inc.title.includes('리치 프로모션') || inc.description.includes('300%')) {
          const calculatedAmt = simVal * 3; // 300% payout
          currentReward = `시상금 ${calculatedAmt.toLocaleString()}원 (300% 지급)`;
        } else if (inc.reward.includes('0원') || inc.reward === '0' || !inc.reward) {
          if (inc.metricType === 'premiums') {
            currentReward = `시상금 ${(simVal * 1.5).toLocaleString()}원 (초회보험료 150% 지급)`;
          } else {
            currentReward = `시상금 200,000원 지급`;
          }
        } else if (inc.reward.includes('보너스 제공') || inc.reward.includes('시상금 지급')) {
          const baseAmt = inc.targetValue * 1.5;
          currentReward = `시상금 ${baseAmt.toLocaleString()}원 지급`;
        }

        // Toggle Active Badges & rewards dynamic display
        const isAchieved = simVal >= inc.targetValue;
        if (isAchieved) {
          badgeContainer.innerHTML = `<span class="achievement-badge achieved"><i data-lucide="check"></i> 달성완료</span>`;
          rewardBox.classList.add('achieved-highlight');
          if (rewardTextEl) {
            rewardTextEl.style.color = 'var(--accent-success)';
            rewardTextEl.innerHTML = `<i data-lucide="award" class="icon-sm inline-icon" style="color:var(--accent-success); margin-right: 4px; vertical-align: middle;"></i> 달성 보상: ${currentReward}`;
          }
          if (rewardLabelEl) rewardLabelEl.textContent = "시상 획득 완료! 🎉";
        } else {
          badgeContainer.innerHTML = `<span class="achievement-badge pending">미달성</span>`;
          rewardBox.classList.remove('achieved-highlight');
          if (rewardTextEl) {
            rewardTextEl.style.color = 'var(--text-secondary)';
            rewardTextEl.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; margin-right: 4px;">[달성 시]</span>${currentReward}`;
          }
          if (rewardLabelEl) rewardLabelEl.textContent = "달성 시 획득 시상안";
        }
        if (window.lucide) window.lucide.createIcons();
      };

      // Direct Typed Input Handler
      simInput.addEventListener('input', (e) => {
        let val = Number(e.target.value);
        if (val < 0) val = 0;
        updateSimulation(val);
      });

      // Step Buttons Handler
      const stepVal = inc.metricType === 'premiums' ? 50000 : (inc.metricType === 'two_tier' && inc.metricUnit === '만 포인트' ? 1000 : 1);
      btnDecrease.addEventListener('click', () => {
        let val = Number(simInput.value) - stepVal;
        if (val < 0) val = 0;
        updateSimulation(val);
      });
      btnIncrease.addEventListener('click', () => {
        let val = Number(simInput.value) + stepVal;
        updateSimulation(val);
      });

      // Trigger initial layout draw
      updateSimulation(inc.currentValue);
    } else {
      // --- Case B: Segmented Milestone Track (milestones exists, e.g. 2W, 도입, 3·6·9 전략상품 등) ---
      const milestones = inc.milestones || [];
      const maxVal = milestones[milestones.length - 1].value;
      
      // Define Slider Bounds
      let min = 0;
      let max = maxVal;
      let step = 1;
      
      if (inc.metricType === 'premiums') {
        max = Math.max(1200000, maxVal * 1.1);
        step = 10000;
      } else if (inc.metricType === 'two_tier' && inc.metricUnit === '만 포인트') {
        max = Math.max(35000, maxVal * 1.1);
        step = 500;
      } else if (inc.metricType === 'two_tier') {
        max = Math.max(5, maxVal + 1);
        step = 1;
      } else {
        max = Math.max(10, maxVal + 1);
        step = 1;
      }

      // Generate Segmented Nodes HTML
      let nodesHtml = '';
      milestones.forEach((milestone) => {
        const pct = (milestone.value / max) * 100;
        nodesHtml += `
          <div class="milestone-node" style="left: ${pct}%" data-value="${milestone.value}">
            <div class="node-dot"></div>
            <div class="node-label">
              <span class="node-name">${milestone.name.split(' (')[0]}</span>
              <span class="node-val">${milestone.value.toLocaleString()}${inc.metricUnit === '만 포인트' ? '만pt' : inc.metricUnit}</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = `
        <div class="milestones-simulator-wrapper">
          <div class="simulator-header">
            <span class="simulator-tag"><i data-lucide="sliders"></i> 시상 달성 시뮬레이터</span>
            <div id="milestone-current-tier-badge"></div>
          </div>
          
          <!-- 설계사 개별 실적 연동 인포 바 -->
          <div style="background: rgba(243, 115, 33, 0.03); border: 1px solid rgba(243, 115, 33, 0.1); padding: 8px 14px; border-radius: 8px; font-size: 0.775rem; color: var(--text-secondary); margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; font-family: var(--font-sans) !important;">
            <span><i data-lucide="user" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; color: var(--primary); margin-right: 4px;"></i> 현재 연동 FP: <b style="color: var(--text-primary);">${profile.name}</b></span>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">Excel 첨부 시 실시간 매핑</span>
          </div>

          <!-- Horizontal Track Progress Bar -->
          <div class="milestone-track-container">
            <div class="milestone-track-bg">
              <div class="milestone-track-fill" id="milestone-progress-fill"></div>
            </div>
            <div class="milestone-nodes-row">
              ${nodesHtml}
            </div>
          </div>
          
          <div class="simulation-metric-display">
            <div class="metric-block">
              <span class="metric-label">현재 실적</span>
              <span class="metric-value color-primary" id="milestone-sim-current-val-display">0</span>
            </div>
            <div class="metric-arrow"><i data-lucide="chevrons-right"></i></div>
            <div class="metric-block">
              <span class="metric-label">다음 목표</span>
              <span class="metric-value" id="milestone-sim-next-val-display">-</span>
            </div>
          </div>

          <!-- Premium Interactive Number Input Panel (Replaces Slider) -->
          <div class="simulator-input-container" style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 24px 0 12px 0; font-family: var(--font-sans) !important;">
            <button class="btn-sim-adjust" id="btn-sim-milestone-decrease" style="width: 44px; height: 44px; border-radius: 12px; border: 2px solid rgba(243, 115, 33, 0.2); background: #FFFFFF; color: var(--primary); font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(243, 115, 33, 0.04); cursor: pointer;" title="감소">-</button>
            <div class="sim-input-box-wrapper" style="position: relative; display: flex; align-items: center;">
              <input type="number" class="simulator-num-input" id="bottom-sheet-milestone-input" min="0" step="${step}" value="${inc.currentValue}" style="width: 190px; height: 46px; text-align: center; font-size: 1.35rem; font-weight: 900; color: var(--primary); background: #FFFFFF; border: 2.5px solid var(--primary); border-radius: 14px; padding: 0 35px 0 15px; box-shadow: 0 4px 12px rgba(243, 115, 33, 0.06); transition: all 0.2s ease;">
              <span class="sim-input-unit" style="position: absolute; right: 15px; font-size: 0.95rem; font-weight: 800; color: var(--text-secondary); pointer-events: none;">${inc.metricUnit === '만 포인트' ? '만pt' : inc.metricUnit}</span>
            </div>
            <button class="btn-sim-adjust" id="btn-sim-milestone-increase" style="width: 44px; height: 44px; border-radius: 12px; border: 2px solid rgba(243, 115, 33, 0.2); background: #FFFFFF; color: var(--primary); font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(243, 115, 33, 0.04); cursor: pointer;" title="증가">+</button>
          </div>
          
          <div class="milestone-gap-announcement" id="milestone-gap-text" style="margin-bottom: 20px;">
            다음 단계까지 0 남았습니다.
          </div>

          <div class="reward-highlight-box" id="milestone-reward-box">
            <div class="reward-icon-circle"><i data-lucide="gift"></i></div>
            <div class="reward-info-text">
              <span class="reward-label" id="milestone-reward-label">현재 달성 혜택</span>
              <h4 class="reward-title" id="milestone-reward-title" style="transition: color 0.3s; font-weight: 800;">없음</h4>
            </div>
          </div>
        </div>
      `;

      // Cache Interactive Controls
      const simInput = document.getElementById('bottom-sheet-milestone-input');
      const btnDecrease = document.getElementById('btn-sim-milestone-decrease');
      const btnIncrease = document.getElementById('btn-sim-milestone-increase');
      const currentValDisplay = document.getElementById('milestone-sim-current-val-display');
      const nextValDisplay = document.getElementById('milestone-sim-next-val-display');
      const progressFill = document.getElementById('milestone-progress-fill');
      const gapText = document.getElementById('milestone-gap-text');
      const rewardTitle = document.getElementById('milestone-reward-title');
      const rewardLabel = document.getElementById('milestone-reward-label');
      const tierBadge = document.getElementById('milestone-current-tier-badge');
      const rewardBox = document.getElementById('milestone-reward-box');

      const updateMilestones = (simVal) => {
        simVal = Number(simVal);
        window.temporarySimulationValue = simVal;
        const unitLabel = inc.metricUnit === '만 포인트' ? '만pt' : inc.metricUnit;
        
        let displayVal = simVal;
        if (inc.metricType === 'premiums') {
          displayVal = simVal.toLocaleString() + '원';
        } else {
          displayVal = simVal.toLocaleString() + unitLabel;
        }
        currentValDisplay.textContent = displayVal;
        
        // Sync input field value
        simInput.value = simVal;

        // Progress track calculation
        const trackPct = Math.min(100, (simVal / max) * 100);
        progressFill.style.width = `${trackPct}%`;
        
        // Toggle Node Active States
        const nodes = container.querySelectorAll('.milestone-node');
        nodes.forEach(node => {
          const nodeVal = Number(node.getAttribute('data-value'));
          if (simVal >= nodeVal) {
            node.classList.add('active');
          } else {
            node.classList.remove('active');
          }
        });
        
        // Scan active and subsequent milestones
        let activeMilestone = null;
        let nextMilestone = null;
        
        for (let i = 0; i < milestones.length; i++) {
          if (simVal >= milestones[i].value) {
            activeMilestone = milestones[i];
          } else {
            nextMilestone = milestones[i];
            break;
          }
        }
        
        // Render Active Status & Tier Awards
        if (activeMilestone) {
          tierBadge.innerHTML = `<span class="achievement-badge achieved"><i data-lucide="award"></i> ${activeMilestone.name.split(' (')[0]}</span>`;
          rewardBox.classList.add('achieved-highlight');
          rewardLabel.textContent = `현재 달성 혜택 (${activeMilestone.name})`;
          rewardTitle.style.color = 'var(--accent-success)';
          rewardTitle.innerHTML = `<i data-lucide="check" class="icon-sm inline-icon" style="color:var(--accent-success); margin-right: 4px;"></i> ${activeMilestone.reward}`;
        } else {
          tierBadge.innerHTML = `<span class="achievement-badge pending">미달성</span>`;
          rewardBox.classList.remove('achieved-highlight');
          rewardLabel.textContent = "현재 달성 혜택";
          rewardTitle.style.color = 'var(--text-secondary)';
          rewardTitle.textContent = "없음 (목표 달성 시 시상 혜택 잠금해제)";
        }
        
        // Render next milestone gap message
        if (nextMilestone) {
          const gap = nextMilestone.value - simVal;
          let gapDisplay = gap;
          let nextDisplay = nextMilestone.value;
          
          if (inc.metricType === 'premiums') {
            gapDisplay = gap.toLocaleString() + '원';
            nextDisplay = nextMilestone.value.toLocaleString() + '원';
          } else {
            gapDisplay = gap.toLocaleString() + unitLabel;
            nextDisplay = nextMilestone.value.toLocaleString() + unitLabel;
          }
          
          nextValDisplay.textContent = nextDisplay;
          gapText.innerHTML = `다음 단계 <b>[${nextMilestone.name}]</b>까지 <b>${gapDisplay}</b> 남았습니다!`;
        } else {
          nextValDisplay.textContent = "최고 등급";
          gapText.innerHTML = `<b class="color-success">축하합니다! 최고 등급 시상 혜택(초과 달성)을 잠금 해제하셨습니다!</b>`;
        }
        
        if (window.lucide) window.lucide.createIcons();
      };

      // Direct Typed Input Handler
      simInput.addEventListener('input', (e) => {
        let val = Number(e.target.value);
        if (val < 0) val = 0;
        updateMilestones(val);
      });

      // Step Buttons Handler
      const stepVal = inc.metricType === 'premiums' ? 50000 : (inc.metricType === 'two_tier' && inc.metricUnit === '만 포인트' ? 1000 : 1);
      btnDecrease.addEventListener('click', () => {
        let val = Number(simInput.value) - stepVal;
        if (val < 0) val = 0;
        updateMilestones(val);
      });
      btnIncrease.addEventListener('click', () => {
        let val = Number(simInput.value) + stepVal;
        updateMilestones(val);
      });

      // Trigger initial layout draw
      updateMilestones(inc.currentValue);
    }
    
    if (window.lucide) window.lucide.createIcons();
  }

    // Bind Save Simulation Button click event
    const btnSaveSim = document.getElementById('btn-save-simulation');
    if (btnSaveSim) {
      btnSaveSim.addEventListener('click', () => {
        if (!window.currentActiveIncentiveId) return;
        const activeInc = window.INCENTIVE_DATABASE.incentives.find(i => i.id === window.currentActiveIncentiveId);
        if (activeInc) {
          activeInc.currentValue = window.temporarySimulationValue;
          
          const profile = window.INCENTIVE_DATABASE.agentProfile;
          if (activeInc.metricType === 'premiums') {
            profile.currentStats.premiums = window.temporarySimulationValue;
          } else if (activeInc.metricType === 'contracts') {
            profile.currentStats.contracts = window.temporarySimulationValue;
          } else if (activeInc.metricType === 'recruit_tier') {
            profile.currentStats.recruits = window.temporarySimulationValue;
          } else if (activeInc.metricType === 'two_tier') {
            profile.currentStats.two连续 = window.temporarySimulationValue;
          } else if (activeInc.id === 'inc-004') {
            profile.currentStats.two连续 = window.temporarySimulationValue;
          } else if (activeInc.id === 'inc-005') {
            profile.currentStats.points = window.temporarySimulationValue;
          }
          
          updateUserRoleView();
          if (typeof window.refreshApp === 'function') {
            window.refreshApp();
          }
          
          closeBottomSheet();
          alert(`"${activeInc.title}" 시뮬레이션 조정 실적이 실제 실적으로 반영되어 대시보드와 진척도가 성공적으로 업데이트되었습니다!`);
        }
      });
    }

  // --- Initial Page Bootstrapping ---
  function initApp() {
    renderCalendar();
    renderWeeklyIssues();
    renderSummaryList();
    updateUserRoleView();
    renderSelectedDateEvents(selectedDate);
  }

  // Assign app refresh delegate to global context
  window.refreshApp = () => {
    renderCalendar();
    renderSummaryList();
    renderSelectedDateEvents(selectedDate);
    
    // 지점장용 시상안 편집 삭제 관리보드가 로딩되어 있다면 함께 갱신
    if (typeof window.renderActiveIncentivesManager === 'function') {
      window.renderActiveIncentivesManager();
    }
  };

  window.setCalendarDate = (year, month) => {
    currentYear = year;
    currentMonth = month;
    selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    renderCalendar();
    renderSummaryList();
    renderSelectedDateEvents(selectedDate);
  };

  // Run Startup sequence
  initApp();
});

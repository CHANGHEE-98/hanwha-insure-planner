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

function syncIncentiveValuesWithExcel() {
  if (!window.INCENTIVE_DATABASE || !window.INCENTIVE_DATABASE.agentProfile) return;
  const profile = window.INCENTIVE_DATABASE.agentProfile;
  const name = profile.name ? profile.name.trim() : "";
  const branch = profile.branch ? profile.branch.trim() : "";
  const code = profile.code ? profile.code.trim() : "";
  const isBM = profile.role === 'bm';
  
  window.INCENTIVE_DATABASE.incentives.forEach(inc => {
    if (inc.excelData && inc.excelData.length > 0) {
      const searchName = isBM ? branch : name;
      const match = inc.excelData.find(row => {
        const rowCode = row.code ? String(row.code).trim() : "";
        const rowName = row.name ? String(row.name).trim() : "";
        
        // Priority 1: Match by Code
        if (code !== "" && rowCode !== "") {
          return rowCode === code;
        }
        // Priority 2: Match by Name or Branch
        return rowName === searchName || 
               rowName === name || 
               rowName === branch || 
               searchName.includes(rowName) || 
               rowName.includes(searchName);
      });
      if (match) {
        inc.currentValue = match.value;
      } else {
        inc.currentValue = 0;
      }
    }
  });
}

function getAchievementStatus(val, inc) {
  const numVal = parseFloat(val);
  if (inc.milestones && inc.milestones.length > 0) {
    const sortedMilestones = [...inc.milestones].sort((a, b) => b.value - a.value);
    const achievedMilestone = sortedMilestones.find(m => {
      const numM = parseFloat(m.value);
      if (!isNaN(numVal) && !isNaN(numM)) {
        return numVal >= numM;
      }
      return String(val).trim() === String(m.value).trim();
    });
    if (achievedMilestone) {
      return { achieved: true, text: `${achievedMilestone.name.split(' (')[0]}` };
    }
    return { achieved: false, text: '미달성' };
  }
  
  const numTarget = parseFloat(inc.targetValue);
  if (!isNaN(numVal) && !isNaN(numTarget)) {
    if (numVal >= numTarget) {
      return { achieved: true, text: '달성완료' };
    }
    return { achieved: false, text: '미달성' };
  }
  
  const isMatch = String(val).trim() === String(inc.targetValue).trim();
  return { achieved: isMatch, text: isMatch ? '달성완료' : '미달성' };
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize State from IndexedDB (Async)
  if (!window.INCENTIVE_DATABASE) {
    console.error("Incentive Database mock not found!");
    return;
  }

  let storedIncentives = null;
  try {
    storedIncentives = await window.dbGet('hanwha_incentives');
  } catch (e) {
    console.error("Failed to load stored incentives from IndexedDB", e);
  }

  if (storedIncentives && Array.isArray(storedIncentives) && storedIncentives.length > 0) {
    window.INCENTIVE_DATABASE.incentives = storedIncentives;
  } else {
    // Keep the default mock incentives from data.js and save them to IndexedDB
    try {
      await window.dbSet('hanwha_incentives', window.INCENTIVE_DATABASE.incentives);
    } catch (err) {}
  }

  let storedProfile = null;
  try {
    storedProfile = await window.dbGet('hanwha_agent_profile');
  } catch (e) {
    console.error("Failed to load stored profile from IndexedDB", e);
  }

  if (storedProfile) {
    window.INCENTIVE_DATABASE.agentProfile = storedProfile;
  } else {
    // Initialize stats to empty values for first-time visit
    const profile = window.INCENTIVE_DATABASE.agentProfile;
    profile.currentStats = {
      contracts: 0,
      premiums: 0,
      converted: 0,
      converted40k: "-",
      retention: "-",
      goods: 0,
      two连续: 0,
      points: 0,
      recruits: 0
    };
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
      renderSummaryList();
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
      renderSummaryList();
    });
  }

  // Summary List Panel Monthly Navigation
  const btnPrevSummaryMonth = document.getElementById('btn-prev-summary-month');
  const btnNextSummaryMonth = document.getElementById('btn-next-summary-month');
  
  if (btnPrevSummaryMonth) {
    btnPrevSummaryMonth.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
      renderSummaryList();
    });
  }

  if (btnNextSummaryMonth) {
    btnNextSummaryMonth.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
      renderSummaryList();
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
    btnLoginSubmit.addEventListener('click', async () => {
      const usernameInput = document.getElementById('login-username'); // Code input field
      const passwordInput = document.getElementById('login-password'); // Password input field
      const isAdminCheckbox = document.getElementById('login-is-admin');
      
      const profile = window.INCENTIVE_DATABASE.agentProfile;
      
      // Registered users database mapping codes to credentials and roles
      const registeredUsers = {
        "112233": { role: "fp", name: "김철수", password: "112233", branch: "팔용지점" },
        "8094780": { role: "bm", name: "이창희", password: "8094780", branch: "팔용지점" },
        "123123": { role: "fp", name: "이창희", password: "123123", branch: "팔용지점" },
        "123456": { role: "fp", name: "박재우", password: "123456", branch: "팔용지점" },
        "456789": { role: "fp", name: "류한호", password: "456789", branch: "팔용지점" },
        "789123": { role: "fp", name: "이형석", password: "789123", branch: "팔용지점" }
      };
      
      const enteredCode = usernameInput ? usernameInput.value.trim() : "";
      const enteredPassword = passwordInput ? passwordInput.value.trim() : ""; // 모바일 자동완성 등 공백오류 예방을 위한 trim 탑재
      
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
      profile.code = enteredCode;
      
      // Keep stored stats if role matches, otherwise clear/initialize
      let loadedProfile = null;
      try {
        loadedProfile = await window.dbGet('hanwha_agent_profile');
      } catch (e) {}

      if (loadedProfile && loadedProfile.role === role) {
        profile.currentStats = loadedProfile.currentStats;
      } else {
        profile.currentStats = {
          contracts: 0,
          premiums: 0,
          converted: 0,
          converted40k: "-",
          retention: "-",
          goods: 0,
          two连续: 0,
          points: 0,
          recruits: 0
        };
      }
      try {
        await window.dbSet('hanwha_agent_profile', profile);
      } catch (err) {
        console.error("IndexedDB profile sync failed", err);
      }
      
      // Sync all dynamic widgets, lists and header text displays
      syncIncentiveValuesWithExcel();
      updateUserRoleView();
      renderCalendar();
      renderSummaryList();
      renderSelectedDateEvents(selectedDate);
      
      // Hide login overlay with beautiful animation transition
      loginScreen.classList.add('fade-out');
      // 모바일 사파리/웨일 등의 터치 이벤트 프리즈 예방을 위해 물리적으로 display: none 강제 처리
      setTimeout(() => {
        loginScreen.style.display = 'none';
      }, 500);
    });
  }

  if (btnLogout && loginScreen) {
    btnLogout.addEventListener('click', () => {
      // Show login overlay back
      loginScreen.style.display = 'flex';
      setTimeout(() => {
        loginScreen.classList.remove('fade-out');
      }, 10);
      
      // Hide error box if visible
      const errorMsgBox = document.getElementById('login-error-msg');
      if (errorMsgBox) {
        errorMsgBox.style.display = "none";
      }
      
      // Reset input fields to defaults
      const usernameInput = document.getElementById('login-username');
      if (usernameInput) {
        usernameInput.value = "";
      }
      const passwordInput = document.getElementById('login-password');
      if (passwordInput) {
        passwordInput.value = "";
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

    // Pre-calculate slots for all 6 weeks
    const weeklySlots = [];
    for (let w = 0; w < 6; w++) {
      const weekIncentives = [];
      gridIncentives.forEach(inc => {
        const is2WWeeklyDeadline = (inc.category === 'two_annual' || inc.title.includes('2W')) 
          && (inc.title.includes('마감') || inc.title.includes('주차별'));
        if (is2WWeeklyDeadline) return;

        let isActiveInWeek = false;
        for (let d = 0; d < 7; d++) {
          const cellIndex = w * 7 + d;
          if (cellIndex >= daysArray.length) break;
          const dayObj = daysArray[cellIndex];
          const diffTime = Math.abs(new Date(inc.endDate) - new Date(inc.startDate));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isLongTerm = diffDays >= 30;

          const isActive = isLongTerm 
            ? (dayObj.dateStr === inc.endDate) 
            : (dayObj.dateStr >= inc.startDate && dayObj.dateStr <= inc.endDate);

          if (isActive) {
            isActiveInWeek = true;
          }
        }
        if (isActiveInWeek) {
          weekIncentives.push(inc);
        }
      });

      // Sort week incentives: starts earlier first, then longer first
      weekIncentives.sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return a.startDate.localeCompare(b.startDate);
        }
        const durA = new Date(a.endDate) - new Date(a.startDate);
        const durB = new Date(b.endDate) - new Date(b.startDate);
        return durB - durA;
      });

      const slots = [];
      weekIncentives.forEach(inc => {
        const activeDays = [];
        for (let d = 0; d < 7; d++) {
          const cellIndex = w * 7 + d;
          if (cellIndex >= daysArray.length) {
            activeDays.push(false);
            continue;
          }
          const dayObj = daysArray[cellIndex];
          const diffTime = Math.abs(new Date(inc.endDate) - new Date(inc.startDate));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isLongTerm = diffDays >= 30;

          const isActive = isLongTerm 
            ? (dayObj.dateStr === inc.endDate) 
            : (dayObj.dateStr >= inc.startDate && dayObj.dateStr <= inc.endDate);
          
          activeDays.push(isActive);
        }

        let assignedSlot = -1;
        for (let s = 0; s < slots.length; s++) {
          let overlap = false;
          for (let d = 0; d < 7; d++) {
            if (activeDays[d] && slots[s][d] !== null) {
              overlap = true;
              break;
            }
          }
          if (!overlap) {
            assignedSlot = s;
            break;
          }
        }

        if (assignedSlot === -1) {
          slots.push([null, null, null, null, null, null, null]);
          assignedSlot = slots.length - 1;
        }

        for (let d = 0; d < 7; d++) {
          if (activeDays[d]) {
            slots[assignedSlot][d] = inc;
          }
        }
      });

      weeklySlots.push(slots);
    }

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
      
      // 1. 하드코딩 백업 체크
      let deadlineColor = TWOW_DEADLINES[yVal]?.[mVal]?.[dVal];
      
      // 2. 등록된 2W 시상 데이터에서 마감일(종료일) 동적 검출 및 연계
      const active2WIncentiveOnThisEndDate = window.INCENTIVE_DATABASE.incentives.find(inc => {
        return (inc.category === 'two_annual' || inc.title.includes('2W')) 
          && (inc.title.includes('마감') || inc.title.includes('주차별'))
          && inc.endDate === dayObj.dateStr;
      });

      if (active2WIncentiveOnThisEndDate) {
        const title = active2WIncentiveOnThisEndDate.title;
        if (title.includes('1주')) deadlineColor = 'yellow';
        else if (title.includes('2주')) deadlineColor = 'green';
        else if (title.includes('3주')) deadlineColor = 'blue';
        else if (title.includes('4주') || title.includes('당월')) deadlineColor = 'orange';
        else deadlineColor = 'orange'; // 기본값
      }
      
      if (deadlineColor) {
        numSpan.classList.add(`deadline-${deadlineColor}`);
        let weekNum = 1;
        if (deadlineColor === 'green') weekNum = 2;
        else if (deadlineColor === 'blue') weekNum = 3;
        else if (deadlineColor === 'orange') weekNum = 4;
        numSpan.title = `2W 가동 ${weekNum}주차 마감일`;

        const badgeSpan = document.createElement('span');
        badgeSpan.className = `deadline-text-badge text-${deadlineColor}`;
        badgeSpan.textContent = '2w'; // '2w 마감'을 '2w'로 단순 단축하여 공간 침범을 원천 해결
        badgeSpan.title = `2w 가동 ${weekNum}주차 마감일`;
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

      const w = Math.floor(cellIndex / 7);
      const d = cellIndex % 7;
      const slots = weeklySlots[w] || [];

      for (let s = 0; s < slots.length; s++) {
        const inc = slots[s][d];
        if (inc !== null) {
          const isPrevActive = (d > 0 && slots[s][d - 1] === inc);
          const isNextActive = (d < 6 && slots[s][d + 1] === inc);

          const chip = document.createElement('div');
          let colorClass = inc.colorOverride ? `override-${inc.colorOverride}` : `cat-${inc.category}`;
          chip.className = `event-chip ${colorClass}`;
          chip.setAttribute('data-inc-id', inc.id);
          chip.title = inc.title;

          const isMobile = window.innerWidth <= 768;

          if (!isPrevActive) {
            let spanCount = 1;
            let checkD = d + 1;
            while (checkD < 7 && slots[s][checkD] === inc) {
              spanCount++;
              checkD++;
            }

            let continuesPrevWeek = cellIndex > 0 && 
                                    (cellIndex % 7 === 0) && 
                                    (daysArray[cellIndex - 1].dateStr >= inc.startDate && daysArray[cellIndex - 1].dateStr <= inc.endDate);
            let continuesNextWeek = false;
            if (d + spanCount === 7 && cellIndex + spanCount < 42) {
              const nextDayStr = daysArray[cellIndex + spanCount].dateStr;
              if (nextDayStr >= inc.startDate && nextDayStr <= inc.endDate) {
                continuesNextWeek = true;
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

          const diffTime = Math.abs(new Date(inc.endDate) - new Date(inc.startDate));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isLongTerm = diffDays >= 30;

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
          // 모바일(소프트 캡슐 배지 모드)에서는 플레이스홀더를 삽입하지 않아 날짜 바로 밑에 뱃지가 조밀하게 밀착 렌더링되게 보장
          if (window.innerWidth > 768) {
            const placeholder = document.createElement('div');
            placeholder.className = 'event-chip-placeholder';
            chipsContainer.appendChild(placeholder);
          }
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
      if (window.lucide) {
        window.lucide.createIcons({ root: heroDashboard });
      }
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
        
        const numCurrent = parseFloat(inc.currentValue);
        const numMax = parseFloat(maxMilestone);
        let percentage = 0;
        if (!isNaN(numCurrent) && !isNaN(numMax) && numMax > 0) {
          percentage = Math.min(100, Math.round((numCurrent / numMax) * 100));
        } else {
          percentage = (String(inc.currentValue).trim() === String(maxMilestone).trim() && String(maxMilestone).trim() !== '') ? 100 : 0;
        }

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

    // Event delegation on listWrapper
    listWrapper.onclick = (e) => {
      const row = e.target.closest('.selected-date-row');
      if (row) {
        const incId = row.getAttribute('data-inc-id');
        openBottomSheet(incId);
      }
    };

    if (window.lucide) {
      window.lucide.createIcons({ root: listWrapper });
    }
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

    if (window.lucide) {
      window.lucide.createIcons({ root: wrapper });
    }
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

  // Populate "주요 시상 요약 및 달성률" Panel in the Sidebar (linked with current calendar month)
  function renderSummaryList() {
    const wrapper = document.getElementById('summary-list-wrapper');
    if (!wrapper) return;

    // Update Title text with current month
    const titleEl = document.getElementById('summary-list-title');
    if (titleEl) {
      titleEl.textContent = `${currentMonth + 1}월 주요 시상 진척도`;
    }

    // Filter incentives by current calendar month range
    const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const incentives = window.INCENTIVE_DATABASE.incentives.filter(inc => {
      return inc.startDate <= monthEndStr && inc.endDate >= monthStartStr;
    });

    let html = '';
    
    if (incentives.length === 0) {
      html = `
        <div style="text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 0.825rem; font-family: var(--font-sans);">
          선택하신 월에 등록된 시상 일정이 없습니다.
        </div>
      `;
    } else {
      incentives.forEach(inc => {
        const maxMilestone = inc.milestones ? inc.milestones[inc.milestones.length - 1].value : inc.targetValue;
        
        const numCurrent = parseFloat(inc.currentValue);
        const numMax = parseFloat(maxMilestone);
        let percentage = 0;
        if (!isNaN(numCurrent) && !isNaN(numMax) && numMax > 0) {
          percentage = Math.min(100, Math.round((numCurrent / numMax) * 100));
        } else {
          percentage = (String(inc.currentValue).trim() === String(maxMilestone).trim() && String(maxMilestone).trim() !== '') ? 100 : 0;
        }
        
        let displayVal = '';
        if (inc.metricUnit === '직접입력') {
          displayVal = `${inc.currentValue} / ${maxMilestone}`;
        } else if (inc.metricType === 'premiums') {
          const numCurrParsed = parseFloat(inc.currentValue) || 0;
          const numMaxParsed = parseFloat(maxMilestone) || 0;
          displayVal = `${(numCurrParsed / 10000).toFixed(0)}만 / ${(numMaxParsed / 10000).toFixed(0)}만원`;
        } else {
          displayVal = `${inc.currentValue}${inc.metricUnit} / ${maxMilestone}${inc.metricUnit}`;
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
    }
    
    wrapper.innerHTML = html;
    
    // Event delegation on wrapper
    wrapper.onclick = (e) => {
      const card = e.target.closest('.summary-item-card');
      if (card) {
        const incId = card.getAttribute('data-inc-id');
        openBottomSheet(incId);
      }
    };
    
    if (window.lucide) {
      window.lucide.createIcons({ root: wrapper });
    }
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
    }
    
    if (window.lucide) {
      window.lucide.createIcons({ root: document.querySelector('.app-container') });
    }
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


    // Render incentive image if present (New Feature)
    const imgContainer = document.getElementById('detail-incentive-image-container');
    if (imgContainer) {
      if (inc.slideImage) {
        imgContainer.innerHTML = `<img src="${inc.slideImage}" style="width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; cursor: zoom-in; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border);">`;
        imgContainer.style.display = 'block';
        imgContainer.querySelector('img').addEventListener('click', () => {
          if (typeof window.openImageLightbox === 'function') {
            window.openImageLightbox(inc.slideImage);
          }
        });
      } else {
        imgContainer.style.display = 'none';
        imgContainer.innerHTML = '';
      }
    }

    // Render interactive simulation slider layout
    renderDynamicCategoryLayout(inc);

    // Hide simulator save button actions container
    const saveBtnAction = document.querySelector('.simulator-actions');
    if (saveBtnAction) {
      saveBtnAction.style.display = 'none';
    }

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



  // Inject actual progress status layout matching xlsx data
  function renderDynamicCategoryLayout(inc) {
    const container = document.getElementById('dynamic-category-layout');
    if (!container) return;

    const profile = window.INCENTIVE_DATABASE.agentProfile;

    if (!inc.excelData || inc.excelData.length === 0) {
      container.innerHTML = `
        <div class="no-excel-data-wrapper" style="text-align: center; padding: 32px 16px; font-family: var(--font-sans) !important;">
          <div style="background: rgba(243, 115, 33, 0.05); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--primary);">
            <i data-lucide="file-spreadsheet" style="width: 28px; height: 28px;"></i>
          </div>
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">실적 연동 데이터 없음</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0;">
            지점장 계정으로 로그인 후 <b>[시상안 업로드]</b> 탭에서<br>
            해당 시책의 <b>'실적연동' (Excel 업로드)</b> 버튼을 클릭하여 파일 매핑을 진행해 주세요.
          </p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Render Excel rank list
    const sortedData = [...inc.excelData].sort((a, b) => {
      const valA = parseFloat(a.value);
      const valB = parseFloat(b.value);
      if (!isNaN(valA) && !isNaN(valB)) {
        return valB - valA;
      }
      return String(b.value).localeCompare(String(a.value));
    });

    const searchName = profile.role === 'bm' ? (profile.branch ? profile.branch.trim() : "") : (profile.name ? profile.name.trim() : "");

    let tableRowsHtml = '';
    sortedData.forEach((row, idx) => {
      const rowCode = row.code ? String(row.code).trim() : "";
      const rowName = row.name ? String(row.name).trim() : "";
      
      const isMe = (profile.code && rowCode !== "" && rowCode === profile.code.trim()) || 
                   (profile.name && rowName !== "" && rowName === profile.name.trim()) || 
                   (rowName !== "" && rowName === searchName) || 
                   (rowName !== "" && rowName === (profile.branch ? profile.branch.trim() : ""));
                   
      if (!isMe) return;

      const statusObj = getAchievementStatus(row.value, inc);
      
      let displayValue = row.value;
      const num = parseFloat(row.value);
      if (!isNaN(num)) {
        const flooredNum = Math.floor(num);
        if (inc.metricType === 'premiums') {
          displayValue = flooredNum.toLocaleString() + '원';
        } else {
          displayValue = flooredNum + (inc.metricUnit !== '직접입력' ? inc.metricUnit : '');
        }
      } else {
        displayValue = row.value + (inc.metricUnit !== '직접입력' ? inc.metricUnit : '');
      }

      // 로그인한 코드의 시상금만 보여주고, 달성 여부가 미달성인 시상금은 표시하지 않음 (본인이라도 미달성이면 표시 안 함)
      if (!statusObj.achieved) {
        displayValue = "";
      }

      const displayName = rowName !== "" 
        ? `${rowName} (${rowCode})` 
        : rowCode;

      tableRowsHtml += `
        <tr class="highlight-row" style="background: rgba(243, 115, 33, 0.08); border-left: 3px solid var(--primary);">
          <td style="padding: 10px; font-weight: 700;">${displayName} <span style="font-size:0.7rem; color:var(--primary); font-weight:700; margin-left:4px;">(나)</span></td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">${displayValue}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="achievement-status-board" style="font-family: var(--font-sans) !important;">
        <div class="ranking-table-title" style="font-size: 0.875rem; font-weight: 800; margin-bottom: 10px; color: var(--text-primary); display: flex; align-items: center; gap: 6px; padding: 0 4px;">
          <i data-lucide="award" style="width: 14px; height: 14px; color: #FFD600;"></i> 개인별 실적 현황
        </div>
        
        <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;">
                <th style="padding: 10px; font-weight: 700; color: var(--text-secondary); background: #F9FAFB;">대상자</th>
                <th style="padding: 10px; font-weight: 700; color: var(--text-secondary); text-align: right; background: #F9FAFB;">${inc.valHeaderName || '실적'}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }
  }


  // --- Initial Page Bootstrapping ---
  function initApp() {
    syncIncentiveValuesWithExcel();
    renderCalendar();
    renderWeeklyIssues();
    renderSummaryList();
    updateUserRoleView();
    renderSelectedDateEvents(selectedDate);
  }

  // Assign app refresh delegate to global context
  window.refreshApp = () => {
    syncIncentiveValuesWithExcel();
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

  // Image Lightbox global functions (New Feature)
  window.openImageLightbox = function(src) {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
      lightboxImg.src = src;
      lightbox.style.display = 'flex';
      setTimeout(() => {
        lightboxImg.style.transform = 'scale(1)';
      }, 10);
    }
  };

  const lightbox = document.getElementById('image-lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', () => {
      const lightboxImg = document.getElementById('lightbox-img');
      if (lightboxImg) lightboxImg.style.transform = 'scale(0.95)';
      setTimeout(() => {
        lightbox.style.display = 'none';
      }, 150);
    });
  }

  // Run Startup sequence
  initApp();
});

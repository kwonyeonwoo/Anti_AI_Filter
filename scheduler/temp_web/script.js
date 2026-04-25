const UI = {
    monthDisplay: document.getElementById('current-month-display'),
    calendarGrid: document.getElementById('calendar-grid'),
    totalHours: document.getElementById('total-hours'),
    totalDays: document.getElementById('total-days'),
    progressBar: document.getElementById('hours-progress'),
    excList: document.getElementById('exception-list'),
    defForm: document.getElementById('default-schedule-form'),
    btnPrev: document.getElementById('prev-month'),
    btnNext: document.getElementById('next-month'),
    btnSaveImage: document.getElementById('save-image-btn'),
    btnReset: document.getElementById('reset-btn'),
    
    // Modal Elements
    modalOverlay: document.getElementById('exception-modal'),
    modalDateTitle: document.getElementById('modal-date-title'),
    modalForm: document.getElementById('modal-exception-form'),
    modalDateHidden: document.getElementById('modal-exception-date'),
    modalRadios: document.getElementsByName('modal-exc-type'),
    modalHoursContainer: document.getElementById('modal-hours-input-wrapper'),
    modalHours: document.getElementById('modal-exception-hours'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalDeleteBtn: document.getElementById('modal-delete-btn'),
};

const MAX_MONTHLY_HOURS = 80;

let currentDate = new Date();

let state = {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(), 
    defaults: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }, // Sun-Sat
    exceptions: {} 
};

// Load state from localStorage if exists
const savedState = localStorage.getItem('work_scheduler_state');
if (savedState) {
    try {
        const parsed = JSON.parse(savedState);
        state.defaults = parsed.defaults || state.defaults;
        state.exceptions = parsed.exceptions || state.exceptions;
        
        // Populate DOM inputs for default schedule with loaded data
        window.addEventListener('DOMContentLoaded', () => {
            for (let i = 0; i <= 6; i++) {
                const inputEl = document.getElementById(`default-${i}`);
                if(inputEl) inputEl.value = state.defaults[i] || 0;
            }
        });
    } catch (e) {
        console.error('Failed to load state', e);
    }
}

function saveState() {
    localStorage.setItem('work_scheduler_state', JSON.stringify({
        defaults: state.defaults,
        exceptions: state.exceptions
    }));
}

// Modal UI Toggles
if (UI.modalRadios) {
    UI.modalRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'hours') {
                UI.modalHoursContainer.style.display = 'block';
                UI.modalHours.required = true;
            } else {
                UI.modalHoursContainer.style.display = 'none';
                UI.modalHours.required = false;
            }
        });
    });
}

UI.btnPrev.addEventListener('click', () => {
    state.month--;
    if (state.month < 0) { state.month = 11; state.year--; }
    render();
});

UI.btnNext.addEventListener('click', () => {
    state.month++;
    if (state.month > 11) { state.month = 0; state.year++; }
    render();
});

UI.defForm.addEventListener('submit', (e) => {
    e.preventDefault();
    for (let i = 0; i <= 6; i++) {
        const val = parseFloat(document.getElementById(`default-${i}`).value) || 0;
        state.defaults[i] = val;
    }
    render();
});

function removeException(dateStr) {
    delete state.exceptions[dateStr];
    render();
}

// --- Modal Logic ---
function openExceptionModal(dateStr) {
    UI.modalDateHidden.value = dateStr;
    const parts = dateStr.split('-');
    UI.modalDateTitle.textContent = `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일 설정`;
    
    // Check if exception already exists
    if (state.exceptions[dateStr]) {
        if (UI.modalDeleteBtn) UI.modalDeleteBtn.style.display = 'block';
        const exc = state.exceptions[dateStr];
        document.querySelector(`input[name="modal-exc-type"][value="${exc.type}"]`).checked = true;
        if (exc.type === 'hours') {
            UI.modalHoursContainer.style.display = 'block';
            UI.modalHours.required = true;
            UI.modalHours.value = exc.val;
        } else {
            UI.modalHoursContainer.style.display = 'none';
            UI.modalHours.required = false;
            UI.modalHours.value = '';
        }
    } else {
        if (UI.modalDeleteBtn) UI.modalDeleteBtn.style.display = 'none';
        document.querySelector('input[name="modal-exc-type"][value="off"]').checked = true;
        UI.modalHoursContainer.style.display = 'none';
        UI.modalHours.required = false;
        UI.modalHours.value = '';
    }
    
    UI.modalOverlay.style.display = 'flex';
    // 트랜지션 효과를 위해 약간의 지연 후 클래스 추가
    setTimeout(() => { UI.modalOverlay.classList.add('show'); }, 10);
}

function closeExceptionModal() {
    UI.modalOverlay.classList.remove('show');
    setTimeout(() => { UI.modalOverlay.style.display = 'none'; }, 200);
}

if (UI.modalCancelBtn) UI.modalCancelBtn.addEventListener('click', closeExceptionModal);

if (UI.modalDeleteBtn) {
    UI.modalDeleteBtn.addEventListener('click', () => {
        const dateStr = UI.modalDateHidden.value;
        if (state.exceptions[dateStr]) {
            removeException(dateStr); // 예외 데이터 삭제(초기화)
            closeExceptionModal();
        }
    });
}

if (UI.modalOverlay) {
    UI.modalOverlay.addEventListener('click', (e) => {
        // 배경을 클릭했을 때 모달 닫기
        if (e.target === UI.modalOverlay) closeExceptionModal();
    });
}

if (UI.modalForm) {
    UI.modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateStr = UI.modalDateHidden.value;
        const type = document.querySelector('input[name="modal-exc-type"]:checked').value;
        let val = 0;
        if (type === 'hours') {
            val = parseFloat(UI.modalHours.value) || 0;
        }
        
        state.exceptions[dateStr] = { type, val };
        render(); // 달력 및 요약을 다시 그림
        closeExceptionModal();
    });
}

function render() {
    saveState();
    renderHeader();
    const calculated = calculateMonth();
    renderSummary(calculated);
    renderCalendar(calculated);
    renderExceptionList();
}

function renderHeader() {
    UI.monthDisplay.textContent = `${state.year}년 ${state.month + 1}월`;
}

function calculateMonth() {
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    let totalHours = 0;
    let workDaysCount = 0;
    let result = {}; 
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(state.year, state.month, d);
        const mm = String(state.month + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${state.year}-${mm}-${dd}`;
        const dayOfWeek = dateObj.getDay();
        
        let dailyHours = 0;
        let isOff = false;
        let isForced = false;
        
        if (state.exceptions[dateStr]) {
            const exc = state.exceptions[dateStr];
            if (exc.type === 'off') {
                dailyHours = 0;
                isOff = true;
            } else if (exc.type === 'hours') {
                dailyHours = exc.val;
                isForced = true;
            }
        } else {
            dailyHours = state.defaults[dayOfWeek];
        }
        
        let isCapped = false;
        
        // Accumulate and cap logic
        if (totalHours < MAX_MONTHLY_HOURS && dailyHours > 0) {
            if (totalHours + dailyHours > MAX_MONTHLY_HOURS) {
                dailyHours = MAX_MONTHLY_HOURS - totalHours;
                isCapped = true;
            }
            totalHours += dailyHours;
            workDaysCount++;
        } else if (totalHours >= MAX_MONTHLY_HOURS) {
            if (!isOff && !isForced) {
                dailyHours = 0; // Out of hours
            } else if (isForced) {
                // If user forces hours but we are over 80, cap it aggressively so we never exceed
                if (totalHours + dailyHours > MAX_MONTHLY_HOURS) {
                     dailyHours = MAX_MONTHLY_HOURS - totalHours;
                     isCapped = true;
                }
                if (dailyHours > 0) {
                    totalHours += dailyHours;
                    workDaysCount++;
                } else {
                    // Cannot add any more hours
                    dailyHours = 0;
                    isCapped = true;
                }
            }
        }
        
        result[dateStr] = {
            hours: dailyHours,
            isOff: isOff,
            isForced: isForced,
            isCapped: isCapped,
            dateNum: d,
            isToday: dateStr === getTodayStr()
        };
    }
    
    return {
        daily: result,
        totalHours: totalHours,
        totalDays: workDaysCount
    };
}

function renderSummary(calc) {
    UI.totalHours.textContent = calc.totalHours;
    UI.totalDays.textContent = calc.totalDays;
    
    const pct = Math.min((calc.totalHours / MAX_MONTHLY_HOURS) * 100, 100);
    UI.progressBar.style.width = `${pct}%`;
    
    if (calc.totalHours >= MAX_MONTHLY_HOURS) {
        UI.progressBar.classList.add('over-limit');
    } else {
        UI.progressBar.classList.remove('over-limit');
    }
}

function renderCalendar(calc) {
    UI.calendarGrid.innerHTML = '';
    
    const firstDay = new Date(state.year, state.month, 1).getDay(); 
    
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-cell empty';
        UI.calendarGrid.appendChild(emptyCell);
    }
    
    for (const [dateStr, info] of Object.entries(calc.daily)) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        if (info.isToday) cell.classList.add('today');
        
        let labelHtml = '';
        if (info.isOff) {
            cell.classList.add('is-off');
            labelHtml = `<span class="hours-badge">휴무</span>`;
        } else if (info.hours > 0) {
            if (info.isForced && !info.isCapped) cell.classList.add('is-forced');
            if (info.isCapped) cell.classList.add('capped');
            
            labelHtml = `<span class="hours-badge">${info.hours} 시간</span>`;
        } else {
            cell.classList.add('zero-hours');
            // If it's a zero-hour day that got truncated because limit reached, optionally we could show something.
            // But 'zero-hours' with display:none does the job.
        }
        
        cell.innerHTML = `
            <div class="date-num">${info.dateNum}</div>
            ${labelHtml}
        `;
        
        // 날짜 클릭 이벤트 바인딩
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => openExceptionModal(dateStr));
        
        UI.calendarGrid.appendChild(cell);
    }
}

function renderExceptionList() {
    UI.excList.innerHTML = '';
    
    // Filter out exceptions of the current month being viewed
    const mm = String(state.month + 1).padStart(2, '0');
    const prefix = `${state.year}-${mm}-`;
    
    const excs = Object.entries(state.exceptions)
        .filter(([dateStr]) => dateStr.startsWith(prefix))
        .sort((a,b) => a[0].localeCompare(b[0]));
        
    if (excs.length === 0) {
        UI.excList.innerHTML = '<li class="exception-item" style="justify-content:center; color:#94a3b8; font-style:italic; background:transparent;">등록된 예외가 없습니다.</li>';
        return;
    }
    
    for (const [dateStr, info] of excs) {
        const li = document.createElement('li');
        li.className = `exception-item type-${info.type}`;
        
        // 날짜에서 요일 추출
        const dObj = new Date(dateStr);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = days[dObj.getDay()];
        const dayStr = `${parseInt(dateStr.split('-')[2], 10)}일 (${dayName})`;
        
        let typeBadge = '';
        if (info.type === 'off') {
            typeBadge = `<span class="badge badge-danger">휴무 처리</span>`;
        } else {
            typeBadge = `<span class="badge badge-accent">${info.val}시간 근무</span>`;
        }
        
        li.innerHTML = `
            <div class="exc-info">
                <strong class="exc-date">${dayStr}</strong>
                ${typeBadge}
            </div>
            <button class="delete-btn" onclick="removeException('${dateStr}')" title="이 일정 삭제">&times;</button>
        `;
        UI.excList.appendChild(li);
    }
}

function getTodayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

// Initial render
window.removeException = removeException;
render();

// Reset functionality
if (UI.btnReset) {
    UI.btnReset.addEventListener('click', () => {
        if (confirm("모든 설정(기본 근무 시간 및 휴무/예외 기록)이 완전히 지워집니다.\n정말 전체 초기화 하시겠습니까?")) {
            state.defaults = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
            state.exceptions = {};
            
            // Reset input values
            for (let i = 0; i <= 6; i++) {
                const inputEl = document.getElementById(`default-${i}`);
                if(inputEl) inputEl.value = 0;
            }
            
            saveState();
            render();
        }
    });
}

// Image Save functionality
if (UI.btnSaveImage) {
    UI.btnSaveImage.addEventListener('click', () => {
        const calendarEl = document.querySelector('.calendar-wrapper');
        const originalBg = calendarEl.style.background;
        
        // Temporarily hide buttons for clean screenshot
        UI.btnPrev.style.display = 'none';
        UI.btnNext.style.display = 'none';
        UI.btnSaveImage.style.display = 'none';
        
        // Force background color for capture due to glassmorphism
        calendarEl.style.background = 'rgba(30, 41, 59, 1)'; 
        
        html2canvas(calendarEl, {
            scale: 2, 
            backgroundColor: '#0d1117'
        }).then(canvas => {
            // Restore UI
            calendarEl.style.background = originalBg;
            UI.btnPrev.style.display = '';
            UI.btnNext.style.display = '';
            UI.btnSaveImage.style.display = '';
            
            // Trigger download
            const link = document.createElement('a');
            link.download = `스케줄러_${state.year}년_${state.month + 1}월.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error('Screenshot failed:', err);
            calendarEl.style.background = originalBg;
            UI.btnPrev.style.display = '';
            UI.btnNext.style.display = '';
            UI.btnSaveImage.style.display = '';
        });
    });
}

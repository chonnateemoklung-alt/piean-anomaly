const roomsData = {
    1: { name: "ทางเดิน", normal: "images/ทางเดิน.jpg", anomalies: ["images/ทางเดิน1.jpg", "images/ทางเดิน2.jpg", "images/ทางเดิน3.jpg"], hasAnomaly: false, currentAnomalyImg: "" },
    2: { name: "บันได", normal: "images/บันได.jpg", anomalies: ["images/บันได1.jpg", "images/บันได2.jpg", "images/บันได3.jpg"], hasAnomaly: false, currentAnomalyImg: "" },
    3: { name: "โรงอาหาร", normal: "images/โรงอาหาร.jpg", anomalies: ["images/โรงอาหาร1.jpg", "images/โรงอาหาร2.jpg", "images/โรงอาหาร3.jpg"], hasAnomaly: false, currentAnomalyImg: "" },
    4: { name: "ห้องคอม", normal: "images/ห้องคอม.jpg", anomalies: ["images/ห้องคอม1.jpg", "images/ห้องคอม2.jpg", "images/ห้องคอม3.jpg"], hasAnomaly: false, currentAnomalyImg: "" },
    5: { name: "ห้องน้ำ", normal: "images/ห้องน้ำ.jpg", anomalies: ["images/ห้องน้ำ1.jpg", "images/ห้องน้ำ2.jpg", "images/ห้องน้ำ3.jpg"], hasAnomaly: false, currentAnomalyImg: "" },
    6: { name: "ห้องประชุม", normal: "images/ห้องประชุม.jpg", anomalies: ["images/ห้องประชุม1.jpg", "images/ห้องประชุม2.jpg", "images/ห้องประชุม3.jpg"], hasAnomaly: false, currentAnomalyImg: "" }
};

let currentRoomId = 1;
let startCountdownSeconds = 30; // เวลานับถอยหลัง 30 วิแรกในเกม
let loadingSeconds = 5;         // เวลานับถอยหลังหน้าโหลด 5 วิ
let gameSeconds = 180;          // เวลาเล่นหลัก 3 นาที
let sanity = 100;               // ค่าสติเริ่มต้น 100%
let mistakes = 0;               // จำนวนครั้งที่รายงานผิด (ไม่เกิน 5)

let loadInterval = null;
let countdownInterval = null;
let gameInterval = null;
let anomalyInterval = null;
let sanityInterval = null;

let gameStarted = false;
let isChecking = false;

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function goToLevelSelect() {
    showScreen('level-screen');
}

function goToMainMenu() {
    stopAllIntervals();
    showScreen('start-screen');
}

// ฟังก์ชันเปิดหน้าจอเนื้อเรื่อง (ต้องมีอันนี้เพื่อให้ปุ่มกดทำงาน)
function goToStoryScreen(levelKey) {
    if (levelKey === 'school') {
        showScreen('story-screen');
    }
}

// ฟังก์ชันนับถอยหลังหน้าโหลด 5 วินาทีก่อนเข้าเกมจริง
function startLoadingScreen() {
    showScreen('loading-screen');
    loadingSeconds = 5;
    const loadTimerEl = document.getElementById("loading-timer");
    loadTimerEl.innerText = loadingSeconds;

    loadInterval = setInterval(() => {
        loadingSeconds--;
        loadTimerEl.innerText = loadingSeconds;

        if (loadingSeconds <= 0) {
            clearInterval(loadInterval);
            showScreen('game-screen');
            resetGame();
            startPreparationCountdown();
        }
    }, 1000);
}

function resetGame() {
    stopAllIntervals();
    gameStarted = false;
    startCountdownSeconds = 30;
    gameSeconds = 180;
    sanity = 100;
    mistakes = 0;
    isChecking = false;

    for (let id in roomsData) {
        roomsData[id].hasAnomaly = false;
        roomsData[id].currentAnomalyImg = "";
    }

    currentRoomId = 1;
    updateScreenDisplay();
    updateUIStats();
    document.getElementById("checking-overlay").style.display = "none";
    document.getElementById("warning-banner").style.display = "none";
}

function stopAllIntervals() {
    clearInterval(loadInterval);
    clearInterval(countdownInterval);
    clearInterval(gameInterval);
    clearInterval(anomalyInterval);
    clearInterval(sanityInterval);
    gameStarted = false;
}

// 1. นับถอยหลัง 30 วินาทีก่อนเกมเริ่มจริง
function startPreparationCountdown() {
    const timerBox = document.getElementById("game-timer");
    timerBox.innerText = `เริ่มใน: ${startCountdownSeconds}s`;

    countdownInterval = setInterval(() => {
        startCountdownSeconds--;
        timerBox.innerText = `เริ่มใน: ${startCountdownSeconds}s`;

        if (startCountdownSeconds <= 0) {
            clearInterval(countdownInterval);
            gameStarted = true;
            timerBox.innerText = "เวลา: 03:00";
            startMainGameLoops();
        }
    }, 1000);
}

// 2. เริ่มระบบลูปเกมหลักหลังจากผ่าน 30 วินาทีแรกไปแล้ว
function startMainGameLoops() {
    gameInterval = setInterval(() => {
        gameSeconds--;
        updateUIStats();

        if (gameSeconds <= 0) {
            if (sanity >= 20) {
                endGame(true, `ยอดเยี่ยม! คุณประคองค่าสติได้ ${Math.floor(sanity)}% และปฏิบัติหน้าที่จนครบเวลาสำเร็จ!`);
            } else {
                endGame(false, `หมดเวลา! แต่ค่าสติของคุณเหลือเพียง ${Math.floor(sanity)}% (ต่ำกว่า 20%) - คุณหลอนจนสติแตก`);
            }
        }
    }, 1000);

    anomalyInterval = setInterval(() => {
        spawnRandomAnomaly();
    }, 15000);

    sanityInterval = setInterval(() => {
        let activeCount = getActiveAnomalyCount();

        if (activeCount > 0) {
            let drainRate = activeCount * 0.5;
            sanity = Math.max(0, sanity - drainRate);
        } else {
            sanity = Math.min(100, sanity + 0.2);
        }

        updateUIStats();

        if (sanity <= 0) {
            endGame(false, "ค่าสติของคุณลดลงเหลือ 0% - คุณหลอนจนสติแตก");
        }
    }, 1000);
}

function getActiveAnomalyCount() {
    let count = 0;
    for (let id in roomsData) {
        if (roomsData[id].hasAnomaly) count++;
    }
    return count;
}

function spawnRandomAnomaly() {
    const roomKeys = Object.keys(roomsData);
    const availableRooms = roomKeys.filter(id => !roomsData[id].hasAnomaly);

    if (availableRooms.length > 0) {
        const randomId = availableRooms[Math.floor(Math.random() * availableRooms.length)];
        const room = roomsData[randomId];

        room.hasAnomaly = true;
        const randomAnomalyImg = room.anomalies[Math.floor(Math.random() * room.anomalies.length)];
        room.currentAnomalyImg = randomAnomalyImg;

        if (currentRoomId == randomId) {
            updateScreenDisplay();
        }
    }
    updateUIStats();
}

function updateUIStats() {
    const timerBox = document.getElementById("game-timer");
    
    if (!gameStarted) {
        timerBox.innerText = `เริ่มใน: ${startCountdownSeconds}s`;
    } else {
        let mins = Math.floor(gameSeconds / 60);
        let secs = gameSeconds % 60;
        timerBox.innerText = `เวลา: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    document.getElementById("sanity-text").innerText = `${Math.floor(sanity)}%`;
    const fill = document.getElementById("sanity-fill");
    fill.style.width = `${sanity}%`;

    if (sanity >= 50) {
        fill.style.background = "#00cc44";
    } else if (sanity >= 20) {
        fill.style.background = "#ffcc00";
    } else {
        fill.style.background = "#ff3333";
    }

    document.getElementById("mistake-counter").innerText = `รายงานผิด: ${mistakes}/5`;

    let activeCount = getActiveAnomalyCount();
    const warningBanner = document.getElementById("warning-banner");
    if (activeCount > 3) {
        warningBanner.style.display = "block";
    } else {
        warningBanner.style.display = "none";
    }
}

function switchRoom(roomId) {
    currentRoomId = roomId;
    updateScreenDisplay();
}

function updateScreenDisplay() {
    const screen = document.getElementById("cctv-screen");
    const label = document.getElementById("room-label");
    const room = roomsData[currentRoomId];

    label.innerText = "กล้อง 0" + currentRoomId + ": " + room.name;

    if (room.hasAnomaly) {
        screen.src = room.currentAnomalyImg;
    } else {
        screen.src = room.normal;
    }
}

function reportAnomaly() {
    if (!gameStarted || isChecking) {
        if (!gameStarted) alert("กรุณารอให้หมดเวลานับถอยหลังก่อนเริ่มเกม!");
        return;
    }

    isChecking = true;
    const overlay = document.getElementById("checking-overlay");
    const textEl = document.getElementById("checking-text");

    overlay.style.display = "flex";
    textEl.innerText = "กำลังตรวจสอบ...";

    setTimeout(() => {
        const room = roomsData[currentRoomId];

        if (room.hasAnomaly) {
            room.hasAnomaly = false;
            textEl.innerText = "สำเร็จ";
            sanity = Math.min(100, sanity + 10);
        } else {
            mistakes++;
            textEl.innerText = "ไม่พบสิ่งผิดปกติ";
        }

        updateUIStats();

        setTimeout(() => {
            overlay.style.display = "none";
            updateScreenDisplay();
            isChecking = false;

            if (mistakes >= 5) {
                endGame(false, "คุณรายงานผิดพลาดเกิน 5 ครั้ง - คุณหลอนจนสติแตก");
            }
        }, 1500);

    }, 3000);
}

function endGame(isWin, message) {
    stopAllIntervals();
    showScreen('end-screen');

    const titleEl = document.getElementById("end-title");
    const msgEl = document.getElementById("end-message");

    if (isWin) {
        titleEl.innerText = "VICTORY";
        titleEl.style.color = "#00ff00";
        msgEl.style.color = "#00ff00";
    } else {
        titleEl.innerText = "GAME OVER";
        titleEl.style.color = "#ff0000";
        msgEl.style.color = "#ff3333";
    }
    msgEl.innerText = message;
}
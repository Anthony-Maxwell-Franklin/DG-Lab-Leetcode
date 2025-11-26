console.log('[Content] 脚本开始加载');

// 状态变量
let strengthIncreaseInterval = null;

// 为每个通道添加最后更新时间和实际值
let lastUpdate = {
    A: { time: 0, actualValue: 0 },
    B: { time: 0, actualValue: 0 }
};

// 封装随机消息选择函数
function getRandomMessage(type) {
    let messages;
    switch(type) {
        case 'punishment':
            messages = PUNISHMENT_MESSAGES;
            break;
        case 'reward':
            messages = REWARD_MESSAGES;
            break;
        case 'increase':
            messages = STRENGTH_INCREASE_MESSAGES;
            break;
    }

    // 直接随机选择一条消息
    return messages[Math.floor(Math.random() * messages.length)];
}

// 创建强度显示
function createStrengthDisplay() {
    const display = document.createElement('div');
    display.id = 'strength-display';

    const title = document.createElement('div');
    title.id = 'strength-display-title';
    title.innerHTML = '💗 小玩具状态 💗';

    const channelA = createChannelDisplay('A通道', 'strength-a');
    const channelB = createChannelDisplay('B通道', 'strength-b');
    const timer = createTimerDisplay();

    display.appendChild(title);
    display.appendChild(channelA);
    display.appendChild(channelB);
    display.appendChild(timer);
    document.body.appendChild(display);
}

function createChannelDisplay(label, id) {
    const container = document.createElement('div');
    container.className = 'strength-channel-container';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'strength-channel-label';
    // 根据通道设置不同名称
    if (label === 'A通道') {
        labelSpan.innerHTML = '🌸 A通道强度💗';
    } else {
        labelSpan.innerHTML = '🌺 B通道强度💕';
    }

    const valueSpan = document.createElement('span');
    valueSpan.id = id;
    valueSpan.className = 'strength-value';
    valueSpan.textContent = '0';

    container.appendChild(labelSpan);
    container.appendChild(valueSpan);
    return container;
}

function createTimerDisplay() {
    const container = document.createElement('div');
    container.id = 'timer-container';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'timer-label';
    labelSpan.innerHTML = '⏰ 已经玩耍';

    const timeContainer = document.createElement('div');
    timeContainer.className = 'time-display-container';

    const valueSpan = document.createElement('span');
    valueSpan.id = 'time-elapsed';
    valueSpan.textContent = '0';

    const unitSpan = document.createElement('span');
    unitSpan.id = 'time-unit';
    unitSpan.textContent = '秒';

    timeContainer.appendChild(valueSpan);
    timeContainer.appendChild(unitSpan);

    container.appendChild(labelSpan);
    container.appendChild(timeContainer);
    return container;
}

// 修改强度增长曲线函数
function calculateStrengthIncrease(elapsed) {
    const minutes = elapsed / 60000;  // 转换为分钟
    let increase;
    
    if (minutes <= 5) {
        // 前5分钟，快速起步
        increase = minutes * 2;  // 每分钟增加2点
    } else if (minutes <= 15) {
        // 5-15分钟，加速增长
        increase = 10 + (minutes - 5) * 3;  // 从10点开始，每分钟增加3点
    } else {
        // 15分钟后，指数增长
        increase = 40 + Math.pow(minutes - 15, 1.5) * 2;  // 从40点开始，指数增长
    }
    
    // 确保增长不会超过上限
    return Math.min(Math.round(increase), MAX_STRENGTH);
}

// 修改 startStrengthIncrease 函数
function startStrengthIncrease() {
    if (strengthIncreaseInterval) return;

    let startTime = Date.now();
    let lastIncrease = 0;
    let timeDisplay = document.getElementById('time-elapsed');

    // 每更新时间显示
    setInterval(() => {
        const elapsed = Date.now() - startTime;
        timeDisplay.textContent = Math.floor(elapsed / 1000);
    }, 1000);

    // 立即发送第一次脉冲
    chrome.runtime.sendMessage({ 
        type: 'START_PULSE'
    });

    // 每60秒发送次脉冲
    setInterval(() => {
        chrome.runtime.sendMessage({ 
            type: 'START_PULSE'
        });
    }, 60000);

    // 定期增加强度，同时显示提示消息
    strengthIncreaseInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newIncrease = calculateStrengthIncrease(elapsed);
        
        if (newIncrease > lastIncrease) {
            const message = getRandomMessage('increase');
            showNotification('info', message);
            lastIncrease = newIncrease;
        }

        chrome.runtime.sendMessage({ 
            type: 'INCREASE_STRENGTH',
            amount: STRENGTH_INCREASE_AMOUNT
        });
    }, STRENGTH_INCREASE_INTERVAL);
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STRENGTH_UPDATE') {
        updateStrengthWithAnimation(document.getElementById('strength-a'), message.strength.A || 0);
        updateStrengthWithAnimation(document.getElementById('strength-b'), message.strength.B || 0);
    }
    else if (message.type === 'SHOW_NOTIFICATION') {
        if (message.notificationType === 'PUNISHMENT') {
            if (message.passPercentage !== undefined) {
                showPunishmentMessageWithPercentage(message.passPercentage, message.totalCorrect, message.totalTestcases);
            } else {
                showPunishmentMessage();
            }
        } else if (message.notificationType === 'REWARD') {
            if (message.passPercentage !== undefined) {
                showRewardMessageWithPercentage(message.passPercentage, message.totalCorrect, message.totalTestcases);
            } else {
                showRewardMessage();
            }
        }
    }
    
    return true;
});

// 添加提示显示函数
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = 'strength-notification';

    // 根据类型设置不同的样式和前缀
    if (type === 'success') {
        notification.classList.add('success');
        message = `✨ ${message}`;
    } else if (type === 'error') {
        notification.classList.add('error');
        message = `💕 ${message}`;
    } else if (type === 'info') {
        notification.classList.add('info');
        message = `💝 ${message}`;
    }

    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 触发动画
    setTimeout(() => notification.classList.add('show'), 0);
    setTimeout(() => notification.remove(), 3000);
}

// 修改强度更新函数
function updateStrengthWithAnimation(element, newValue) {
    const channel = element.id === 'strength-a' ? 'A' : 'B';
    const now = Date.now();

    // 记录实际值
    lastUpdate[channel].actualValue = newValue;

    // 检查是否需要节流
    if (now - lastUpdate[channel].time < UPDATE_THROTTLE) {
        // 在节流时间内，设置一个定时器在结束后检查值
        if (!lastUpdate[channel].timeoutId) {
            lastUpdate[channel].timeoutId = setTimeout(() => {
                lastUpdate[channel].timeoutId = null;
                // 检查显示值是否与实际值一致
                const displayValue = parseInt(element.textContent);
                if (displayValue !== lastUpdate[channel].actualValue) {
                    updateStrengthWithAnimation(element, lastUpdate[channel].actualValue);
                }
            }, UPDATE_THROTTLE);
        }
        return;
    }

    const oldValue = parseInt(element.textContent);
    if (oldValue === newValue) return;

    // 更新最后更新时间
    lastUpdate[channel].time = now;

    // 添加缩放动画
    element.classList.add('scaling');
    setTimeout(() => element.classList.remove('scaling'), 300);

    // 根据数值变化设置颜色
    element.classList.remove('increase', 'decrease');
    if (newValue > oldValue) {
        element.classList.add('increase');
    } else if (newValue < oldValue) {
        element.classList.add('decrease');
    }

    // 300ms后恢复原始颜色
    setTimeout(() => {
        element.classList.remove('increase', 'decrease');
    }, 300);

    // 更新数值
    element.textContent = newValue;

    // 添加波纹效果
    const ripple = document.createElement('span');
    ripple.className = 'strength-ripple';

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 初始化逻辑
function initialize() {
    console.log('[Content] 开始初始化');
    
    // 确保 DOM 已经加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAfterLoad);
    } else {
        initializeAfterLoad();
    }
}

function initializeAfterLoad() {
    console.log('[Content] DOM已加载，开始创建UI');
    
    // 检测是否在题目页面
    if (window.location.pathname.includes('/problems/')) {
        console.log('[Content] 检测到题目页面');
        createStrengthDisplay();
        startStrengthIncrease();
    } else {
        console.log('[Content] 不是题目页面，跳过初始化');
    }
}

// 修改显示消息的函数
function showPunishmentMessage() {
    const message = getRandomMessage('punishment');
    showNotification('error', message);
}

function showRewardMessage() {
    const message = getRandomMessage('reward');
    showNotification('success', message);
}

// 显示带通过百分比的消息
function showPunishmentMessageWithPercentage(passPercentage, totalCorrect, totalTestcases) {
    const baseMessage = getRandomMessage('punishment');
    const percentageMessage = `通过 ${totalCorrect}/${totalTestcases} (${passPercentage}%)`;
    showNotification('error', `${baseMessage}\n${percentageMessage}`);
}

function showRewardMessageWithPercentage(passPercentage, totalCorrect, totalTestcases) {
    const baseMessage = getRandomMessage('reward');
    const percentageMessage = `通过 ${totalCorrect}/${totalTestcases} (${passPercentage}%)`;
    showNotification('success', `${baseMessage}\n${percentageMessage}`);
}

// 启动初始化
initialize();
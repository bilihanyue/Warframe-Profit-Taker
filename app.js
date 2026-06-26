/**
 * 大蜘蛛日志解析器 - UI 应用逻辑
 */

// ============ 全局状态 ============
let battles = [];
let activeIndex = 0;
let parser = null;

// ============ DOM 元素 ============
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const copyBtn = document.getElementById('copyBtn');
const globalStats = document.getElementById('globalStats');
const runSelector = document.getElementById('runSelector');
const battleDetail = document.getElementById('battleDetail');
const emptyState = document.getElementById('emptyState');

// ============ 事件监听 ============

// 复制路径
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('%localappdata%\\Warframe\\').then(() => {
    copyBtn.textContent = '已复制';
    setTimeout(() => copyBtn.textContent = '复制路径', 2000);
  });
});

// 点击上传区域
dropZone.addEventListener('click', () => fileInput.click());

// 文件选择
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// 拖拽事件
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ============ 文件处理 ============

function handleFile(file) {
  if (!file.name.endsWith('.log') && !file.name.endsWith('.txt')) {
    alert('请上传 .log 或 .txt 格式的日志文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      parser = new ProfitTakerParser();
      battles = parser.analyze(content);

      // 添加场次编号
      battles.forEach((battle, i) => {
        battle.runNr = i + 1;
      });

      if (battles.length > 0) {
        activeIndex = 0;
        renderGlobalStats();
        renderRunSelector();
        renderBattleDetail();
        emptyState.style.display = 'none';
      } else {
        alert('未找到有效的 Profit Taker 战斗数据');
      }
    } catch (err) {
      console.error('解析错误:', err);
      alert('解析日志时出错: ' + err.message);
    }
  };
  reader.onerror = () => {
    alert('读取文件失败');
  };
  reader.readAsText(file);
}

// ============ 渲染全局统计 ============

function renderGlobalStats() {
  const validBattles = battles.filter(b => b.bugsFound.length === 0 && b.hostDuration);

  if (validBattles.length === 0) {
    globalStats.style.display = 'none';
    return;
  }

  const best = validBattles.reduce((a, b) => a.hostDuration < b.hostDuration ? a : b);
  const worst = validBattles.reduce((a, b) => a.hostDuration > b.hostDuration ? a : b);
  const avg = validBattles.reduce((sum, b) => sum + b.hostDuration, 0) / validBattles.length;

  // 从有效场次中提取成员和氏族信息（取第一个有数据的）
  const firstBattle = validBattles.find(b => b.playerNames.host) || validBattles[0];
  const hostName = firstBattle?.playerNames.host || '';
  const clanName = firstBattle?.playerNames.clan || '';

  const stats = [
    { label: '总场次', value: battles.length.toString(), color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
    { label: '有效场次', value: validBattles.length.toString(), color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
    { label: '最佳记录', value: formatTime(best.hostDuration), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', sub: `第${best.runNr}场` },
    { label: '最慢记录', value: formatTime(worst.hostDuration), color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', sub: `第${worst.runNr}场` },
    { label: '平均时间', value: formatTime(avg), color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' }
  ];

  globalStats.innerHTML = `
    <div class="glass-card">
      <div class="stats-header">
        <div class="stats-header-bar"></div>
        <h2>全局统计</h2>
        ${hostName ? `<span class="global-host-info">成员 ${hostName}${clanName ? ` · 氏族 ${clanName}` : ''}</span>` : ''}
      </div>
      <div class="stats-grid">
        ${stats.map(s => `
          <div class="stat-card" style="background:${s.bg};border-color:${s.border}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="color:${s.color}">${s.value}</div>
            ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  globalStats.style.display = 'block';
}

// ============ 渲染场次选择器 ============

function renderRunSelector() {
  if (battles.length === 0) {
    runSelector.style.display = 'none';
    return;
  }

  runSelector.innerHTML = `
    <div class="glass-card">
      <div class="selector-header">
        <h3>选择场次</h3>
        <span class="selector-count">共 ${battles.length} 场</span>
      </div>
      <div class="run-buttons">
        ${battles.map((battle, i) => {
          const hasBugs = battle.bugsFound.length > 0;
          const isActive = i === activeIndex;
          return `
            <button class="run-btn ${isActive ? 'active' : ''} ${hasBugs ? 'has-bugs' : ''}"
                    onclick="selectBattle(${i})">
              #${battle.runNr}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
  runSelector.style.display = 'block';
}

// ============ 选择场次 ============

function selectBattle(index) {
  activeIndex = index;
  renderRunSelector();
  renderBattleDetail();
}

// ============ 渲染战斗详情 ============

function renderBattleDetail() {
  const battle = battles[activeIndex];
  if (!battle) {
    battleDetail.style.display = 'none';
    return;
  }

  const tips = generateAnalysisTips(battle);
  const startTime = battle.startTime || 0;

  // 构建时间线事件
  const timelineEvents = buildTimeline(battle);

  // 护盾统计
  const shieldStats = buildShieldStats(battle);

  // 玩家统计
  const playerStats = buildPlayerStats(battle);

  // 构建玩家统计行
  const playerStatsRows = playerStats.length > 0
    ? playerStats.map(p => `
        <div class="player-stat-row">
          <span class="player-stat-name">${p.name}</span>
          <span class="player-stat-tag" style="color:#ef4444">倒地${p.downs}</span>
          <span class="player-stat-tag" style="color:#f59e0b">失衡${p.knockdowns}</span>
          <span class="player-stat-tag" style="color:#a78bfa">踉跄${p.staggers}</span>
        </div>
      `).join('')
    : '';

  battleDetail.innerHTML = `
    <div class="detail-grid">
      <!-- 概览信息 + 玩家统计 -->
      <div class="detail-section" id="overviewSection">
        <h3>战斗概览</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">战斗时长</div>
            <div class="info-value" style="color:${battle.duration ? '#22c55e' : '#ef4444'}">
              ${battle.duration ? formatTime(battle.duration) : '未完成'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">主机时长</div>
            <div class="info-value">${battle.hostDuration ? formatTime(battle.hostDuration) : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">破腿次数</div>
            <div class="info-value">${battle.legDestroys.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">眩晕次数</div>
            <div class="info-value">${battle.stunEvents.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">充能塔阶段</div>
            <div class="info-value">${battle.pylonPhases.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">最终击杀</div>
            <div class="info-value" style="color:${battle.finalKill ? '#22c55e' : '#ef4444'}">
              ${battle.finalKill ? '是' : '否'}
            </div>
          </div>
        </div>
        ${playerStatsRows ? `
          <div class="player-stats-inline">
            ${playerStatsRows}
          </div>
        ` : ''}
        ${tips.length > 0 ? `
          <h3 style="margin-top:16px">分析提示</h3>
          <ul class="tips-list">
            ${tips.map(t => `<li>${t}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <!-- 事件时间线 -->
      <div class="detail-section timeline-section">
        <h3>事件时间线</h3>
        <div class="timeline">
          ${timelineEvents.map(e => `
            <div class="timeline-item">
              <span class="timeline-time">${e.time}</span>
              <span class="timeline-badge" style="background:${e.color}20;color:${e.color};border:1px solid ${e.color}40">
                ${e.label}
              </span>
              <span class="timeline-content">${e.content}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 护盾统计（条形图 + 详细数据） -->
      <div class="detail-section" style="grid-column:1 / -1">
        <h3>护盾统计</h3>
        ${shieldStats.length > 0 ? `
          <div class="shield-bars">
            ${shieldStats.map(s => `
              <div class="shield-bar-row">
                <div class="shield-bar-left">
                  <span class="shield-bar-name" style="color:${s.color}">${s.name}</span>
                  <div class="shield-bar-track">
                    <div class="shield-bar-fill" style="width:${s.percent}%;background:${s.color}"></div>
                  </div>
                </div>
                <div class="shield-bar-right">
                  <span class="shield-bar-detail">
                    总${formatTime(s.duration)} · 均值${formatTime(s.avg)} · 最快<span style="color:#22c55e">${formatTime(s.fastest)}</span> · 最慢<span style="color:#ef4444">${formatTime(s.slowest)}</span> · ${s.count}次
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color:var(--text-muted);font-size:0.875rem">无护盾数据</p>'}
      </div>
    </div>
  `;
  battleDetail.style.display = 'block';

  // 动态对齐时间线栏高度
  requestAnimationFrame(() => {
    const overview = document.getElementById('overviewSection');
    const timelineSection = document.querySelector('.timeline-section');
    const timeline = document.querySelector('.timeline');
    if (overview && timelineSection && timeline) {
      const overviewHeight = overview.getBoundingClientRect().height;
      const titleHeight = timelineSection.querySelector('h3').getBoundingClientRect().height + 24;
      timelineSection.style.maxHeight = overviewHeight + 'px';
      timeline.style.maxHeight = (overviewHeight - titleHeight) + 'px';
    }
  });
}

// ============ 构建时间线 ============

function buildTimeline(battle) {
  const events = [];
  const startTime = battle.startTime || 0;

  for (const [ts, type, detail] of battle.events) {
    const style = EVENT_STYLES[type];
    if (!style) continue;

    const relativeTime = formatRelativeTime(ts, startTime);
    let content = detail;

    // 解析玩家名称
    if (type === 'PLAYER_DOWN') {
      const avatarName = detail.split(' ')[0];
      content = resolvePlayerName(avatarName, battle.playerNames);
    } else if (type === 'PLAYER_KNOCKDOWN' || type === 'PLAYER_STAGGER') {
      const avatarName = detail.split(' ')[0];
      const playerName = resolvePlayerName(avatarName, battle.playerNames);
      content = detail.replace(avatarName, playerName);
    } else if (type === 'PLAYER_REVIVE') {
      const parts = detail.split(' -> ');
      if (parts.length === 2) {
        const from = resolvePlayerName(parts[0], battle.playerNames);
        const to = resolvePlayerName(parts[1], battle.playerNames);
        content = `${from} -> ${to}`;
      }
    } else if (type === 'PET_DOWN') {
      // 宠物倒地，显示所属玩家
      const petAvatar = detail;
      const ownerName = battle.playerNames[`pet:${petAvatar}`] || resolvePlayerName(petAvatar, battle.playerNames);
      content = `${ownerName}的宠物`;
    } else if (type === 'LEG_DESTROY') {
      content = detail;
    } else if (type === 'SHIELD_CHANGE') {
      // 提取元素名称和破盾时间
      const noteMatch = detail.match(/(.+?)\s*\[(.*?)\]/);
      const elementName = noteMatch ? noteMatch[1].trim() : detail;
      const note = noteMatch ? noteMatch[2] : '';
      const elementColor = DAMAGE_TYPE_COLORS[elementName] || '#94a3b8';
      // 找上一次同元素护盾切换的时间差
      const shieldIdx = battle.events.findIndex(e => e[0] === ts && e[1] === type && e[2] === detail);
      let breakTime = '';
      if (shieldIdx > 0) {
        // 向前找上一个护盾切换或阶段开始
        for (let i = shieldIdx - 1; i >= 0; i--) {
          const prevEvent = battle.events[i];
          if (prevEvent[1] === 'SHIELD_CHANGE' || prevEvent[1] === 'PHASE' || prevEvent[1] === 'ENCOUNTER_START') {
            const diff = ts - prevEvent[0];
            if (diff > 0) breakTime = ` 破盾用时:${diff.toFixed(3)}s`;
            break;
          }
        }
      }
      content = `<span style="color:${elementColor};font-weight:600">${elementName}</span>${breakTime}`;
      if (note && note !== '第一阶段前' && note !== '充能塔2期间') {
        content += ` [${note}]`;
      }
    }

    events.push({
      time: relativeTime,
      label: style.label,
      color: style.color,
      content: content
    });
  }

  return events;
}

// ============ 构建护盾统计 ============

function buildShieldStats(battle) {
  const durations = Object.values(battle.shieldDurations);
  if (durations.length === 0) return [];
  const maxDuration = Math.max(...durations);

  return Object.entries(battle.shieldDurations)
    .map(([type, duration]) => {
      const name = DAMAGE_TYPE_NAMES[type] || type;
      const color = DAMAGE_TYPE_COLORS[name] || '#94a3b8';
      const breakTimes = battle.shieldBreakTimes[type] || [];
      const count = breakTimes.length;
      const avg = count > 0 ? breakTimes.reduce((a, b) => a + b, 0) / count : 0;
      const slowest = count > 0 ? Math.max(...breakTimes) : 0;
      const fastest = count > 0 ? Math.min(...breakTimes) : 0;
      return {
        name,
        duration,
        color,
        percent: (duration / maxDuration) * 100,
        count,
        avg,
        slowest,
        fastest
      };
    })
    .sort((a, b) => b.duration - a.duration);
}

// ============ 构建玩家统计 ============

function buildPlayerStats(battle) {
  const playerMap = new Map();

  // 收集所有玩家
  for (const [, avatar] of battle.playerDowns) {
    const name = resolvePlayerName(avatar, battle.playerNames);
    if (!playerMap.has(name)) playerMap.set(name, { name, downs: 0, knockdowns: 0, staggers: 0 });
    playerMap.get(name).downs++;
  }

  for (const [, avatar] of battle.playerKnockdowns) {
    const name = resolvePlayerName(avatar, battle.playerNames);
    if (!playerMap.has(name)) playerMap.set(name, { name, downs: 0, knockdowns: 0, staggers: 0 });
    playerMap.get(name).knockdowns++;
  }

  for (const [, avatar] of battle.playerStaggers) {
    const name = resolvePlayerName(avatar, battle.playerNames);
    if (!playerMap.has(name)) playerMap.set(name, { name, downs: 0, knockdowns: 0, staggers: 0 });
    playerMap.get(name).staggers++;
  }

  return Array.from(playerMap.values());
}

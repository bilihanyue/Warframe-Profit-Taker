/**
 * 大蜘蛛日志解析器 - 核心解析逻辑
 * Warframe Profit Taker Log Parser
 */

// ============ 常量定义 ============
const DAMAGE_TYPE_NAMES = {
  IMPACT: "冲击",
  PUNCTURE: "穿刺",
  SLASH: "切割",
  FREEZE: "冰冻",
  FIRE: "火焰",
  POISON: "毒素",
  ELECTRICITY: "电击",
  GAS: "毒气",
  VIRAL: "病毒",
  MAGNETIC: "磁力",
  RADIATION: "辐射",
  CORROSIVE: "腐蚀",
  EXPLOSION: "爆炸"
};

const DAMAGE_TYPE_COLORS = {
  冲击: "#f59e0b",
  穿刺: "#94a3b8",
  切割: "#ef4444",
  冰冻: "#22d3ee",
  火焰: "#f97316",
  毒素: "#84cc16",
  电击: "#facc15",
  毒气: "#a3e635",
  病毒: "#f472b6",
  磁力: "#818cf8",
  辐射: "#34d399",
  腐蚀: "#2dd4bf",
  爆炸: "#fb923c"
};

const EVENT_STYLES = {
  SHIELD_CHANGE: { label: "护盾切换", color: "#f59e0b" },
  LEG_DESTROY: { label: "破腿", color: "#f97316" },
  STUN_START: { label: "眩晕开始", color: "#ec4899" },
  STUN_END: { label: "眩晕结束", color: "#ec4899" },
  START_VULNERABLE: { label: "易伤状态", color: "#22c55e" },
  PHASE: { label: "阶段", color: "#eab308" },
  PYLON_START: { label: "充能塔", color: "#3b82f6" },
  PYLON_END: { label: "充能塔结束", color: "#3b82f6" },
  PLAYER_DOWN: { label: "倒地", color: "#06b6d4" },
  PLAYER_KNOCKDOWN: { label: "失衡", color: "#06b6d4" },
  PLAYER_STAGGER: { label: "踉跄", color: "#06b6d4" },
  PLAYER_REVIVE: { label: "复活", color: "#22c55e" },
  PLAYER_BLEEDOUT: { label: "濒死", color: "#ef4444" },
  PET_DOWN: { label: "宠物倒地", color: "#a78bfa" },
  BUG: { label: "异常", color: "#ef4444" },
  ELEVATOR_EXIT: { label: "电梯", color: "#64748b" },
  MISSION_START: { label: "进图", color: "#64748b" },
  MISSION_END: { label: "撤离", color: "#64748b" },
  ENCOUNTER_START: { label: "遭遇", color: "#eab308" },
  PREDETH: { label: "濒死", color: "#ef4444" },
  SEARCH_START: { label: "搜索", color: "#64748b" },
  BATTLE_END: { label: "结束", color: "#64748b" }
};

const LEG_NAMES = {
  LEG_LEFT: "左腿",
  LEG_RIGHT: "右腿",
  ARM_LEFT: "左臂",
  ARM_RIGHT: "右臂"
};

const PHASE_ORDER = { first: 1, second: 2, third: 3, final: 4 };
const PHASE_NAMES = { first: "第1阶段", second: "第2阶段", third: "第3阶段", final: "最终阶段" };

const PHASE_END_AUDIO = {
  DBntyFourInterPrTk0920TheBusiness: { phase: 1, name: "第1阶段结束" },
  DBntyFourInterPrTk0890TheBusiness: { phase: 3, name: "第3阶段结束" },
  DBntyFourSatelReal0930TheBusiness: { phase: 4, name: "第4阶段结束" }
};

// ============ 工具函数 ============

/**
 * 清理玩家名称中的特殊字符
 */
function cleanName(name) {
  return name ? name.replace(/[\ue000-\uf8ff]/g, "").trim() : "";
}

/**
 * 解析单行日志
 */
function parseLogLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let match = trimmed.match(/^(\d+)[\u2192>](\d+\.\d+)\s+(\w+)\s+\[(\w+)\]:\s+(.*)$/);
  if (match) {
    return {
      lineNum: parseInt(match[1]),
      timestamp: parseFloat(match[2]),
      module: match[3],
      level: match[4],
      message: match[5]
    };
  }

  match = trimmed.match(/^(\d+\.\d+)\s+(\w+)\s+\[(\w+)\]:\s+(.*)$/);
  if (match) {
    return {
      lineNum: null,
      timestamp: parseFloat(match[1]),
      module: match[2],
      level: match[3],
      message: match[4]
    };
  }

  match = trimmed.match(/^(\d+):!(\d+\.\d+)\s+(\w+)\s+\[(\w+)\]:\s+(.*)$/);
  if (match) {
    return {
      lineNum: parseInt(match[1]),
      timestamp: parseFloat(match[2]),
      module: match[3],
      level: match[4],
      message: match[5]
    };
  }

  return null;
}

/**
 * 检查是否为有效的 Profit Taker 任务日志
 */
function isValidMission(message) {
  return !!(message.includes("SolarisUnitedHub1") ||
    (message.includes("HeistProfitTaker") &&
      (message.includes("ShowMissionVote") || message.includes("Active jobId"))));
}

/**
 * 格式化时间 (mm:ss.ms)
 */
function formatTime(seconds) {
  if (isNaN(seconds)) return "?";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toFixed(2).padStart(5, "0")}`;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(ts, startTime) {
  if (!startTime || isNaN(ts)) return "?";
  const diff = ts - startTime;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(2)}s`;
}

/**
 * 解析玩家名称
 */
function resolvePlayerName(avatarName, playerNames) {
  const avatarKey = `avatar:${avatarName}`;
  if (playerNames[avatarKey]) return playerNames[avatarKey];
  if (playerNames[avatarName]) return playerNames[avatarName];
  const numMatch = avatarName.match(/(\d+)$/);
  if (numMatch && playerNames[numMatch[1]]) return playerNames[numMatch[1]];
  return avatarName.replace(/[\ue000-\uf8ff]/g, "").trim();
}

// ============ 日志解析器类 ============

class ProfitTakerParser {
  constructor() {
    this.reset();
  }

  reset() {
    this.playerNames = {};
    this.startTime = null;
    this.endTime = null;
    this.state = "IDLE";
    this.events = [];
    this.legDestroys = [];
    this.legDestroyCounts = {};
    this.shieldChanges = [];
    this.currentShield = null;
    this.shieldStartTime = null;
    this.shieldDurations = {};
    this.shieldPhases = [];
    this.shieldBreakTimes = {};
    this.stunEvents = [];
    this.stunStart = null;
    this.pylonPhases = [];
    this.pylonStart = null;
    this.pylonCount = 0;
    this.pylonStageType = null;
    this.pylon2LastShield = null;
    this.prePhase1LastShield = null;
    this.operatorTransfers = [];
    this.petDowns = [];
    this.playerKnockdowns = [];
    this.playerStaggers = [];
    this.playerDowns = [];
    this.playerRevives = [];
    this.playerBleedouts = [];
    this.activeKnockdowns = new Set();
    this.bugsFound = [];
    this.encounterStarted = false;
    this.finalKill = false;
    this.enteredFinalPhase = false;
    this.stunCount = 0;
    this.phase1Started = false;
    this.attackPhases = [];
    this.ssStartedTime = null;
    this.commitInventoryCheckpointTime = null;
    this.stateEndingTime = null;
    this.missionEnded = false;
    this.eomReached = false;
    this.ssStartedForCheck = null;
    this.phaseEndMarkers = [];
    this.elevatorExitTime = null;
    this.phaseLastShieldInfo = {};
    this.phase1StartTime = null;
    this.finalPhaseStartTime = null;
    this.hubConfirmed = false;
  }

  /**
   * 分析日志内容
   */
  analyze(content) {
    const lines = content.split("\n");
    const battles = [];
    this.reset();

    for (const line of lines) {
      const parsed = parseLogLine(line);
      if (!parsed) continue;

      const message = parsed.message;
      const timestamp = parsed.timestamp;

      // 解析玩家名称
      let match = message.match(/CreatePlayerForClient\.\s*id=(\d+),\s*user\s*name=(\S+)/);
      if (match) this.playerNames[match[1]] = cleanName(match[2]);

      match = message.match(/Player name changed to (\S+).*Clan:\s*(\S+)/);
      if (match) {
        this.playerNames.host = cleanName(match[1]);
        this.playerNames.clan = match[2];
      }

      match = message.match(/(\w+Avatar\d+)\s+with\s+ID.*has\s+new\s*player:\s*(\S+)/);
      if (match) this.playerNames[`avatar:${match[1]}`] = cleanName(match[2]);

      match = message.match(/(\w+PetAvatar\d+).*setting owner player to (\S+)/);
      if (match) this.playerNames[`pet:${match[1]}`] = cleanName(match[2]);

      // 状态机处理
      if (this.state === "IDLE") {
        if (message.includes("GameRulesImpl - changing state from SS_WAITING_FOR_PLAYERS to SS_STARTED")) {
          this.ssStartedForCheck = timestamp;
          this.state = "PENDING_HUB_CHECK";
          const host = this.playerNames.host;
          const clan = this.playerNames.clan;
          this.playerNames = {};
          if (host) this.playerNames.host = host;
          if (clan) this.playerNames.clan = clan;
        }
      } else if (this.state === "PENDING_HUB_CHECK") {
        if (isValidMission(message)) {
          this.hubConfirmed = true;
          this.ssStartedTime = this.ssStartedForCheck;
          this.state = "PENDING";
          this.events.push([this.ssStartedTime, "MISSION_START", "任务开始(SS_STARTED, SolarisUnitedHub1已确认)"]);
        } else if (message.includes("GameRulesImpl - changing state from SS_WAITING_FOR_PLAYERS to SS_STARTED")) {
          this.reset();
          this.ssStartedForCheck = timestamp;
          this.state = "PENDING_HUB_CHECK";
          const host = this.playerNames.host;
          const clan = this.playerNames.clan;
          this.playerNames = {};
          if (host) this.playerNames.host = host;
          if (clan) this.playerNames.clan = clan;
        }
      } else if (this.state === "PENDING") {
        if (message.includes("EidolonMP.lua: EIDOLONMP: Avatar left the zone")) {
          this.elevatorExitTime = timestamp;
          this.startTime = timestamp;
          this.events.push([timestamp, "ELEVATOR_EXIT", "电梯出口（战斗开始）"]);
        }
        if (message.includes("CancelActiveJob called")) {
          this.events.push([timestamp, "SEARCH_START", "开始寻找大蜘蛛"]);
        } else if (message.includes("Starting Camper Encounter")) {
          this.state = "STARTED";
          this.encounterStarted = true;
          this.events.push([timestamp, "ENCOUNTER_START", "找到大蜘蛛，战斗开始"]);
        }
      } else if (this.state === "STARTED") {
        if (message.includes("GameRulesImpl - changing state from SS_STARTED to SS_ENDING")) {
          this.stateEndingTime = timestamp;
        }

        if (this.stateEndingTime === null) {
          this.processBattleEvent(timestamp, message);
          if (!this.commitInventoryCheckpointTime && message.includes("CommitInventoryCheckpointToDB(0, 0, 0)")) {
            this.commitInventoryCheckpointTime = timestamp;
            this.eomReached = true;
          }
        }

        if (!this.missionEnded && message.includes("CommitInventoryChangesToDB")) {
          this.missionEnded = true;
          if (this.commitInventoryCheckpointTime) {
            this.endTime = this.commitInventoryCheckpointTime;
            this.events.push([this.commitInventoryCheckpointTime, "BATTLE_END",
              `战斗结束(CommitInventoryCheckpoint, CommitInventory@${timestamp.toFixed(3)}s)`]);
            this.events.push([this.commitInventoryCheckpointTime, "MISSION_END", "任务结算(CommitInventoryCheckpoint)"]);
          } else {
            this.endTime = timestamp;
            this.events.push([timestamp, "BATTLE_END", "战斗结束(CommitInventoryChangesToDB, 无Checkpoint)"]);
            this.events.push([timestamp, "MISSION_END", "任务结算(CommitInventoryChangesToDB)"]);
          }
          battles.push(this.saveBattleData());
          this.reset();
        } else if (message.includes("GameRulesImpl - changing state from SS_WAITING_FOR_PLAYERS to SS_STARTED")) {
          battles.push(this.saveBattleData());
          this.reset();
          this.ssStartedForCheck = timestamp;
          this.state = "PENDING_HUB_CHECK";
          const host = this.playerNames.host;
          const clan = this.playerNames.clan;
          this.playerNames = {};
          if (host) this.playerNames.host = host;
          if (clan) this.playerNames.clan = clan;
        }
      }
    }

    if (this.state === "STARTED" && this.encounterStarted) {
      battles.push(this.saveBattleData());
    }

    return battles;
  }

  /**
   * 处理战斗事件
   */
  processBattleEvent(timestamp, message) {
    if (this.eomReached) return;
    if (message.includes("CamperPreDeath")) {
      this.finalKill = true;
      this.eomReached = true;
      return;
    }

    // 玩家名称更新
    let match = message.match(/(\w+Avatar\d+)\s+with\s+ID\s+\d+\s+new\s*player=\S+,\s+had\s+(\S+)/);
    if (match) this.playerNames[`avatar:${match[1]}`] = cleanName(match[2]);

    match = message.match(/(\w+PetAvatar\d+)\s+setting\s+owner\s+Avatar\s+to\s+(\w+Avatar\d+)/);
    if (match) {
      const pet = match[1];
      const avatar = match[2];
      const name = this.playerNames[`pet:${pet}`];
      if (name) this.playerNames[`avatar:${avatar}`] = name;
    }

    match = message.match(/(\w+PetAvatar\d+)\s+setting\s+owner\s+player\s+to\s+(\S+)/);
    if (match) this.playerNames[`pet:${match[1]}`] = cleanName(match[2]);

    if (message.includes("Creating OperatorAvatar") || message.includes("Destroying Operator Avatar")) {
      this.operatorTransfers.push(timestamp);
    }

    // 护盾切换
    match = message.match(/SwitchShieldVulnerability\(\).*DT_(\w+)/);
    if (match) {
      const dmgType = match[1];
      const isPylon2 = this.pylonStart && this.pylonStageType === "SECOND";
      const isPrePhase1 = !this.phase1Started;

      if (isPylon2) {
        this.pylon2LastShield = dmgType;
        this.shieldChanges = this.shieldChanges.filter(([,, note]) => note !== "充能塔2期间");
        this.shieldChanges.push([timestamp, dmgType, "充能塔2期间"]);
        this.events.push([timestamp, "SHIELD_CHANGE", `${DAMAGE_TYPE_NAMES[dmgType] || dmgType} [充能塔2期间]`]);
      } else if (isPrePhase1) {
        this.prePhase1LastShield = dmgType;
        this.shieldChanges.push([timestamp, dmgType, "第一阶段前"]);
        this.events.push([timestamp, "SHIELD_CHANGE", `${DAMAGE_TYPE_NAMES[dmgType] || dmgType} [第一阶段前]`]);
      } else {
        if (this.currentShield && this.shieldStartTime) {
          const duration = timestamp - this.shieldStartTime;
          this.shieldDurations[this.currentShield] = (this.shieldDurations[this.currentShield] || 0) + duration;
          if (!this.shieldBreakTimes[this.currentShield]) this.shieldBreakTimes[this.currentShield] = [];
          this.shieldBreakTimes[this.currentShield].push(duration);
          this.shieldPhases.push({
            start: this.shieldStartTime,
            end: timestamp,
            dmgType: this.currentShield,
            duration: duration,
            trigger: ""
          });
        }
        this.currentShield = dmgType;
        this.shieldStartTime = timestamp;
        this.shieldChanges.push([timestamp, dmgType, ""]);
        this.events.push([timestamp, "SHIELD_CHANGE", DAMAGE_TYPE_NAMES[dmgType] || dmgType]);
      }
    }

    // 破腿
    match = message.match(/Camper->DestroyLeg\(\).*part:\s+(\w+)/);
    if (match) {
      const leg = match[1];
      this.legDestroys.push([timestamp, leg]);
      this.legDestroyCounts[leg] = (this.legDestroyCounts[leg] || 0) + 1;
      this.events.push([timestamp, "LEG_DESTROY", LEG_NAMES[leg] || leg]);
    }

    // 眩晕
    if (message.includes("Starting stun state")) {
      this.stunStart = timestamp;
      this.stunCount++;
      this.events.push([timestamp, "STUN_START", "大蜘蛛眩晕开始"]);
    }
    if (message.includes("GetUpFromStun() - Ending stun state")) {
      if (this.stunStart) {
        this.stunEvents.push([this.stunStart, timestamp]);
        this.events.push([timestamp, "STUN_END", `大蜘蛛眩晕结束(持续${(timestamp - this.stunStart).toFixed(1)}s)`]);
      }
      this.stunStart = null;
    }

    // 易伤状态
    if (message.includes("StartVulnerable() - The Camper can now be damaged!")) {
      const lastEvent = this.events.length > 0 ? this.events[this.events.length - 1] : null;
      if (!lastEvent || lastEvent[0] !== timestamp || lastEvent[1] !== "START_VULNERABLE") {
        this.events.push([timestamp, "START_VULNERABLE", "大蜘蛛身体进入易伤状态"]);
      }
    }

    // 阶段切换
    match = message.match(/Orb Fight - Starting (\w+) attack Orb phase/);
    if (match) {
      const phaseKey = match[1];
      const phaseOrder = PHASE_ORDER[phaseKey] || 0;
      const phaseName = PHASE_NAMES[phaseKey] || phaseKey;

      if (this.attackPhases.length > 0) {
        const lastPhase = this.attackPhases[this.attackPhases.length - 1];
        const lastOrder = lastPhase[1] + 1;
        if (phaseOrder > lastOrder) {
          const skipped = [];
          for (const [key, order] of Object.entries(PHASE_ORDER)) {
            if (lastOrder <= order && order < phaseOrder) {
              skipped.push(PHASE_NAMES[key]);
            }
          }
          this.bugsFound.push([timestamp, "跳阶段", `从${lastPhase[0]}跳到${phaseName}，跳过${skipped.join("、")}`]);
          this.events.push([timestamp, "BUG", `跳阶段：跳过${skipped.join("、")}`]);
        } else if (phaseOrder <= lastPhase[1]) {
          this.bugsFound.push([timestamp, "阶段回溯", `从${lastPhase[0]}回到${phaseName}`]);
          this.events.push([timestamp, "BUG", `阶段回溯：${lastPhase[0]}→${phaseName}`]);
        }
      }

      this.attackPhases.push([phaseName, phaseOrder]);
      this.events.push([timestamp, "PHASE", `进入${phaseName}`]);

      if (phaseKey === "first" && this.prePhase1LastShield) {
        this.phase1Started = true;
        this.phase1StartTime = timestamp;
        this.currentShield = this.prePhase1LastShield;
        this.shieldStartTime = timestamp;
        this.prePhase1LastShield = null;
      } else if (phaseKey === "second" && this.pylonStart && this.pylonStageType === "FIRST") {
        this.pylonPhases.push([this.pylonStart, timestamp, this.pylonCount, "phase_trigger"]);
        this.events.push([timestamp, "PYLON_END", "4充能塔结束（进入第2阶段）"]);
        this.pylonStart = null;
        this.pylonStageType = null;
      } else if (phaseKey === "final" && this.pylonStart && this.pylonStageType === "SECOND") {
        this.pylonPhases.push([this.pylonStart, timestamp, this.pylonCount, "phase_trigger"]);
        this.events.push([timestamp, "PYLON_END", "6充能塔结束（进入最终阶段）"]);
        this.enteredFinalPhase = true;
        this.finalPhaseStartTime = timestamp;
        if (this.pylon2LastShield) {
          if (this.currentShield && this.shieldStartTime) {
            const duration = timestamp - this.shieldStartTime;
            this.shieldDurations[this.currentShield] = (this.shieldDurations[this.currentShield] || 0) + duration;
            this.shieldPhases.push({
              start: this.shieldStartTime,
              end: timestamp,
              dmgType: this.currentShield,
              duration: duration,
              trigger: ""
            });
          }
          this.currentShield = this.pylon2LastShield;
          this.shieldStartTime = timestamp;
          this.pylon2LastShield = null;
        }
        this.pylonStart = null;
        this.pylonStageType = null;
      }
    }

    // 充能塔启动
    if (message.includes("First Stage, launch 3 pylons")) {
      this.handlePylonStart(timestamp, 4, "FIRST");
    } else if (message.includes("Final Stage, launch 6 pylons")) {
      this.handlePylonStart(timestamp, 6, "SECOND");
    }

    // 玩家失衡
    match = message.match(/(\w+Avatar\d+).*Posture modifier knockdown:\s+(\d+)/);
    if (match) {
      const avatar = match[1];
      const value = parseInt(match[2]);
      if (avatar.includes("TennoAvatar") || avatar.includes("OperatorAvatar")) {
        if (value === 1 && !this.activeKnockdowns.has(avatar)) {
          this.activeKnockdowns.add(avatar);
          this.playerKnockdowns.push([timestamp, avatar]);
          this.events.push([timestamp, "PLAYER_KNOCKDOWN", avatar]);
        } else if (value === 0) {
          this.activeKnockdowns.delete(avatar);
        }
      }
    }

    // 玩家踉跄
    match = message.match(/(\w+Avatar\d+).*Posture modifier stagger:\s+(\d+)/);
    if (match) {
      const avatar = match[1];
      const value = parseInt(match[2]);
      if ((avatar.includes("TennoAvatar") || avatar.includes("OperatorAvatar")) && value === 1) {
        this.playerStaggers.push([timestamp, avatar]);
        this.events.push([timestamp, "PLAYER_STAGGER", avatar]);
      }
    }

    // 玩家倒地
    match = message.match(/^(\S+?)\s+was downed by\s+\d+\s+\/\s+\d+\s+damage(?:\s+from\s+a?\s*(.+))?/);
    if (match) {
      const player = match[1];
      const source = match[2] || "未知";
      if (!player.includes("PetAvatar")) {
        this.playerDowns.push([timestamp, player, source]);
        this.events.push([timestamp, "PLAYER_DOWN", `${player} <- ${source}`]);
      }
    }

    // 玩家濒死
    if (message.includes("Player went back into bleedout after failing Second Chance")) {
      this.playerBleedouts.push([timestamp, "未知"]);
      this.events.push([timestamp, "PLAYER_BLEEDOUT", "玩家进入濒死状态"]);
    }

    // 玩家复活
    match = message.match(/LotusReviveAction::Execute\s+-\s+(\w+Avatar\d+)\s+has started reviving\s+(\w+Avatar\d+)/);
    if (match) {
      this.playerRevives.push([timestamp, match[1], match[2]]);
      this.events.push([timestamp, "PLAYER_REVIVE", `${match[1]} -> ${match[2]}`]);
    }

    // 宠物倒地
    match = message.match(/(\w+PetAvatar\d+).*was downed/);
    if (match) {
      this.petDowns.push([timestamp, match[1]]);
      this.events.push([timestamp, "PET_DOWN", match[1]]);
    }

    // 最终击杀
    if (message.includes("CamperPreDeath")) {
      this.finalKill = true;
      this.events.push([timestamp, "PREDETH", "CamperPreDeath"]);
    }

    // 阶段结束音频标记
    for (const [key, info] of Object.entries(PHASE_END_AUDIO)) {
      if (message.includes(key)) {
        const exists = this.phaseEndMarkers.some(m => m.phase === info.phase && Math.abs(m.ts - timestamp) < 30);
        if (!exists && !this.phaseLastShieldInfo[info.phase]) {
          this.phaseEndMarkers.push({ phase: info.phase, name: info.name, ts: timestamp });
          this.markPhaseLastShield(timestamp, info.phase);
        }
        break;
      }
    }
  }

  /**
   * 标记阶段最后护盾
   */
  markPhaseLastShield(timestamp, phase) {
    let idx = -1, dmgType = null, changeTs = null, note = null;
    for (let i = this.shieldChanges.length - 1; i >= 0; i--) {
      const [ts, dt, nt] = this.shieldChanges[i];
      if (nt !== "第一阶段前" && nt !== "充能塔2期间" && timestamp >= ts) {
        idx = i; dmgType = dt; changeTs = ts; note = nt;
        break;
      }
    }
    if (idx === -1) {
      for (let i = this.shieldChanges.length - 1; i >= 0; i--) {
        const [ts, dt, nt] = this.shieldChanges[i];
        if ((nt === "充能塔2期间" || nt === "第一阶段前") && timestamp >= ts) {
          idx = i; dmgType = dt; changeTs = ts; note = nt;
          break;
        }
      }
    }
    if (idx === -1 || !changeTs || !dmgType) return;

    let shieldPhaseStart = changeTs;
    if (note === "第一阶段前" && this.phase1StartTime) {
      shieldPhaseStart = this.phase1StartTime;
    } else if (note === "充能塔2期间" && this.finalPhaseStartTime) {
      shieldPhaseStart = this.finalPhaseStartTime;
    }

    this.phaseLastShieldInfo[phase] = {
      changeTs: changeTs,
      shieldPhaseStart: shieldPhaseStart,
      dmgType: dmgType,
      audioTs: timestamp
    };
  }

  /**
   * 处理充能塔启动
   */
  handlePylonStart(timestamp, count, stageType) {
    const pylonCount = this.pylonPhases.length;
    if (stageType === "FIRST" && pylonCount >= 1) {
      this.bugsFound.push([timestamp, "充能塔启动顺序异常", `4塔启动出现在第${pylonCount + 1}轮`]);
    } else if (stageType === "SECOND" && pylonCount === 0) {
      this.bugsFound.push([timestamp, "充能塔启动顺序异常", "6塔启动出现在4塔之前"]);
    } else if (stageType === "SECOND" && pylonCount >= 2) {
      this.bugsFound.push([timestamp, "充能塔启动次数异常", `出现第${pylonCount + 1}轮充能塔启动`]);
    }

    if (this.pylonStart) {
      this.pylonPhases.push([this.pylonStart, timestamp, this.pylonCount, "forced"]);
    }
    this.pylonStart = timestamp;
    this.pylonCount = count;
    this.pylonStageType = stageType;
    this.events.push([timestamp, "PYLON_START", `启动${count}充能塔`]);
  }

  /**
   * 修复未完成的充能塔阶段
   */
  fixUnfinishedPylonPhases() {
    if (!this.pylonStart) return;
    const endTime = this.endTime || this.startTime;
    if (endTime) {
      this.pylonPhases.push([this.pylonStart, endTime, this.pylonCount, "forced_结束"]);
    }
    this.pylonStart = null;
    this.pylonStageType = null;
  }

  /**
   * 保存战斗数据
   */
  saveBattleData() {
    let endTime = this.endTime;
    for (const [, type] of this.events) {
      if (type === "PREDETH") {
        endTime = this.events.find(e => e[1] === "PREDETH")[0];
        break;
      }
    }

    // 修正护盾阶段持续时间
    for (const phase of this.shieldPhases) {
      for (const info of Object.values(this.phaseLastShieldInfo)) {
        if (phase.dmgType === info.dmgType && Math.abs(phase.start - info.shieldPhaseStart) < 0.001) {
          const oldDuration = phase.duration;
          const newDuration = info.audioTs - phase.start;
          phase.end = info.audioTs;
          phase.duration = newDuration;
          this.shieldDurations[phase.dmgType] = (this.shieldDurations[phase.dmgType] || 0) - oldDuration + newDuration;
          break;
        }
      }
    }

    if (this.currentShield && this.shieldStartTime && endTime) {
      let shieldEnd = endTime;
      for (const info of Object.values(this.phaseLastShieldInfo)) {
        if (info.dmgType === this.currentShield && Math.abs(info.shieldPhaseStart - this.shieldStartTime) < 0.001) {
          shieldEnd = info.audioTs;
          break;
        }
      }
      const duration = shieldEnd - this.shieldStartTime;
      this.shieldDurations[this.currentShield] = (this.shieldDurations[this.currentShield] || 0) + duration;
      if (!this.shieldBreakTimes[this.currentShield]) this.shieldBreakTimes[this.currentShield] = [];
      this.shieldBreakTimes[this.currentShield].push(duration);
      this.shieldPhases.push({
        start: this.shieldStartTime,
        end: shieldEnd,
        dmgType: this.currentShield,
        duration: duration,
        trigger: ""
      });
    }

    this.fixUnfinishedPylonPhases();

    if (this.stunStart) {
      const stunEnd = this.endTime || this.startTime;
      if (stunEnd) {
        this.stunEvents.push([this.stunStart, stunEnd]);
      }
      this.stunStart = null;
    }

    let hostDuration = null;
    if (this.ssStartedTime && this.commitInventoryCheckpointTime) {
      hostDuration = this.commitInventoryCheckpointTime - this.ssStartedTime;
    }

    let stateDuration = null;
    if (this.ssStartedTime && this.stateEndingTime) {
      stateDuration = this.stateEndingTime - this.ssStartedTime;
    }

    const duration = this.endTime && this.startTime ? this.endTime - this.startTime : null;

    return {
      startTime: this.startTime,
      endTime: this.endTime,
      duration: duration,
      hostDuration: hostDuration,
      stateDuration: stateDuration,
      events: [...this.events],
      legDestroys: [...this.legDestroys],
      legDestroyCounts: { ...this.legDestroyCounts },
      shieldChanges: [...this.shieldChanges],
      shieldDurations: { ...this.shieldDurations },
      shieldBreakTimes: { ...this.shieldBreakTimes },
      stunEvents: [...this.stunEvents],
      pylonPhases: [...this.pylonPhases],
      operatorTransfers: [...this.operatorTransfers],
      petDowns: [...this.petDowns],
      shieldPhases: [...this.shieldPhases],
      playerKnockdowns: [...this.playerKnockdowns],
      playerStaggers: [...this.playerStaggers],
      playerDowns: [...this.playerDowns],
      playerRevives: [...this.playerRevives],
      playerBleedouts: [...this.playerBleedouts],
      bugsFound: [...this.bugsFound],
      finalKill: this.finalKill,
      ssStartedTime: this.ssStartedTime,
      commitInventoryCheckpointTime: this.commitInventoryCheckpointTime,
      stateEndingTime: this.stateEndingTime,
      playerNames: { ...this.playerNames },
      phaseEndMarkers: [...this.phaseEndMarkers],
      elevatorExitTime: this.elevatorExitTime
    };
  }
}

/**
 * 生成分析提示
 */
function generateAnalysisTips(battle) {
  const tips = [];
  const legCount = battle.legDestroys.length;
  if (legCount > 16) tips.push(`破腿次数异常: ${legCount}次（标准16次）`);
  else if (legCount < 16 && battle.endTime) tips.push(`破腿次数不足: ${legCount}次`);

  const pylonCount = battle.pylonPhases.length;
  if (pylonCount > 2) tips.push(`充能塔阶段异常: ${pylonCount}次`);
  else if (pylonCount < 2 && battle.endTime && !battle.finalKill) tips.push(`充能塔阶段不足: ${pylonCount}次`);

  const stunCount = battle.stunEvents.length;
  if (stunCount > 4) tips.push(`眩晕次数异常: ${stunCount}次`);
  else if (stunCount < 4 && battle.endTime) tips.push(`眩晕次数不足: ${stunCount}次`);

  for (let i = 0; i < battle.pylonPhases.length; i++) {
    const phase = battle.pylonPhases[i];
    const duration = phase[1] - phase[0];
    if (duration > 20) tips.push(`第${i + 1}次充能塔清理慢: ${duration.toFixed(1)}s`);
  }

  if (battle.petDowns.length > 5) tips.push(`宠物频繁倒地: ${battle.petDowns.length}次`);
  if (battle.playerDowns.length > 3) tips.push(`玩家频繁倒地: ${battle.playerDowns.length}次`);

  return tips;
}

// 导出
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ProfitTakerParser, formatTime, formatRelativeTime, generateAnalysisTips, EVENT_STYLES, DAMAGE_TYPE_NAMES, DAMAGE_TYPE_COLORS };
}

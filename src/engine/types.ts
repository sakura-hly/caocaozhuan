// ---------- 基础 ----------
export type Faction = 'player' | 'enemy' | 'ally'
export type Weather = 'sunny' | 'cloudy' | 'rainy'
export type ClassId = 'lord' | 'infantry' | 'cavalry' | 'archer' | 'strategist' | 'taoist'
export type TerrainId = 'plain' | 'forest' | 'mountain' | 'water' | 'city' | 'camp' | 'pass' | 'bridge'
export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spirit' | 'agi'
export type Stats = Record<StatKey, number>
export interface Cell { x: number; y: number }

// ---------- 静态数据 ----------
export interface TerrainDef {
  id: TerrainId
  name: string
  defBonus: number // 防御加成 %
  moveCost: number | ({ default: number } & Partial<Record<ClassId, number>>)
}

export interface ClassDef {
  id: ClassId
  name: string
  movePower: number
  minRange: number
  maxRange: number
  growth: Stats // 每级成长率（0~10）
}

export type ItemSlot = 'weapon' | 'armor' | 'accessory'
export type ItemKind = ItemSlot | 'consumable'
export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  bonuses?: Partial<Stats & { move: number }>
  healHp?: number
  healMp?: number
  allowedClasses?: ClassId[] // 缺省=全兵种
  desc: string
}

export type StrategyKind = 'attack' | 'heal' | 'buff' | 'debuff'
export type TargetShape = 'single' | 'cross' | 'burst' // cross=十字, burst=3x3
export type StatusKind = 'stun' | 'defdown' | 'speedup' | 'accdown'
export interface StrategyDef {
  id: string
  name: string
  kind: StrategyKind
  mpCost: number
  power: number
  shape: TargetShape
  range: number
  element?: 'fire' | 'water' | 'earth' // attack 类必填
  effect?: StatusKind
  effectTurns?: number
  allowedClasses: ClassId[]
  desc: string
}

export interface HeroDef {
  id: string
  name: string
  title: string
  classId: ClassId
  base: Stats // 1 级裸属性
  portraitHue: number // 程序化头像色相 0~360
}

// ---------- 战斗状态 ----------
export interface StatusEffect { kind: StatusKind; turns: number }

export interface Unit {
  id: string
  heroId: string // '' = 非武将档案单位（敌杂兵）
  name: string
  faction: Faction
  classId: ClassId
  level: number
  exp: number
  base: Stats // 成长后裸属性（不含装备）
  hp: number
  mp: number
  pos: Cell
  equipment: Partial<Record<ItemSlot, string>>
  items: string[] // 携带的消耗品 id
  statuses: StatusEffect[]
  moved: boolean
  acted: boolean
  alive: boolean
}

export interface ReinforcementEntry { unit: Unit; at: Cell }
export interface ReinforcementDef { turn: number; entries: ReinforcementEntry[] }
export interface TreasureCell { cell: Cell; itemId: string; found: boolean }
/** 对话触发器：turn（回合开始时触发）与 onDeathOf（指定单位阵亡时触发）二选一。 */
export type DialogueTrigger =
  | { turn: number; onDeathOf?: undefined; dialogueId: string }
  | { onDeathOf: string; turn?: undefined; dialogueId: string }
export interface WeatherScriptEntry { turn: number; weather: Weather }

export type WinCondition =
  | { kind: 'annihilate' }
  | { kind: 'killCommander'; unitId: string }
  | { kind: 'survive'; untilTurn: number }
  | { kind: 'reach'; unitId: string; cell: Cell }

export interface BattleDef {
  id: string
  name: string
  desc: string
  map: TerrainId[][]
  units: Unit[]
  reinforcements: ReinforcementDef[]
  treasureCells: TreasureCell[]
  dialogues: DialogueTrigger[]
  weather: Weather
  weatherScript: WeatherScriptEntry[]
  win: WinCondition // 失败条件固定：曹操(君主)阵亡 / 我方全灭 / 超过 maxTurns
  maxTurns: number
}

export interface BattleState {
  battleId: string
  turn: number
  factionOrder: Faction[]
  factionIndex: number
  weather: Weather
  map: TerrainId[][]
  units: Unit[]
  reinforcements: ReinforcementDef[]
  treasureCells: TreasureCell[]
  dialogues: DialogueTrigger[]
  weatherScript: WeatherScriptEntry[]
  win: WinCondition
  maxTurns: number
  rngState: number
  rewards: string[] // 宝物/缴获
  finished: null | 'won' | 'lost'
}

// ---------- 指令与结果 ----------
export type Command =
  | { type: 'move'; unitId: string; to: Cell }
  | { type: 'attack'; unitId: string; targetId: string }
  | { type: 'cast'; unitId: string; strategyId: string; target: Cell }
  | { type: 'useItem'; unitId: string; itemId: string; targetId: string }
  | { type: 'wait'; unitId: string }
  | { type: 'endTurn' }

export type EngineError =
  | { code: 'UNIT_NOT_FOUND'; unitId: string }
  | { code: 'NOT_YOUR_TURN'; unitId: string; faction: Faction }
  | { code: 'UNIT_ALREADY_ACTED'; unitId: string }
  | { code: 'UNIT_DEAD'; unitId: string }
  | { code: 'OUT_OF_MOVE_RANGE'; unitId: string }
  | { code: 'NOT_IN_RANGE'; unitId: string; targetId: string }
  | { code: 'CANNOT_TARGET'; reason: string }
  | { code: 'NOT_ENOUGH_MP'; needed: number; have: number }
  | { code: 'SPELL_UNUSABLE_IN_WEATHER'; weather: Weather }
  | { code: 'CLASS_CANNOT_CAST'; classId: ClassId }
  | { code: 'ITEM_NOT_HELD'; itemId: string }
  | { code: 'ITEM_NOT_CONSUMABLE'; itemId: string }
  | { code: 'BATTLE_ENDED' }

export type ApplyResult =
  | { ok: true; state: BattleState; events: GameEvent[] }
  | { ok: false; error: EngineError }

// ---------- 事件 ----------
export interface HitDetail {
  attackerId: string
  defenderId: string
  damage: number
  missed: boolean
  critical: boolean
  combo: boolean
  counter: boolean
}

export type GameEvent =
  | { type: 'battleStarted'; battleId: string }
  | { type: 'roundStarted'; turn: number }
  | { type: 'turnStarted'; faction: Faction; turn: number }
  | { type: 'turnEnded'; faction: Faction; turn: number }
  | { type: 'weatherChanged'; weather: Weather }
  | { type: 'unitMoved'; unitId: string; path: Cell[] }
  | { type: 'attackLaunched'; hits: HitDetail[] }
  | { type: 'hpChanged'; unitId: string; hp: number; delta: number }
  | { type: 'mpChanged'; unitId: string; mp: number; delta: number }
  | { type: 'unitDied'; unitId: string; byUnitId?: string }
  | { type: 'expGained'; unitId: string; amount: number }
  | { type: 'levelUp'; unitId: string; level: number; gains: Partial<Stats> }
  | { type: 'spellCast'; casterId: string; strategyId: string; target: Cell }
  | { type: 'statusApplied'; unitId: string; kind: StatusKind; turns: number }
  | { type: 'itemUsed'; unitId: string; targetId: string; itemId: string }
  | { type: 'treasureFound'; unitId: string; itemId: string }
  | { type: 'reinforcementsArrived'; unitIds: string[] }
  | { type: 'dialogueTriggered'; dialogueId: string }
  | { type: 'battleWon' }
  | { type: 'battleLost' }

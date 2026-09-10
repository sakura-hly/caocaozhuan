/** 战后抉择：呈现于结算屏（报告下方），作答落 morality/choicesMade（applyChoice + addMorality）。 */
export interface ChoiceOption {
  label: string
  /** 善恶增量：仁 +1 / 暴 −1。 */
  morality: number
  /** 入库奖励（可选）。 */
  itemRewards?: string[]
}
export interface ChoiceDef {
  id: string
  battleId: string
  /** 说话人（复用程序化头像查找）。 */
  speaker: string
  prompt: string
  options: ChoiceOption[]
}

export const battleChoices: Record<string, ChoiceDef> = {
  xuzhou_post: {
    id: 'xuzhou_post', battleId: 'xuzhou', speaker: '荀彧',
    prompt: '陶谦已死，徐州已定。城中将士请示：如何处置徐州军民？',
    options: [
      { label: '出安民告示，秋毫无犯（仁）', morality: 1 },
      { label: '纵兵屠城，为父报仇（暴）', morality: -1, itemRewards: ['mingguang_armor'] },
    ],
  },
  wancheng_post: {
    id: 'wancheng_post', battleId: 'wancheng', speaker: '曹操',
    prompt: '张绣已降，宛城已定。其部曲降卒数千，如何处置？',
    options: [
      { label: '抚恤降卒，收编为己用（仁）', morality: 1 },
      { label: '尽诛张绣旧部，以绝后患（暴）', morality: -1 },
    ],
  },
  xiapi_post: {
    id: 'xiapi_post', battleId: 'xiapi', speaker: '刘备',
    prompt: '白门楼上，吕布被缚，怒视刘备："大耳儿最叵信！"如何处置吕布？',
    options: [
      { label: '斩之，以正军法（仁）', morality: 1 },
      { label: '惜其勇武，招揽为己用（暴）', morality: -1 },
    ],
  },
}

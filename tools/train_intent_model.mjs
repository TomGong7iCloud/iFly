// iFly · 意图识别小模型训练脚本
//
// 模型结构：字符 n-gram（1-gram + 2-gram，带边界标记）做 L2 归一化特征，
// 使用多分类 softmax 回归（线性模型 + L2 正则）分别训练两个分类器：
//   1) intent 分类器：greet / add / delete / modify / query / unsupported / negated / none
//   2) yesno  分类器：yes / no（用于确认阶段）
//
// 运行方式：node tools/train_intent_model.mjs
// 输出：js/nlp/intent_model.json（权重 + 词表）

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../js/nlp/intent_model.json');

// ==================== 语料库（自然语言话术） ====================
// 每个意图覆盖不同措辞、口语化变体、省略、歧义表达，使模型学习语义而非关键词

const INTENT_CORPUS = [
  // ---------- greet 问候 ----------
  { text: '你好', label: 'greet' },
  { text: '您好', label: 'greet' },
  { text: '你好呀', label: 'greet' },
  { text: '你好啊', label: 'greet' },
  { text: '您好呀', label: 'greet' },
  { text: '哈喽', label: 'greet' },
  { text: '嗨', label: 'greet' },
  { text: '在吗', label: 'greet' },
  { text: '在不在', label: 'greet' },
  { text: '在么', label: 'greet' },
  { text: '在嘛', label: 'greet' },
  { text: '早上好', label: 'greet' },
  { text: '下午好', label: 'greet' },
  { text: '晚上好', label: 'greet' },
  { text: '早安', label: 'greet' },
  { text: '午安', label: 'greet' },
  { text: '晚安', label: 'greet' },
  { text: 'hi', label: 'greet' },
  { text: 'hello', label: 'greet' },
  { text: 'hey', label: 'greet' },
  { text: '你好，想咨询一下', label: 'greet' },
  { text: '你好呀，帮个忙', label: 'greet' },
  { text: '哈喽在吗', label: 'greet' },
  { text: '嗨你好', label: 'greet' },

  // ---------- add 添加航班 ----------
  { text: '添加', label: 'add' },
  { text: '录入', label: 'add' },
  { text: '登记', label: 'add' },
  { text: '记一下', label: 'add' },
  { text: '记录 某日 某航班 某地到某地', label: 'add' },
  { text: '添加 某航班 某地到某地 某日', label: 'add' },
  { text: '新增一条航班 某航班 某地到某地', label: 'add' },
  { text: '帮我记一下 某航班 某地到某地 某日', label: 'add' },
  { text: '录入 某航班 某地飞某地 某日', label: 'add' },
  { text: '登记 某航班 从某地到某地 某日', label: 'add' },
  { text: '加一条 某航班 某地到某地', label: 'add' },
  { text: '记一笔 某航班 某地到某地 某日 某机型 某时长', label: 'add' },
  { text: '我要添加 某航班 某地到某地 某日', label: 'add' },
  { text: '帮我添加一条航班 某航班', label: 'add' },
  { text: '记一下 昨天 某航班 某地到某地', label: 'add' },
  { text: '某日 某航班 某地到某地', label: 'add' },
  { text: '添加航班 某航班 某地到某地', label: 'add' },
  { text: '记录航班 某航班 某地到某地 某日 某机型 某时长', label: 'add' },
  { text: '帮我记录 某航班 从某地到某地', label: 'add' },
  { text: '新加 某航班 某地到某地', label: 'add' },
  { text: '登记一条航班 某航班 某地到某地 某日', label: 'add' },
  { text: '记录一条 某航班 某地飞某地 某日', label: 'add' },
  { text: '帮我记下 某航班 某地到某地', label: 'add' },
  { text: '添加 某航班 某地飞某地 明天', label: 'add' },
  { text: '录入一条 某航班 某地到某地 某日', label: 'add' },
  { text: '帮我登记 某航班 某地到某地', label: 'add' },
  { text: '把 某航班 记录到我的航班里', label: 'add' },
  { text: '新增 某航班 某地到某地 某日', label: 'add' },
  { text: '记录 某日 某地到某地 某航班', label: 'add' },
  { text: '帮我添加 某航班 某地到某地', label: 'add' },
  { text: '加一条航班记录 某航班', label: 'add' },
  { text: '记一笔航班 某航班 某地到某地', label: 'add' },
  { text: '记录一下 某航班 某地到某地', label: 'add' },
  { text: '登记航班 某航班 某地到某地 某日', label: 'add' },
  { text: '添加一条 某航班 从某地到某地', label: 'add' },
  { text: '帮我记一条 某航班 某地到某地 某日', label: 'add' },
  { text: '记录 某日 某航班 某地飞某地 某机型', label: 'add' },
  { text: '录入航班 某航班 某地到某地 某时长', label: 'add' },
  { text: '添加 某航班 某地到某地 日期某日', label: 'add' },
  { text: '记一下 某航班 某地到某地 明天', label: 'add' },
  { text: '登记 某航班 某地到某地', label: 'add' },
  { text: '我要记一条 某航班 某地到某地 某日', label: 'add' },
  { text: '帮我录入 某航班 某地到某地', label: 'add' },
  { text: '加一条 某航班 从某地到某地', label: 'add' },
  { text: '记录 某航班 某地到某地', label: 'add' },
  { text: '新增一条 某航班 某地到某地', label: 'add' },
  { text: '帮我登记一条航班 某航班', label: 'add' },
  { text: '添加 某航班 某地到某地 明天下午', label: 'add' },
  { text: '记录一条 某航班 某地到某地', label: 'add' },
  { text: '把 某航班 某地到某地记一下', label: 'add' },
  { text: '帮我加一条 某航班 某地到某地的航班', label: 'add' },
  { text: '我坐过 某航班 某地到某地，帮我记下来', label: 'add' },
  // 强化「记下/记一下」等添加动词信号，使其在具体航班号/城市为未知词时仍能判定为添加
  { text: '帮我记下这条航班', label: 'add' },
  { text: '记下这条航班', label: 'add' },
  { text: '记一下这个航班', label: 'add' },
  { text: '帮我记个航班', label: 'add' },
  { text: '记个航班 某地到某地', label: 'add' },
  { text: '帮我记一下这条航班记录', label: 'add' },

  // ---------- delete 删除航班 ----------
  { text: '删除 某航班', label: 'delete' },
  { text: '删掉 某航班', label: 'delete' },
  { text: '把 某航班 删了', label: 'delete' },
  { text: '移除 某航班', label: 'delete' },
  { text: '清除 某航班', label: 'delete' },
  { text: '帮我删除 某航班', label: 'delete' },
  { text: '删了 某航班', label: 'delete' },
  { text: '删除 某日 某地到某地 的航班', label: 'delete' },
  { text: '删掉那条 某航班', label: 'delete' },
  { text: '帮我删一下 某航班', label: 'delete' },
  { text: '把某地到某地的航班删掉', label: 'delete' },
  { text: '删除这条航班', label: 'delete' },
  { text: '删掉 某航班 这条', label: 'delete' },
  { text: '移除这条记录', label: 'delete' },
  { text: '帮我删除某地到某地的航班', label: 'delete' },
  { text: '删除 某日 的航班', label: 'delete' },
  { text: '把 某航班 这条记录删掉', label: 'delete' },
  { text: '删除航班 某航班', label: 'delete' },
  { text: '删掉 某日 某地到某地', label: 'delete' },
  { text: '清除这条航班记录', label: 'delete' },
  { text: '帮我移除 某航班', label: 'delete' },
  { text: '删了它', label: 'delete' },
  { text: '把这条删了', label: 'delete' },
  { text: '删除某地到某地 某日 的航班', label: 'delete' },
  { text: '删掉 某航班 吧', label: 'delete' },
  { text: '帮我删除这条', label: 'delete' },
  { text: '移除 某航班 这条记录', label: 'delete' },
  { text: '删除 某航班 这条航班', label: 'delete' },
  { text: '把 某航班 移除', label: 'delete' },
  { text: '删掉这个航班', label: 'delete' },
  { text: '取消掉 某航班 这条记录', label: 'delete' },
  { text: '把 某航班 从记录里删掉', label: 'delete' },
  { text: '帮我删掉某地到某地的航班', label: 'delete' },
  { text: '这条航班不要了帮我删掉', label: 'delete' },

  // ---------- modify 修改航班 ----------
  { text: '修改 某航班 的日期', label: 'modify' },
  { text: '把 某航班 的机型改成 某机型', label: 'modify' },
  { text: '更改 某航班 的日期', label: 'modify' },
  { text: '更新 某航班 的时长', label: 'modify' },
  { text: '某航班 的机型换成 某机型', label: 'modify' },
  { text: '帮我修改 某航班 的日期', label: 'modify' },
  { text: '把 某航班 改成 某机型', label: 'modify' },
  { text: '编辑 某航班 的日期', label: 'modify' },
  { text: '调整 某航班 的时长', label: 'modify' },
  { text: '变更 某航班 的日期', label: 'modify' },
  { text: '帮我把 某航班 的机型改一下', label: 'modify' },
  { text: '改一下 某航班 的日期', label: 'modify' },
  { text: '把 某航班 的日期改为 某日', label: 'modify' },
  { text: '修改 某航班 的机型为 某机型', label: 'modify' },
  { text: '把 某航班 的时长改成 某时长', label: 'modify' },
  { text: '某航班 的日期改为 某日', label: 'modify' },
  { text: '帮我把 某航班 的日期改成 某日', label: 'modify' },
  { text: '修改 某航班 的机型', label: 'modify' },
  { text: '更新 某航班 的日期为 某日', label: 'modify' },
  { text: '把 某航班 的机型换成 某机型', label: 'modify' },
  { text: '改一下 某航班 的机型', label: 'modify' },
  { text: '某航班 的机型改成 某机型', label: 'modify' },
  { text: '帮我把 某航班 的时长改为 某时长', label: 'modify' },
  { text: '修改 某航班 的航线', label: 'modify' },
  { text: '把 某航班 的日期改一下', label: 'modify' },
  { text: '变更 某航班 的机型', label: 'modify' },
  { text: '调整 某航班 的日期到 某日', label: 'modify' },
  { text: '帮我把 某航班 改成 某机型', label: 'modify' },
  { text: '修改 某航班 的时长', label: 'modify' },
  { text: '编辑 某航班 的机型', label: 'modify' },
  { text: '把 某航班 的出发地改成某地', label: 'modify' },
  { text: '把 某航班 的目的地改为某地', label: 'modify' },
  { text: '帮我把 某航班 的日期和机型改一下', label: 'modify' },

  // ---------- query 查询航班 ----------
  { text: '查一下我的航班', label: 'query' },
  { text: '查询 某航班', label: 'query' },
  { text: '看看我的航班记录', label: 'query' },
  { text: '我的航班有哪些', label: 'query' },
  { text: '列出所有航班', label: 'query' },
  { text: '查一下 某航班', label: 'query' },
  { text: '显示我的航班', label: 'query' },
  { text: '有没有 某航班', label: 'query' },
  { text: '我的航班记录有哪些', label: 'query' },
  { text: '查查某地到某地的航班', label: 'query' },
  { text: '看看有哪些航班', label: 'query' },
  { text: '全部航班', label: 'query' },
  { text: '显示所有航班', label: 'query' },
  { text: '我飞过哪些航班', label: 'query' },
  { text: '查一下 某日 的航班', label: 'query' },
  { text: '查询某地到某地的航班', label: 'query' },
  { text: '我的所有航班', label: 'query' },
  { text: '帮我查一下 某航班', label: 'query' },
  { text: '看看 某航班', label: 'query' },
  { text: '查一下我的航班记录', label: 'query' },
  { text: '列出我的航班', label: 'query' },
  { text: '有哪些航班', label: 'query' },
  { text: '查一下某地到某地的航班', label: 'query' },
  { text: '显示 某航班 的航班', label: 'query' },
  { text: '查看我的航班', label: 'query' },
  { text: '查询所有航班', label: 'query' },
  { text: '帮我看看我的航班', label: 'query' },
  { text: '查一下 某日 某地到某地', label: 'query' },
  { text: '我的航班记录', label: 'query' },
  { text: '查 某航班', label: 'query' },
  { text: '看看我记过哪些航班', label: 'query' },
  { text: '给我看看航班列表', label: 'query' },

  // ---------- unsupported 超出能力范围 ----------
  { text: '帮我订票', label: 'unsupported' },
  { text: '我要买票', label: 'unsupported' },
  { text: '改签 某航班', label: 'unsupported' },
  { text: '退票', label: 'unsupported' },
  { text: '帮我值机', label: 'unsupported' },
  { text: '选个座位', label: 'unsupported' },
  { text: '帮我选座', label: 'unsupported' },
  { text: '托运行李', label: 'unsupported' },
  { text: '查询航班延误', label: 'unsupported' },
  { text: '今天的天气怎么样', label: 'unsupported' },
  { text: '帮我抢票', label: 'unsupported' },
  { text: '贵宾厅怎么走', label: 'unsupported' },
  { text: '登机口是几号', label: 'unsupported' },
  { text: '我的里程有多少', label: 'unsupported' },
  { text: '查一下积分', label: 'unsupported' },
  { text: '航班状态', label: 'unsupported' },
  { text: '帮我改签', label: 'unsupported' },
  { text: '我要退票', label: 'unsupported' },
  { text: '值机选座', label: 'unsupported' },
  { text: '行李托运怎么办理', label: 'unsupported' },
  { text: '某航班 延误了吗', label: 'unsupported' },
  { text: '明天天气如何', label: 'unsupported' },
  { text: '我的积分有多少', label: 'unsupported' },
  { text: '怎么积累里程', label: 'unsupported' },
  { text: '帮我订一张机票', label: 'unsupported' },
  { text: '买一张 某航班 的票', label: 'unsupported' },
  { text: '改签一下 某航班', label: 'unsupported' },
  { text: '退掉 某航班 的票', label: 'unsupported' },
  { text: '帮我办理值机', label: 'unsupported' },
  { text: '选个靠窗的座位', label: 'unsupported' },
  { text: '登机口在哪里', label: 'unsupported' },
  { text: '航班什么时候登机', label: 'unsupported' },
  { text: '托运几件行李', label: 'unsupported' },
  { text: '贵宾厅能用吗', label: 'unsupported' },

  // ---------- negated 否定（阻止操作） ----------
  { text: '不要删除 某航班', label: 'negated' },
  { text: '别删 某航班', label: 'negated' },
  { text: '不用修改', label: 'negated' },
  { text: '别改了', label: 'negated' },
  { text: '先别删除', label: 'negated' },
  { text: '不要添加', label: 'negated' },
  { text: '算了别删了', label: 'negated' },
  { text: '不用删 某航班', label: 'negated' },
  { text: '别改 某航班', label: 'negated' },
  { text: '不删除 某航班', label: 'negated' },
  { text: '先不删', label: 'negated' },
  { text: '不要改 某航班', label: 'negated' },
  { text: '别删除', label: 'negated' },
  { text: '不用添加了', label: 'negated' },
  { text: '不要删除这条', label: 'negated' },
  { text: '别动 某航班', label: 'negated' },
  { text: '先别改', label: 'negated' },
  { text: '不修改了', label: 'negated' },
  { text: '别删了', label: 'negated' },
  { text: '不用改 某航班', label: 'negated' },
  { text: '不要改', label: 'negated' },

  // ---------- none 无明确意图 ----------
  { text: '今天天气不错', label: 'none' },
  { text: '讲个笑话', label: 'none' },
  { text: '你叫什么名字', label: 'none' },
  { text: '随便聊聊', label: 'none' },
  { text: '谢谢', label: 'none' },
  { text: '好的', label: 'none' },
  { text: '嗯嗯', label: 'none' },
  { text: '啊', label: 'none' },
  { text: '帮我想想', label: 'none' },
  { text: '这个怎么用', label: 'none' },
  { text: '你是谁', label: 'none' },
  { text: '你能做什么', label: 'none' },
  { text: '算了', label: 'none' },
  { text: '哦', label: 'none' },
  { text: '嗯', label: 'none' },
  { text: '知道了', label: 'none' },
  { text: '再见了', label: 'none' },
  { text: '拜拜', label: 'none' },
  { text: '不用了', label: 'none' },
  { text: '没事', label: 'none' },
  { text: '哈哈', label: 'none' },
  { text: '有意思', label: 'none' },
  { text: '这样啊', label: 'none' },
  { text: '原来如此', label: 'none' },
  { text: '明白了', label: 'none' },
  { text: 'ok', label: 'none' },
  { text: 'fine', label: 'none' },
  { text: '随便', label: 'none' },
  // 确认/应和词：确认阶段由 yesno 分类器处理，闲时出现应视为「无意图」，
  // 避免被误判为 greet（如「好」此前被判成问候）。
  { text: '好', label: 'none' },
  { text: '行', label: 'none' },
  { text: '可以', label: 'none' },
  { text: '对', label: 'none' },
  { text: '好呀', label: 'none' },
  { text: '行啊', label: 'none' },
  { text: '没问题', label: 'none' },
];

const YESNO_CORPUS = [
  // ---------- yes 确认 ----------
  { text: '是', label: 'yes' },
  { text: '是的', label: 'yes' },
  { text: '对', label: 'yes' },
  { text: '对的', label: 'yes' },
  { text: '好', label: 'yes' },
  { text: '好的', label: 'yes' },
  { text: '可以', label: 'yes' },
  { text: '行', label: 'yes' },
  { text: '行吧', label: 'yes' },
  { text: '嗯', label: 'yes' },
  { text: '嗯嗯', label: 'yes' },
  { text: '没错', label: 'yes' },
  { text: '确定', label: 'yes' },
  { text: '确认', label: 'yes' },
  { text: '同意', label: 'yes' },
  { text: '好呀', label: 'yes' },
  { text: '没问题', label: 'yes' },
  { text: '就这样', label: 'yes' },
  { text: '就这么办', label: 'yes' },
  { text: '可以啊', label: 'yes' },
  { text: '行啊', label: 'yes' },
  { text: '对呀', label: 'yes' },
  { text: 'ok', label: 'yes' },
  { text: 'yes', label: 'yes' },
  { text: 'y', label: 'yes' },
  { text: '确定添加', label: 'yes' },
  { text: '确认添加', label: 'yes' },
  { text: '没问题', label: 'yes' },
  { text: '好的吧', label: 'yes' },
  { text: '行呢', label: 'yes' },
  { text: '没问题，添加吧', label: 'yes' },
  { text: '确认无误', label: 'yes' },
  { text: '对，就这样', label: 'yes' },

  // ---------- no 否定 ----------
  { text: '不', label: 'no' },
  { text: '不是', label: 'no' },
  { text: '否', label: 'no' },
  { text: '不对', label: 'no' },
  { text: '不要', label: 'no' },
  { text: '不用', label: 'no' },
  { text: '别', label: 'no' },
  { text: '算了', label: 'no' },
  { text: '取消', label: 'no' },
  { text: '不要了', label: 'no' },
  { text: '不行', label: 'no' },
  { text: 'no', label: 'no' },
  { text: 'n', label: 'no' },
  { text: '取消吧', label: 'no' },
  { text: '不确认', label: 'no' },
  { text: '先不', label: 'no' },
  { text: '先不用', label: 'no' },
  { text: '再想想', label: 'no' },
  { text: '暂时不', label: 'no' },
  { text: '不了', label: 'no' },
  { text: '不必', label: 'no' },
  { text: '不需要', label: 'no' },
  { text: '不可以', label: 'no' },
  { text: '算了算了', label: 'no' },
  { text: '先取消', label: 'no' },
  { text: '不添加', label: 'no' },
  { text: '别加了', label: 'no' },
  { text: '不要了谢谢', label: 'no' },
  { text: '取消掉', label: 'no' },
  { text: '先取消吧', label: 'no' },
  { text: '不用了，取消吧', label: 'no' },
];

// ==================== 语义角色语料（出发/到达/无） ====================
// 每个样本是「机场提及的完整上下文」，用 '@' 占位该机场提及本身，即 before + '@' + after。
// 模型据此学习方位词相对提及的位置，从而理解真实语义：
//   - from：方位词在 '@' 前为出发类（从/由/自），或在 '@' 后为到达/出发类（@到/@飞往/@出发…）
//   - to  ：方位词在 '@' 前为到达类（到/飞往/前往/去/飞…）
//   - none：附近无方位词
// 例如「从某地到某地」：某地 →「从@到某地」=from，某地 →「从某地到@」=to。
// 关键：'@' 把方位词在提及「前」还是「后」编码进 2-gram，从而区分「@到」(from) 与「到@」(to)。
const ROLE_CORPUS = [
  // ---------- from（提及为出发地） ----------
  { text: '从@', label: 'from' },
  { text: '由@', label: 'from' },
  { text: '自@', label: 'from' },
  { text: '我要从@', label: 'from' },
  { text: '我打算从@', label: 'from' },
  { text: '我准备从@', label: 'from' },
  { text: '计划从@', label: 'from' },
  { text: '今天从@', label: 'from' },
  { text: '明天从@', label: 'from' },
  { text: '某日从@', label: 'from' },
  { text: '下个月从@', label: 'from' },
  { text: '去年从@', label: 'from' },
  { text: '从@到某地', label: 'from' },
  { text: '@到', label: 'from' },
  { text: '@到某地', label: 'from' },
  { text: '@到某地', label: 'from' },
  { text: '@到某地', label: 'from' },
  { text: '@至', label: 'from' },
  { text: '@至某地', label: 'from' },
  { text: '@飞', label: 'from' },
  { text: '@飞某地', label: 'from' },
  { text: '@飞某地', label: 'from' },
  { text: '@飞往', label: 'from' },
  { text: '@飞往某地', label: 'from' },
  { text: '@前往', label: 'from' },
  { text: '@前往某地', label: 'from' },
  { text: '@出发', label: 'from' },
  { text: '@出发到某地', label: 'from' },
  // 带噪声的完整上下文：真实输入中「@」前后常伴随航班号/机型/日期/时长，
  // 训练模型聚焦于「@」紧邻的方位词，而非被周边噪声干扰。
  { text: '记录 某日 某航班 @到某地 某机型 某时长', label: 'from' },
  { text: '帮我记一下 某航班 @飞往某地 某日', label: 'from' },
  { text: '某航班 @到某地 某日', label: 'from' },
  { text: '记录 @到某地 某机型', label: 'from' },
  { text: '添加 某航班 @飞某地 某时长', label: 'from' },
  { text: '登记 某日 @到某地 某机型', label: 'from' },

  // ---------- to（提及为到达地） ----------
  { text: '到@', label: 'to' },
  { text: '至@', label: 'to' },
  { text: '抵@', label: 'to' },
  { text: '飞往@', label: 'to' },
  { text: '前往@', label: 'to' },
  { text: '去往@', label: 'to' },
  { text: '到达@', label: 'to' },
  { text: '飞向@', label: 'to' },
  { text: '抵达@', label: 'to' },
  { text: '去@', label: 'to' },
  { text: '飞@', label: 'to' },
  { text: '@到达', label: 'to' },
  { text: '@抵达', label: 'to' },
  { text: '去年到@', label: 'to' },
  { text: '某地到@', label: 'to' },
  { text: '某地到@', label: 'to' },
  { text: '某地到@', label: 'to' },
  { text: '某地到@', label: 'to' },
  { text: '从某地到@', label: 'to' },
  { text: '从某地到@', label: 'to' },
  { text: '由某地到@', label: 'to' },
  { text: '从某地飞@', label: 'to' },
  { text: '从某地飞@', label: 'to' },
  // 带噪声的完整上下文（到达地）
  { text: '记录 某日 某航班 某地到@ 某机型 某时长', label: 'to' },
  { text: '帮我记一下 某航班 某地飞往@ 某日', label: 'to' },
  { text: '某航班 某地到@ 某日', label: 'to' },
  { text: '记录 某地到@ 某机型', label: 'to' },
  { text: '添加 某航班 某地飞@ 某时长', label: 'to' },
  { text: '登记 某日 某地到@ 某机型', label: 'to' },

  // ---------- none（附近无方位词） ----------
  { text: '@', label: 'none' },
  { text: '某地@', label: 'none' },
  { text: '某地@', label: 'none' },
  { text: '@某地', label: 'none' },
  { text: '@某地', label: 'none' },
  { text: '去年@', label: 'none' },
  { text: '去年夏天@', label: 'none' },
  { text: '去年5月@', label: 'none' },
  { text: '飞机@', label: 'none' },
  { text: '坐飞机@', label: 'none' },
  { text: '@的航班', label: 'none' },
  { text: '今天@', label: 'none' },
  { text: '我要@', label: 'none' },
  { text: '请问@', label: 'none' },
  // 带噪声的完整上下文（无方位词）
  // 关键：@ 前后只有航班号/机型/日期/时长等实体噪声、没有方位词时，必须是 none，
  // 与 from/to 的带噪样本形成对照，避免模型因「记录/登记」等动词前缀误判方向。
  { text: '记录 某日 某航班 @ 某机型 某时长', label: 'none' },
  { text: '某航班 @ 某日', label: 'none' },
  { text: '帮我记一下 某航班 @', label: 'none' },
  { text: '记录 某航班 @ 某机型', label: 'none' },
  { text: '登记 某日 某航班 @ 某时长', label: 'none' },
  { text: '添加 某航班 @ 某日', label: 'none' },
  { text: '记录 某日 @ 某地', label: 'none' },
  { text: '帮我记录 某航班 @ 某日', label: 'none' },
  { text: '录入 某航班 @ 某机型 某时长', label: 'none' },
];

// ==================== 特征工程（与运行时保持一致） ====================
// 注意：'@' 是语义角色分类中「机场提及位置」的占位符，必须保留。
function normalize(text) {
  return String(text).toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/[^\u4e00-\u9fa5a-z#@]/g, '');
}

function tokenize(text) {
  const s = '^' + normalize(text) + '$';
  const toks = [];
  for (let i = 0; i < s.length; i++) toks.push(s[i]);
  for (let i = 0; i < s.length - 1; i++) toks.push(s.slice(i, i + 2));
  return toks;
}

function buildVocab(corpus, minCount) {
  const counts = {};
  for (const { text } of corpus) {
    for (const tk of tokenize(text)) counts[tk] = (counts[tk] || 0) + 1;
  }
  const vocab = {};
  let idx = 0;
  for (const [tk, c] of Object.entries(counts)) {
    if (c >= minCount) vocab[tk] = idx++;
  }
  return vocab;
}

function featurize(text, vocab) {
  const counts = {};
  for (const tk of tokenize(text)) {
    const idx = vocab[tk];
    if (idx != null) counts[idx] = (counts[idx] || 0) + 1;
  }
  let norm = 0;
  for (const k in counts) norm += counts[k] * counts[k];
  norm = Math.sqrt(norm);
  const vec = {};
  if (norm > 0) for (const k in counts) vec[k] = counts[k] / norm;
  return vec;
}

// ==================== 训练（softmax 回归，全批量梯度下降 + L2） ====================
function train(corpus, labels, vocab, opts = {}) {
  const lr = opts.lr ?? 0.5;
  const epochs = opts.epochs ?? 1000;
  const lambda = opts.lambda ?? 1e-3;

  const D = Object.keys(vocab).length;
  const K = labels.length;
  const labelIdx = {};
  labels.forEach((l, i) => (labelIdx[l] = i));

  const X = corpus.map(({ text }) => featurize(text, vocab));
  const Y = corpus.map(({ label }) => labelIdx[label]);

  const W = Array.from({ length: K }, () => new Array(D).fill(0));
  const b = new Array(K).fill(0);

  for (let ep = 0; ep < epochs; ep++) {
    const dW = Array.from({ length: K }, () => new Map());
    const db = new Array(K).fill(0);
    let loss = 0;

    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      const logits = new Array(K);
      let max = -Infinity;
      for (let k = 0; k < K; k++) {
        let s = b[k];
        const row = W[k];
        for (const idx in x) s += row[idx] * x[idx];
        logits[k] = s;
        if (s > max) max = s;
      }
      let sum = 0;
      const p = new Array(K);
      for (let k = 0; k < K; k++) { p[k] = Math.exp(logits[k] - max); sum += p[k]; }
      for (let k = 0; k < K; k++) p[k] /= sum;

      loss -= Math.log(p[Y[i]] + 1e-12);

      for (let k = 0; k < K; k++) {
        const err = p[k] - (Y[i] === k ? 1 : 0);
        db[k] += err;
        const dwk = dW[k];
        for (const idx in x) {
          const j = Number(idx);
          dwk.set(j, (dwk.get(j) || 0) + err * x[idx]);
        }
      }
    }

    for (let k = 0; k < K; k++) {
      b[k] -= (lr * db[k]) / X.length;
      const row = W[k];
      for (let j = 0; j < D; j++) row[j] *= (1 - lr * lambda); // L2 权重衰减
      const dwk = dW[k];
      for (const [j, g] of dwk) row[j] -= (lr * g) / X.length;
    }

    if (ep % 200 === 0) {
      console.log(`  epoch ${ep}  loss=${(loss / X.length).toFixed(4)}`);
    }
  }

  return { W, b };
}

// ==================== 推理 & 自测 ====================
function predict(model, labels, vocab, text) {
  const x = featurize(text, vocab);
  const K = labels.length;
  const logits = new Array(K);
  let max = -Infinity;
  for (let k = 0; k < K; k++) {
    let s = model.b[k];
    const row = model.W[k];
    for (const idx in x) s += row[idx] * x[idx];
    logits[k] = s;
    if (s > max) max = s;
  }
  let sum = 0;
  const probs = new Array(K);
  for (let k = 0; k < K; k++) { probs[k] = Math.exp(logits[k] - max); sum += probs[k]; }
  for (let k = 0; k < K; k++) probs[k] /= sum;
  let best = 0;
  for (let k = 1; k < K; k++) if (probs[k] > probs[best]) best = k;
  return { label: labels[best], confidence: probs[best], probs };
}

function accuracy(corpus, model, labels, vocab) {
  let ok = 0;
  for (const { text, label } of corpus) {
    if (predict(model, labels, vocab, text).label === label) ok++;
  }
  return ok / corpus.length;
}

function roundArr(arr, d = 5) {
  const f = 10 ** d;
  return arr.map((v) => Math.round(v * f) / f);
}

function roundW(W, d = 5) {
  return W.map((row) => roundArr(row, d));
}

// ==================== 主流程 ====================
console.log('构建词表 ...');
const vocab = buildVocab([...INTENT_CORPUS, ...YESNO_CORPUS, ...ROLE_CORPUS], 2);
console.log(`词表大小：${Object.keys(vocab).length}`);

const INTENT_LABELS = ['greet', 'add', 'delete', 'modify', 'query', 'unsupported', 'negated', 'none'];
const YESNO_LABELS = ['yes', 'no'];
const ROLE_LABELS = ['from', 'to', 'none'];

console.log('训练 intent 分类器 ...');
const intentModel = train(INTENT_CORPUS, INTENT_LABELS, vocab);
console.log('训练 yesno 分类器 ...');
const yesnoModel = train(YESNO_CORPUS, YESNO_LABELS, vocab);
console.log('训练 role 分类器 ...');
const roleModel = train(ROLE_CORPUS, ROLE_LABELS, vocab);

console.log('\nintent 训练准确率：', (accuracy(INTENT_CORPUS, intentModel, INTENT_LABELS, vocab) * 100).toFixed(2) + '%');
console.log('yesno  训练准确率：', (accuracy(YESNO_CORPUS, yesnoModel, YESNO_LABELS, vocab) * 100).toFixed(2) + '%');
console.log('role   训练准确率：', (accuracy(ROLE_CORPUS, roleModel, ROLE_LABELS, vocab) * 100).toFixed(2) + '%');

// 自测：用部分未见过的表述验证泛化能力
const SELF_TESTS = [
  ['帮我记下 CA123 北京到上海 5月1日', 'add'],
  ['把 CA123 这条航班删了吧', 'delete'],
  ['CA123 的机型给我换成 A350', 'modify'],
  ['给我看看我的航班都有啥', 'query'],
  ['帮我订一张去上海的机票', 'unsupported'],
  ['先别删那条', 'negated'],
  ['吃了吗', 'none'],
  ['哈喽，你好', 'greet'],
  ['好', 'none'],
  ['行', 'none'],
  ['可以', 'none'],
  ['对', 'none'],
];

console.log('\n自测（未见过的表述 · intent）：');
for (const [text, want] of SELF_TESTS) {
  const r = predict(intentModel, INTENT_LABELS, vocab, text);
  const ok = r.label === want ? 'OK ' : 'MISS';
  console.log(`  [${ok}] "${text}" -> intent=${r.label}(${(r.confidence * 100).toFixed(0)}%)`);
}

const YESNO_SELF_TESTS = [
  ['好的，没问题', 'yes'],
  ['不用了，先取消', 'no'],
  ['好', 'yes'],
  ['行', 'yes'],
  ['可以', 'yes'],
  ['对', 'yes'],
];
console.log('\n自测（未见过的表述 · yesno）：');
for (const [text, want] of YESNO_SELF_TESTS) {
  const y = predict(yesnoModel, YESNO_LABELS, vocab, text);
  const ok = y.label === want ? 'OK ' : 'MISS';
  console.log(`  [${ok}] "${text}" -> yesno=${y.label}(${(y.confidence * 100).toFixed(0)}%)`);
}

// 语义角色自测：验证前缀 → 出发/到达/无
const ROLE_SELF_TESTS = [
  ['从@', 'from'],
  ['由@', 'from'],
  ['我要从@', 'from'],
  ['@到', 'from'],
  ['@到上海', 'from'],
  ['@出发到上海', 'from'],
  ['从@到上海', 'from'],
  ['@至', 'from'],
  ['@至上海', 'from'],
  ['到@', 'to'],
  ['至@', 'to'],
  ['飞往@', 'to'],
  ['去@', 'to'],
  ['从北京到@', 'to'],
  ['从北京飞@', 'to'],
  ['去年@', 'none'],
  ['飞机@', 'none'],
  ['北京@', 'none'],
  ['@', 'none'],
  ['记录 5月1日 CA123 @到上海 A321 2小时45分', 'from'],
  ['记录 5月1日 CA123 北京到@ A321 2小时45分', 'to'],
  ['记录 5月1日 CA123 @ A321 2小时45分', 'none'],
];
console.log('\n语义角色自测（上下文+@占位 → 角色）：');
for (const [text, want] of ROLE_SELF_TESTS) {
  const r = predict(roleModel, ROLE_LABELS, vocab, text);
  const ok = r.label === want ? 'OK ' : 'MISS';
  console.log(`  [${ok}] "${text}" -> role=${r.label}(${(r.confidence * 100).toFixed(0)}%)`);
}

const out = {
  vocab,
  intent: { labels: INTENT_LABELS, W: roundW(intentModel.W), b: roundArr(intentModel.b) },
  yesno: { labels: YESNO_LABELS, W: roundW(yesnoModel.W), b: roundArr(yesnoModel.b) },
  role: { labels: ROLE_LABELS, W: roundW(roleModel.W), b: roundArr(roleModel.b) },
  threshold: 0.5,
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(out));
console.log(`\n模型已保存：${OUT_PATH}`);
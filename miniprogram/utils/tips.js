// Secondary explanations open from a circled "?" instead of sitting on the page.
// WXML: <text class="tip-btn" data-tip="treehole" bindtap="showTip">?</text>
const tips = {
  treehole: { title: '树洞说明', content: '同区同学只能看到你的化名；平台保存账号关联，用于审核和追溯。投稿与回复都由老师审核后才公开。请不要留下姓名、学校、电话等个人信息。' },
  service: { title: '关于支持需求', content: '这里不是即时咨询或紧急救援渠道。面临即时危险时，请立即联系信任的成人与当地紧急服务。提交需求不代表外部机构已接单或预约成功。' },
  serviceRecords: { title: '处理状态', content: '工作人员查看并跟进后，状态会更新为“已跟进”，并附上处理说明。下拉页面可以刷新。' },
  starmap: { title: '星图怎么看', content: '展示出现最多的 12 个标签。点击一颗星可回到相关日记；连线表示两个标签在同一篇日记中出现，不表示因果关系。' },
  moodAverage: { title: '心情均值', content: '只汇总你自愿在日记中记录的心情，不与每日打卡的关怀提示混用。' },
  journalPrivacy: { title: '仅自己可见', content: '文字、标签与星图关系都属于你的私人空间，老师和同学都看不到。' },
  articleTools: { title: '成长工具', content: '选择一个工具，开始记录、现状自评或月度回顾。所有内容直接在小程序内完成，观察结果仅本人可见。' },
  tool: { title: '关于成长观察', content: '所有记录与结果仅属于你本人，不作为心理或医学诊断。需要帮助时，请与可信任的成人或专业人员讨论。' },
  checkin: { title: '关于心情记录', content: '每天一份记录，再次提交会更新今天的心情。备注仅自己可见；心情分数与日期可供区域老师进行关怀。' },
  explore: { title: '探索说明', content: '观察记录、成长现状自评和需求反馈都可以在小程序内完成。回顾用于了解自己，不作为心理或医学诊断。' },
  forgotPassword: { title: '忘记密码', content: '请联系本校老师在后台重置。重置后第一次登录，需要设置一个只有自己知道的新密码。还没有账号？切换到“邀请码注册”。' },
  invite: { title: '学校邀请码', content: '邀请码决定你加入哪所学校，请向本校老师索取。核对学校后再设置账号和密码。' },
  loginPrivacy: { title: '隐私说明', content: '日记与心情备注仅本人可见；老师可查看心情分数用于关怀。未成年人请与监护人共同了解学校的数据使用安排。' }
};

function showTip(event) {
  const tip = tips[event.currentTarget.dataset.tip];
  if (!tip) return;
  wx.showModal({ title: tip.title, content: tip.content, showCancel: false, confirmText: '知道了', confirmColor: '#245c45' });
}

module.exports = { tips, showTip };

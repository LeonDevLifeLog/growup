from bs4 import BeautifulSoup
from pathlib import Path
import json,re,copy
base=Path('docs/evidence/native-migration')
def soup(slug):return BeautifulSoup((base/(slug+'.html')).read_text(),'html.parser')
def clean(s):return re.sub(r'\s+',' ',s).strip().replace(' *','')
def label(e):
 h=e.find_previous(['label','h4','h3','h2']);return clean(h.get_text(' ',strip=True)) if h else ''
def section(e):
 h=e.find_previous(['h2','h3']);return clean(h.get_text(' ',strip=True)) if h else ''
def f(id,label,type='textarea',required=False,**kw):return dict(id=id,label=label,type=type,required=required,**kw)
def opts(pairs):return [dict(value=v,label=l) for v,l in pairs]
def choice(id,label,options,multi=False,required=False,**kw):return f(id,label,'multi' if multi else 'single',required,options=opts(options),**kw)
def extract_factor(e):
 return choice(e['data-factor'],label(e),[(b['data-value'],clean(b.get_text(' ',strip=True))) for b in e.select('[data-value]')],e.get('data-multi')=='true',section=section(e))
def extract_input(e):
 id=e.get('data-field') or e.get('data-note') or e.get('id');typ=e.get('type','text');req=e.has_attr('required') or e.has_attr('data-required');lbl=label(e) or id
 if id in ['date','recordDate','logDate','feedbackDate']:return None
 kw={'section':section(e)}
 if e.get('data-type')=='checkbox-group':
  return choice(id,lbl,[(c['value'],clean(c.parent.get_text(' ',strip=True))) for c in e.select('input[value]')],True,req,**kw)
 if e.name=='select':return choice(id,lbl,[(o.get('value',o.get_text()),clean(o.get_text(' ',strip=True))) for o in e.select('option') if o.get('value')!=''],required=req,**kw)
 if typ=='checkbox':return choice(id,lbl,[(1,'是'),(0,'否')],**kw)
 if e.name=='textarea':return f(id,lbl,'textarea',req,max=2000,**kw)
 if typ in ['number','range']:
  kw['step']=1
  for a in ['min','max','step']:
   if e.has_attr(a):kw[a]=float(e[a])
  return f(id,lbl,'number',req,**kw)
 return f(id,lbl,'text',req,max=200,**kw)
def profile(id,name,fields):return dict(id=id,name=name,fields=[x for x in fields if x])
def tool(id,name,profiles,description):return dict(id=id,name=name,group='中长期成长观察',mode='tracker',description=description,sourceUrl='https://sdsqsnwh.cn/cz/'+id+'.html',profiles=profiles)
dims=[('critical','独立思考'),('communication','沟通'),('collaboration','协作'),('creativity','创造力'),('resilience','情绪恢复力')]
ctx=[('school','学校'),('home','家庭'),('social','社交'),('alone','独处')]
activity=[('online','线上'),('offline','线下'),('group','团体'),('individual','一对一')]
weather=[('sunny','晴天'),('cloudy','多云'),('overcast','阴天'),('rainy','小雨'),('stormy','雷雨')]
profiles=[profile('weather','情绪天气',[choice('weather','今天的情绪天气',weather,required=True),choice('calmQuick','遇到不开心的事情，能很快平静下来吗？',[('yes','能'),('no','暂时不能')]),f('description','今天发生了什么？')]),profile('growth','4C+R 成长瞬间',[f('description','今天的成长瞬间',required=True),choice('dimensions','与哪些能力有关？',dims,True),choice('isHighlight','这是一个高光时刻',[(1,'是'),(0,'否')])]),profile('reflection','每周反思',[f('description','这一周，你有什么新的发现和想法？',required=True)]),profile('activity','活动反馈',[f('description','活动内容和自己的反应、变化',required=True),choice('dimensions','涉及的能力',dims,True),choice('activityScenes','活动形式',activity,True),choice('isEffective','感觉活动带来了积极变化',[(1,'是'),(0,'否')])]),profile('stress','压力观察',[f('description','今天或最近的压力来源与感受',required=True),choice('stressSources','压力来源',[('study','学习'),('family','家庭'),('friends','朋友'),('self','自我'),('future','未来'),('other','其他')],True)])]
tools=[tool('4c1','4CR 青少年成长手帐',profiles,'分别记录情绪天气、成长瞬间、每周反思、活动反馈与压力来源；月报汇总频次，不评定能力高低。')]
p=copy.deepcopy(profiles);p.insert(3,profile('parent','家长观察',[f('description','具体行为、情境及孩子反应（不加评价）',required=True),choice('dimensions','涉及的能力',dims,True),choice('contextTags','发生场景',ctx,True)]));p[-1]=profile('stress','压力观察',[f('description','观察到的压力与反应',required=True),choice('stressSignals','压力信号',[('emotion','情绪波动'),('body','身体不适'),('behavior','回避行为'),('sleep','睡眠变化'),('social','社交退缩'),('other','其他')],True),choice('contextTags','发生场景',ctx,True)])
tools.append(tool('4cr','4CR 家庭成长手帐',p,'保留青少年记录、家长观察、活动反馈与压力观察，以双方记录形成描述性月报。'))
s=soup('sl');fields=[choice('sleepRange','昨晚大约睡了多久？',[(e['data-range'],clean(e.get_text())) for e in s.select('[data-range]')],required=True),choice('quality','睡得怎么样？',[(int(e['data-rating']),e.get('title')) for e in s.select('[data-rating]')],required=True),choice('mood','起床后的心情',[(e['data-mood'],e.get('title')) for e in s.select('[data-mood]')]),choice('fallAsleep','入睡情况',[(e['data-fallasleep'],clean(e.get_text())) for e in s.select('[data-fallasleep]')]),choice('nightWake','夜间醒来情况',[(e['data-nightwake'],clean(e.get_text())) for e in s.select('[data-nightwake]')])]
for factor in dict.fromkeys(e['data-factor'] for e in s.select('[data-factor]')):
 es=s.select('[data-factor="'+factor+'"]');fields.append(choice(factor,label(es[0]),[(e['data-value'],clean(e.get_text())) for e in es],factor=='preSleep',section='睡眠影响因素'))
fields += [f('customGood','自定义因素：可能帮助睡眠的事',max=200,section='自定义因素'),f('customBad','自定义因素：可能影响睡眠的事',max=200,section='自定义因素'),f('note','梦境或其他想记下的事',max=1000)]
tools.append(tool('sl','睡眠微手帐',[profile('daily','每日睡眠',fields)],'记录时长区间、质量、入睡与夜醒及影响因素，回看最近7条趋势和因素共现。'))
gender_config=json.loads((base/'qc1-gender-config.json').read_text())
for slug in ['qc1','qc']:
 ps=[]
 for gender in ['male','female']:
  ss=soup('boy' if gender=='male' else 'girl');src=ss if slug=='qc' else soup('qc1');fs=[]
  for e in src.select('[data-factor]'):
   field=extract_factor(e)
   if slug=='qc1' and field['id']=='knowledgeNeed':field['options']=gender_config[gender]['knowledgeNeed']
   if field['id'] in ['age','context']:field['required']= (field['id']=='age' if slug=='qc1' else field['id']=='context')
   fs.append(field)
  if slug=='qc1':
   body=choice('teenBodyChange','自己注意到的身体变化',[(x['value'],x['label']) for x in gender_config[gender]['bodyChanges']],True)
   fs.insert(2,dict(body,id='teenBodyChange',label='自己注意到的身体变化'))
   fs.insert(3,dict(body,id='parentObserveBody',label='家人注意到的身体变化'))
  for e in src.select('[data-note]'):fs.append(extract_input(e))
  for field in fs:
   if field['id']=='freeThoughts':field['label']='还有什么想说的话？'
   if field['id']=='context':field['label']='这次记录的场景'
   if field['id'] in ['teenBodyFeeling','knowledgeSource','knowledgeNeed']:field['label']=re.sub(r'^\d+\s*','',field['label']).removesuffix(' 自己')
  ps.append(profile(gender,'男生版' if gender=='male' else '女生版',fs))
 tools.append(tool(slug,'青春期成长'+('青少年手帐' if slug=='qc1' else '家庭共评手帐'),ps,'根据男生/女生分别记录身体变化、情绪、知识需求与沟通；敏感记录仅本人可见。'))
for slug,panels,name in [('gt1',[('daily','日常对话'),('confusion','我的困扰')],'亲子沟通青少年手帐'),('gt',[('daily','日常沟通'),('practice','课程实践反馈')],'亲子沟通家庭手帐')]:
 s=soup(slug);ps=[]
 for pid,pname in panels:
  panel=s.select_one('#panel-'+pid);fs=[extract_factor(e) for e in panel.select('[data-factor]')]+[extract_input(e) for e in panel.select('[data-field]')];fs=[e for e in fs if e]
  labels={'usualParent':'往常家长的反应','thisTimeParent':'这次家长的反应','usualChild':'往常孩子的反应','thisTimeChild':'这次孩子的反应'}
  for field in fs:
   if field['id'] in labels:field['label']=labels[field['id']]
  ps.append(profile(pid,pname,fs))
 tools.append(tool(slug,name,ps,'分别记录具体对话与情绪强度，保留反思或课程实践，不把沟通记录转换为诊断分数。'))
s=soup('sz');ps=[]
for fid,pid,pname in [('dailyLogForm','daily','每日使用记录'),('feedbackForm','feedback','服务效果反馈')]:
 form=s.select_one('#'+fid);fs=[extract_input(e) for e in form.select('input,select,textarea') if e.get('type') not in ['file','hidden']];fs=[x for x in fs if x]
 labels={'sleepImpact':'使用影响了睡眠','goldenRule':'践行黄金法则','imaginationLoop':'开展想象力循环','noAIDay':'尝试无AI日','followUpAction':'已落实后续行动','childFeedback':'孩子分享了自己的感受'}
 for field in fs:
  if field['id'] in labels:field['label']=labels[field['id']]
  if field['id']=='screenTime':field.update(max=1440,unit='分钟')
 ps.append(profile(pid,pname,fs))
tools.append(tool('sz','数字产品使用手帐',ps,'记录设备、场景、时长、内容、使用前后情绪、冲突、陪伴与服务效果。'))
s=soup('ys');ps=[]
for fid,pid,pname in [('dietLogForm','diet','饮食记录'),('bodyForm','body','体重身高腰围'),('feedbackForm','feedback','营养咨询记录')]:
 form=s.select_one('#'+fid);fs=[extract_input(e) for e in form.select('[data-field]')];fs=[x for x in fs if x]
 for field in fs:
  if field['id']=='checkboxes':field['label']='已经尝试的行动'
  if field['type']=='number' and 'max' not in field:field['max']=10000
  if field['id']=='foodGroups':field['required']=True
 ps.append(profile(pid,pname,fs))
tools.append(tool('ys','饮食与体重追踪手帐',ps,'分别记录饮食结构、身体测量与营养咨询；BMI和腰高比用于回顾身体变化，不作为医学诊断。'))
order=['4c1','4cr','sl','qc1','qc','sz','gt1','gt','ys'];tools.sort(key=lambda t:order.index(t['id']))
Path('server/tools/tracker-schema.json').write_text(json.dumps(tools,ensure_ascii=False,indent=2)+'\n')
for t in tools:print(t['id'],[(p['id'],len(p['fields'])) for p in t['profiles']])


    // ================= 工具函数 =================
    function $(s, p) { return (p || document).querySelector(s); }
    function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
    var toastEl = $('#toast'), toastTimer = null;
    function showToast(msg) {
        toastEl.textContent = msg; toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2500);
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
    function todayStr() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
    function byDateDesc(a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''); }

    // ================= 本地存储 =================
    // ★ 如与旧版键名不同，只需修改这三处
    var STORE_KEYS = { diet: 'dietLogs', body: 'bodyLogs', feedback: 'feedbackLogs' };
    var BACKUP_TIME_KEY = 'lastBackupTime', BACKUP_REMIND_KEY = 'lastBackupRemindAt';
    var BACKUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30天

    function readStore(k) { try { var v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
    function writeStore(k, arr) {
        try { localStorage.setItem(k, JSON.stringify(arr)); return true; }
        catch (e) { showToast('⚠️ 存储空间不足，建议先导出备份再清理部分记录'); return false; }
    }
    function hasAnyData() { return !!(readStore(STORE_KEYS.diet).length || readStore(STORE_KEYS.body).length || readStore(STORE_KEYS.feedback).length); }

    // ================= 导出核心（微信兼容） =================
    function downloadFile(content, filename, mimeType) {
        mimeType = mimeType || 'application/json';
        try {
            var blob = new Blob([content], { type: mimeType });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
            return true;
        } catch (e) { return false; }
    }
    function downloadFileBase64(content, filename) {
        try {
            var base64 = btoa(unescape(encodeURIComponent(content)));
            var link = document.createElement('a');
            link.href = 'data:application/octet-stream;charset=utf-8;base64,' + base64;
            link.download = filename;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            return true;
        } catch (e) { return false; }
    }
    function exportData(data, filename, label) {
        label = label || '数据';
        if (!data || (Array.isArray(data) && data.length === 0)) { showToast('暂无' + label + '可导出'); return; }
        markBackedUp(); // 任何一次导出都视为完成了一次备份
        var dataStr = JSON.stringify(data, null, 2);
        var isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        if (isWeChat) {
            $('#wcTextarea').value = dataStr;
            $('#wcModal').classList.add('open');
            $('#wcDownloadBtn').dataset.content = dataStr;
            $('#wcDownloadBtn').dataset.filename = filename;
        } else {
            var success = downloadFile(dataStr, filename);
            if (success) showToast('✅ ' + label + '已导出！');
            else showToast('导出失败，请重试');
        }
    }
    $('#wcDownloadBtn').addEventListener('click', function () {
        var content = this.dataset.content, filename = this.dataset.filename;
        if (!content || !filename) { showToast('数据缺失，请重新导出'); return; }
        var success = downloadFile(content, filename);
        if (!success) success = downloadFileBase64(content, filename);
        if (success) showToast('✅ 下载已开始');
        else showToast('下载失败，请使用「复制全部」保存');
    });
    $('#wcCopyBtn').addEventListener('click', function () {
        var textarea = $('#wcTextarea');
        textarea.select(); textarea.setSelectionRange(0, textarea.value.length);
        try { document.execCommand('copy'); showToast('✅ 已复制，请粘贴到备忘录保存为 .json 文件'); }
        catch (e) { showToast('复制失败，请长按文本手动复制'); }
    });
    $('#wcCloseBtn').addEventListener('click', function () { $('#wcModal').classList.remove('open'); });

    // ================= 备份提醒 / 双端合并（新增） =================
    function markBackedUp() { try { localStorage.setItem(BACKUP_TIME_KEY, String(Date.now())); } catch (e) {} updateBackupUI(); }
    function daysSinceBackup() { var t = parseInt(localStorage.getItem(BACKUP_TIME_KEY), 10); return t ? Math.floor((Date.now() - t) / 86400000) : null; }

    function updateBackupUI() {
        var days = daysSinceBackup(), stat = $('#backupStatBox'), banner = $('#backupBanner');
        if (stat) {
            if (days === null) { stat.className = 'dm-stat none'; stat.innerHTML = '你<strong>从未备份</strong>过数据，存在丢失风险。'; }
            else if (days >= 30) { stat.className = 'dm-stat warn'; stat.innerHTML = '距上次备份已 <strong>' + days + ' 天</strong>，建议尽快导出一份新备份。'; }
            else { stat.className = 'dm-stat ok'; stat.innerHTML = '距上次备份 <strong>' + days + ' 天</strong>，状态良好，建议 <strong>' + (30 - days) + ' 天内</strong>再备份一次。'; }
        }
        if (banner) {
            var snoozed = parseInt(localStorage.getItem(BACKUP_REMIND_KEY), 10) || 0;
            var overdue = (days === null || days * 86400000 >= BACKUP_INTERVAL_MS) && hasAnyData();
            if (Date.now() - snoozed < 3 * 86400000) overdue = false; // 点「暂不」后3天内不再弹
            banner.style.display = overdue ? 'flex' : 'none';
            if (overdue) $('#backupBannerText').innerHTML = days === null
                ? '你还没有备份过数据。本地记录可能因<strong>清理缓存/清除浏览器数据</strong>而丢失，建议立即导出一份。'
                : '已 <strong>' + days + ' 天</strong>未备份数据，建议导出一份新备份，防止意外丢失。';
        }
    }
    function dismissBackupBanner() { try { localStorage.setItem(BACKUP_REMIND_KEY, String(Date.now())); } catch (e) {} $('#backupBanner').style.display = 'none'; }

    function exportAllData() {
        var now = new Date().toISOString();
        var pkg = { app: '成长食光', type: 'full-backup', exportedAt: now,
            data: { diet: readStore(STORE_KEYS.diet), body: readStore(STORE_KEYS.body), feedback: readStore(STORE_KEYS.feedback) } };
        var total = pkg.data.diet.length + pkg.data.body.length + pkg.data.feedback.length;
        if (!total) { showToast('暂无数据可备份，先去记几条吧~'); return; }
        exportData(pkg, '成长食光-完整备份-' + now.slice(0, 10) + '.json', '完整备份');
    }

    function openDataModal() { updateBackupUI(); $('#dataModal').classList.add('active'); }
    function closeDataModal() { $('#dataModal').classList.remove('active'); }
    $('#dataModal').addEventListener('click', function (e) { if (e.target === this) closeDataModal(); });
    function togglePasteArea() { var el = $('#pasteImportArea'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }

    // 自动识别单类导出文件的类型
    function detectRecordType(rec) {
        if (!rec || typeof rec !== 'object') return null;
        if ('weight' in rec || 'height' in rec || 'waist' in rec) return 'body';
        if ('consultType' in rec || 'consultTopic' in rec || 'adherenceLevel' in rec) return 'feedback';
        if ('mealType' in rec || 'foodGroups' in rec || 'recordType' in rec || 'portionSize' in rec) return 'diet';
        return null;
    }
    function recordKey(rec) {
        if (!rec || typeof rec !== 'object') return 'x';
        if (rec.id != null && rec.id !== '') return 'id:' + String(rec.id);
        var copy = {}; // 无 id 的旧记录按内容指纹去重
        for (var k in rec) { if (k !== 'id' && k !== 'createdAt') copy[k] = rec[k]; }
        return 'fp:' + JSON.stringify(copy);
    }
    function mergeInto(key, incoming) {
        if (!Array.isArray(incoming) || !incoming.length) return 0;
        var list = readStore(key), seen = {};
        list.forEach(function (r) { seen[recordKey(r)] = 1; });
        var added = 0;
        incoming.forEach(function (r) {
            if (!r || typeof r !== 'object') return;
            var k = recordKey(r);
            if (seen[k]) return; // 相同记录自动跳过
            seen[k] = 1; list.push(r); added++;
        });
        if (added) writeStore(key, list);
        return added;
    }
    function parseAndMerge(text) {
        var parsed;
        try { parsed = JSON.parse(text); } catch (e) { showToast('❌ JSON 格式有误，请确认内容完整'); return; }
        var res = { diet: 0, body: 0, feedback: 0 };
        var arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.records) ? parsed.records : null);
        if (parsed && parsed.data && (parsed.data.diet || parsed.data.body || parsed.data.feedback)) { // 完整备份
            res.diet = mergeInto(STORE_KEYS.diet, parsed.data.diet);
            res.body = mergeInto(STORE_KEYS.body, parsed.data.body);
            res.feedback = mergeInto(STORE_KEYS.feedback, parsed.data.feedback);
        } else if (arr || (parsed && typeof parsed === 'object' && detectRecordType(parsed))) { // 单类导出
            (arr || [parsed]).forEach(function (r) {
                var t = detectRecordType(r);
                if (t) res[t] += mergeInto(STORE_KEYS[t], [r]);
            });
        } else { showToast('❌ 无法识别的数据格式，请使用本页面导出的JSON'); return; }
        var total = res.diet + res.body + res.feedback;
        if (!total) { showToast('没有新增记录（导入的内容可能都已存在）'); return; }
        showToast('✅ 合并成功：饮食 +' + res.diet + '，身体 +' + res.body + '，咨询 +' + res.feedback + '，即将刷新…');
        setTimeout(function () { location.reload(); }, 1800);
    }
    function importFromPaste() {
        var text = $('#pasteImportText').value.trim();
        if (!text) { showToast('请先粘贴JSON内容'); return; }
        parseAndMerge(text);
    }
    $('#importFileInput').addEventListener('change', function () {
        var file = this.files && this.files[0], self = this;
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) { parseAndMerge(e.target.result); };
        reader.onerror = function () { showToast('文件读取失败，请改用「粘贴JSON导入」'); };
        reader.readAsText(file, 'UTF-8');
        self.value = '';
    });

    // 清空数据前的备份警示（三个清空按钮共用）
    function confirmClearBeforeWipe(label) {
        var days = daysSinceBackup();
        var warn = days === null ? '⚠️ 你从未备份过数据！\n\n' : (days > 30 ? '⚠️ 已 ' + days + ' 天未备份数据！\n\n' : '');
        return confirm(warn + '即将清空「' + label + '」的全部本地记录，清空后无法恢复。\n如需保留，请先点「导出」按钮备份数据。\n\n确定继续清空吗？');
    }

    // ================= 标签映射 =================
    var L = {
        recordType: { single_meal: '单餐记录', daily_summary: '一日概览', special_event: '特殊事件' },
        lifeScene: { home: '家庭居家', school_canteen: '学校食堂', boarding: '住校', dining_out: '外出就餐', holiday: '假期节庆', travel: '旅行外出' },
        mealType: { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack_morning: '上午加餐', snack_afternoon: '下午加餐', snack_evening: '晚间零食', all_day: '全天概况', event: '特定事件' },
        diningPlace: { home_table: '家中餐桌', school_canteen: '学校食堂', dormitory: '宿舍', classroom: '教室', restaurant: '餐厅', takeout: '外卖', street_food: '街边小吃', multiple: '多个地点' },
        portionSize: { small: '少量', proper: '适量', large: '偏多', excessive: '过量' },
        eatingSpeed: { slow: '慢', normal: '正常', fast: '快', very_fast: '非常快' },
        moodBefore: { hungry: '正常饥饿', happy: '愉快', bored: '无聊', stressed: '压力焦虑', sad: '低落', reward: '奖励自己', social: '社交场合' },
        moodAfter: { satisfied: '满足', energetic: '精力充沛', stuffed: '撑胀', guilty: '内疚', sleepy: '困倦', still_hungry: '还想吃' },
        screenWhileEating: { none: '没看屏幕', phone: '手机', tv: '电视', computer: '电脑' },
        consultType: { online: '线上咨询', offline: '线下门诊', school: '学校体检/营养课', followup: '复诊随访' },
        weightChange: { decrease: '下降', stable: '稳定', slight_increase: '缓慢增加', rapid_increase: '增加过快' },
        childCooperation: { active: '主动配合', passive: '被动配合', resistant: '不愿执行' },
        gender: { male: '男', female: '女' },
        measureTime: { morning: '早上空腹', noon: '中午', evening: '晚上', irregular: '不固定' },
        pubertyStage: { early: '前期', middle: '中期', late: '后期', unknown: '不确定' }
    };
    var FOOD_MAP = {
        staple_rice: ['主食-米面', 'tag-staple'], staple_cereal: ['主食-杂粮薯类', 'tag-staple'],
        protein_meat: ['红肉', 'tag-protein'], protein_poultry: ['禽类', 'tag-protein'], protein_fish: ['鱼虾', 'tag-protein'],
        protein_egg: ['蛋类', 'tag-protein'], protein_plant: ['豆制品', 'tag-protein'],
        vegetable: ['蔬菜', 'tag-veg'], fruit: ['水果', 'tag-fruit'], dairy: ['奶制品', 'tag-dairy'],
        snack_chips: ['油炸零食', 'tag-snack'], snack_sweet: ['甜食糕点', 'tag-snack'],
        drink_sugary: ['含糖饮料', 'tag-drink'], drink_water: ['白开水', 'tag-drink']
    };
    var FB_CHECKS = { dietPlanFollowed: '遵循饮食计划', childFeedbackShared: '孩子主动反馈', familySupport: '家庭支持' };

    // ================= 页签与弹窗 =================
    var TAB_ORDER = ['record', 'body', 'history', 'feedback'];
    function switchTab(name) {
        $$('.nav-tab').forEach(function (t, i) { t.classList.toggle('active', TAB_ORDER[i] === name); });
        $$('.tab-content').forEach(function (c) { c.classList.toggle('active', c.id === name + '-tab'); });
    }
    function openConceptModal() { $('#conceptModal').classList.add('active'); }
    function closeConceptModal() { $('#conceptModal').classList.remove('active'); }

    // ================= 表单引擎 =================
    function collectForm(form) {
        var data = {};
        $$('[data-field]', form).forEach(function (el) {
            var f = el.getAttribute('data-field');
            if (el.getAttribute('data-type') === 'checkbox-group') {
                data[f] = $$('input[type="checkbox"]:checked', el).map(function (c) { return c.value; });
            } else if (el.type === 'range') {
                data[f] = +el.value;
            } else {
                data[f] = (el.value || '').trim();
            }
        });
        return data;
    }
    function validateForm(form) {
        var ok = true, first = null;
        $$('[data-required]', form).forEach(function (el) {
            var bad = (el.getAttribute('data-type') === 'checkbox-group')
                ? !$$('input[type="checkbox"]:checked', el).length
                : !(el.value && el.value.trim());
            el.style.borderColor = bad ? 'var(--danger)' : '';
            if (bad && ok) { ok = false; first = el; }
        });
        var msg = $('.validation-message', form);
        if (msg) msg.classList.toggle('show', !ok);
        if (!ok && first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus(); }
        return ok;
    }
    function resetForm(form) {
        form.reset();
        $$('input[type="date"]', form).forEach(function (el) { el.value = todayStr(); }); // 修复原 valueAsDate 的时区问题
        $$('input[type="range"]', form).forEach(function (r) { var s = r.nextElementSibling; if (s && s.className === 'slider-value') s.textContent = r.value; });
        $$('[data-required]', form).forEach(function (el) { el.style.borderColor = ''; });
        var msg = $('.validation-message', form);
        if (msg) msg.classList.remove('show');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ================= 饮食记录 =================
    $('#dietLogForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateForm(this)) return;
        var rec = collectForm(this);
        rec.id = uid(); rec.createdAt = new Date().toISOString();
        var list = readStore(STORE_KEYS.diet);
        list.unshift(rec);
        if (writeStore(STORE_KEYS.diet, list)) { showToast('✅ 饮食记录已保存'); resetForm(this); renderDiet(); }
    });

    function renderDiet() { renderDietHistory(); renderDietAnalytics(); }

    function renderDietHistory() {
        var list = readStore(STORE_KEYS.diet).slice().sort(byDateDesc);
        var box = $('#historyList');
        if (!list.length) {
            box.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:16px 0;font-size:13px;">还没有饮食记录，去「饮食记录」页保存第一条吧~</p>';
            return;
        }
        var html = '';
        list.forEach(function (r) {
            var foods = (r.foodGroups || []).map(function (g) {
                var m = FOOD_MAP[g]; return m ? '<span class="tag ' + m[1] + '">' + m[0] + '</span>' : '';
            }).join('');
            html += '<div class="history-item">'
                + '<div class="history-date"><span>📅 ' + esc(r.date) + ' · ' + esc(L.mealType[r.mealType] || '—') + '</span>'
                + '<button class="delete-btn" onclick="deleteDietRecord(\'' + r.id + '\')">删除</button></div>'
                + '<div class="history-detail">'
                + '<p><strong>' + esc(L.recordType[r.recordType] || '记录') + '</strong> · ' + esc(L.lifeScene[r.lifeScene] || '') + ' · ' + esc(L.diningPlace[r.diningPlace] || '') + '</p>'
                + (foods ? '<p style="margin:4px 0 6px;">' + foods + '</p>' : '')
                + '<p>份量：' + esc(L.portionSize[r.portionSize] || '—') + ' · 速度：' + esc(L.eatingSpeed[r.eatingSpeed] || '—') + '</p>'
                + '<p>情绪：' + esc(L.moodBefore[r.moodBefore] || '—') + ' → ' + esc(L.moodAfter[r.moodAfter] || '—') + '</p>'
                + ((r.waterIntake || r.snackCount || r.sugaryDrinkCount) ? '<p>💧 ' + (+r.waterIntake || 0) + 'ml · 🍪 零食' + (+r.snackCount || 0) + '次 · 🥤 含糖饮料' + (+r.sugaryDrinkCount || 0) + '杯</p>' : '')
                + ((r.exerciseDuration || r.sleepHours) ? '<p>🏃 运动' + (+r.exerciseDuration || 0) + '分钟 · 😴 睡眠' + (+r.sleepHours || 0) + '小时 · 食欲' + (r.appetiteScore || 3) + '/5</p>' : '')
                + (r.observations ? '<p style="color:var(--text-light);">📝 ' + esc(r.observations) + '</p>' : '')
                + (r.careResponse ? '<p style="color:var(--text-light);">💚 ' + esc(r.careResponse) + '</p>' : '')
                + '</div></div>';
        });
        box.innerHTML = html;
    }

    function renderDietAnalytics() {
        var list = readStore(STORE_KEYS.diet);
        $('#totalDays').textContent = list.length;
        var waterRecs = list.filter(function (r) { return +r.waterIntake > 0; });
        var avgWater = waterRecs.length ? Math.round(waterRecs.reduce(function (s, r) { return s + (+r.waterIntake); }, 0) / waterRecs.length) : 0;
        $('#avgWater').textContent = avgWater;
        var snackN = list.filter(function (r) {
            return +r.snackCount > 0 || (r.foodGroups || []).some(function (g) { return g.indexOf('snack') === 0; });
        }).length;
        var sugN = list.filter(function (r) {
            return +r.sugaryDrinkCount > 0 || (r.foodGroups || []).indexOf('drink_sugary') > -1;
        }).length;
        $('#snackRate').textContent = (list.length ? Math.round(snackN / list.length * 100) : 0) + '%';
        $('#sugaryRate').textContent = (list.length ? Math.round(sugN / list.length * 100) : 0) + '%';
        renderFoodChart(list);
        $('#descAnalysis').textContent = dietSummary(list, avgWater,
            list.length ? snackN / list.length : 0, list.length ? sugN / list.length : 0);
    }

    function renderFoodChart(list) {
        var box = $('#foodGroupChart'), counts = {}, max = 0;
        list.forEach(function (r) {
            (r.foodGroups || []).forEach(function (g) {
                counts[g] = (counts[g] || 0) + 1;
                if (counts[g] > max) max = counts[g];
            });
        });
        var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 10);
        if (!keys.length) {
            box.innerHTML = '<p style="text-align:center;font-size:12px;color:var(--text-light);">食物类别出现频率</p>';
            return;
        }
        var html = '<p style="font-size:12px;color:var(--text-light);margin-bottom:6px;">食物类别出现频率</p>';
        keys.forEach(function (k) {
            var m = FOOD_MAP[k] || [k, 'tag-staple'];
            html += '<div class="trend-row"><span style="min-width:64px;">' + m[0] + '</span>'
                + '<div class="trend-bar"><div class="trend-bar-fill" style="width:' + Math.round(counts[k] / max * 100) + '%"></div></div>'
                + '<span style="min-width:28px;text-align:right;color:var(--primary);font-weight:700;">' + counts[k] + '</span></div>';
        });
        box.innerHTML = html;
    }

    function dietSummary(list, avgWater, snackRate, sugRate) {
        if (list.length < 3) return '记录还不多，先专注记好关键餐次与特殊事件，攒到5条以上分析会更有参考价值~';
        var tips = [];
        if (avgWater && avgWater < 1200) tips.push('平均饮水量约' + avgWater + 'ml，偏低，建议白天分次补水至1200~1500ml');
        if (snackRate >= 0.5) tips.push('零食出现频率' + Math.round(snackRate * 100) + '%，可先用水果/酸奶替换一半膨化与甜食零食');
        if (sugRate >= 0.4) tips.push('含糖饮料出现频率' + Math.round(sugRate * 100) + '%，建议逐步换成白开水或无糖茶');
        var fastN = list.filter(function (r) { return r.eatingSpeed === 'fast' || r.eatingSpeed === 'very_fast'; }).length;
        if (fastN / list.length >= 0.4) tips.push('进餐普遍偏快，试试每餐延长到15分钟以上，细嚼慢咽更易有饱腹感');
        var emoN = list.filter(function (r) { return r.moodBefore === 'stressed' || r.moodBefore === 'bored' || r.moodBefore === 'sad'; }).length;
        if (emoN / list.length >= 0.3) tips.push('约' + Math.round(emoN / list.length * 100) + '%的记录是情绪性进食，先关心情绪再调整饮食');
        if (!tips.length) return '整体不错！继续保持规律用餐与均衡搭配，重点关注长期趋势而非单次表现。';
        return tips.join('；') + '。';
    }

    function deleteDietRecord(id) {
        if (!confirm('确定删除这条饮食记录吗？')) return;
        writeStore(STORE_KEYS.diet, readStore(STORE_KEYS.diet).filter(function (r) { return r.id !== id; }));
        renderDiet(); showToast('已删除该条记录');
    }

    // ================= 体格计算核心 =================
    function calcBMI(w, h) { return +(w / ((h / 100) * (h / 100))).toFixed(1); }
    function calcWHtR(waist, h) { return +(waist / h).toFixed(2); }
    // 按年龄性别的简化参考界值（线性近似中国学龄儿童青少年标准，仅供日常参考）
    function bmiCutoffs(age, gender) {
        var a = Math.min(Math.max(+age || 12, 6), 18) - 6, m = gender === 'male';
        return {
            thin: (m ? 14.0 : 13.6) + a * 0.375,
            over: (m ? 17.4 : 17.2) + a * (m ? 0.55 : 0.567),
            obese: (m ? 19.2 : 18.9) + a * (m ? 0.733 : 0.758)
        };
    }
    function bmiStatus(bmi, age, gender) {
        var c = bmiCutoffs(age, gender);
        if (bmi < c.thin) return { cls: 'info', label: '偏瘦' };
        if (bmi < c.over) return { cls: 'normal', label: '正常' };
        if (bmi < c.obese) return { cls: 'warn', label: '超重' };
        return { cls: 'danger', label: '肥胖' };
    }
    function whtrStatus(w) {
        if (w < 0.43) return { cls: 'info', label: '偏瘦型' };
        if (w < 0.50) return { cls: 'normal', label: '正常' };
        if (w < 0.55) return { cls: 'warn', label: '中心性超重' };
        return { cls: 'danger', label: '中心性肥胖' };
    }

    // ================= 身体测量 =================
    $('#bodyForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateForm(this)) return;
        var rec = collectForm(this);
        rec.id = uid(); rec.createdAt = new Date().toISOString();
        var list = readStore(STORE_KEYS.body);
        list.unshift(rec);
        if (writeStore(STORE_KEYS.body, list)) { showToast('✅ 测量数据已保存'); resetForm(this); renderBody(); }
    });

    function renderBody() {
        var list = readStore(STORE_KEYS.body).slice().sort(byDateDesc);
        if (!list.length) {
            $('#latestWeight').textContent = $('#latestHeight').textContent = $('#latestWaist').textContent = '—';
            $('#assessmentContent').innerHTML = '<p style="text-align:center;color:var(--text-light);padding:12px 0;font-size:13px;">保存测量数据后即可查看评估结果</p>';
            $('#bodyTrendList').innerHTML = '<p style="text-align:center;color:var(--text-light);padding:16px 0;font-size:13px;">还没有测量记录</p>';
            return;
        }
        var r = list[0];
        $('#latestWeight').textContent = r.weight;
        $('#latestHeight').textContent = r.height;
        $('#latestWaist').textContent = r.waist;
        renderAssessment(r);
        renderBodyTrend(list);
    }

    function renderAssessment(r) {
        var bmi = calcBMI(+r.weight, +r.height), whtr = calcWHtR(+r.waist, +r.height);
        var bs = bmiStatus(bmi, +r.age, r.gender), ws = whtrStatus(whtr);
        var bmiPct = Math.max(2, Math.min(100, Math.round((bmi - 13) / 17 * 100)));
        var whtrPct = Math.max(2, Math.min(100, Math.round((whtr - 0.35) / 0.30 * 100)));
        var exCls = (ws.cls === 'danger' || bs.cls === 'danger') ? ' danger'
            : (ws.cls === 'info' || bs.cls === 'info') ? ' info'
            : (ws.cls === 'normal' && bs.cls === 'normal') ? ' success' : '';
        var html = '<p style="font-size:12px;color:var(--text-light);margin-bottom:10px;">最近测量：' + esc(r.date) + ' · ' + (+r.age) + '岁 · ' + esc(L.gender[r.gender] || '') + '</p>'
            + '<div class="metric-row"><span class="metric-label">BMI</span><span class="metric-val">' + bmi + '</span><span class="metric-status ' + bs.cls + '">' + bs.label + '</span></div>'
            + '<div class="metric-bar-wrap"><div class="metric-bar-fill ' + bs.cls + '" style="width:' + bmiPct + '%"></div></div>'
            + '<div class="metric-row" style="margin-top:10px;"><span class="metric-label">腰围身高比</span><span class="metric-val">' + whtr + '</span><span class="metric-status ' + ws.cls + '">' + ws.label + '</span></div>'
            + '<div class="metric-bar-wrap"><div class="metric-bar-fill ' + ws.cls + '" style="width:' + whtrPct + '%"></div></div>'
            + '<div class="assessment-explain' + exCls + '">' + assessmentText(bmi, whtr, bs, ws) + '</div>';
        $('#assessmentContent').innerHTML = html;
    }

    function assessmentText(bmi, whtr, bs, ws) {
        var parts = [];
        if (ws.cls === 'danger') parts.push('<strong>中心性肥胖：</strong>内脏脂肪超标风险高，建议尽快到儿科或临床营养科评估。优先减少含糖饮料与精制主食，保证每天60分钟中高强度运动。');
        else if (ws.cls === 'warn') parts.push('<strong>中心性超重：</strong>腰围身高比已越过0.5警戒线，建议立刻行动：控制含糖饮料、增加全谷物与蔬菜、规律运动，多数情况3~6个月可回落。');
        else if (ws.cls === 'info') parts.push('<strong>偏瘦型体型：</strong>WHtR低于0.43，关注营养摄入是否充足，排查挑食、消化吸收与刻意节食，保证优质蛋白与总能量。');
        if (bs.cls === 'danger') parts.push('BMI达到肥胖参考界值（按年龄性别简化标准），建议专业评估并制定体重管理方案。');
        else if (bs.cls === 'warn') parts.push('BMI处于超重参考区间，青春期体重上涨本身正常，关键是控制增速。');
        else if (bs.cls === 'info') parts.push('BMI偏低（消瘦参考区间），可能影响身高潜力与免疫力。');
        if (bs.cls === 'normal' && ws.cls === 'normal') parts.push('BMI与腰围身高比均在参考范围内，体型匀称，继续保持规律饮食、充足睡眠与运动即可。');
        if (bs.cls === 'normal' && (ws.cls === 'warn' || ws.cls === 'danger')) parts.push('<strong>注意"隐形"中心性肥胖：</strong>BMI正常但腰围超标，同样需要干预，不能因为体重正常而放松。');
        parts.push('评估采用简化参考界值（BMI按年龄性别线性近似中国标准，WHtR临界值0.5），仅供日常参考，确诊请以专业机构测量为准。');
        return parts.join('<br><br>');
    }

    function renderBodyTrend(list) {
        var html = '';
        list.forEach(function (r, i) {
            var prev = list[i + 1]; // 时间上更早的一条
            var dw = prev ? (+r.weight - +prev.weight) : null;
            var dwa = prev ? (+r.waist - +prev.waist) : null;
            var bmi = calcBMI(+r.weight, +r.height), whtr = calcWHtR(+r.waist, +r.height);
            var bs = bmiStatus(bmi, +r.age, r.gender), ws = whtrStatus(whtr);
            var fmt = function (d) { return d === null ? '' : '（' + (d > 0 ? '▲+' : d < 0 ? '▼' : '') + Math.abs(d).toFixed(1) + '）'; };
            html += '<div class="history-item">'
                + '<div class="history-date"><span>📅 ' + esc(r.date) + ' · ' + (+r.age) + '岁</span>'
                + '<button class="delete-btn" onclick="deleteBodyRecord(\'' + r.id + '\')">删除</button></div>'
                + '<div class="history-detail">'
                + '<p>体重 <strong>' + r.weight + 'kg</strong>' + fmt(dw) + ' · 身高 <strong>' + r.height + 'cm</strong> · 腰围 <strong>' + r.waist + 'cm</strong>' + fmt(dwa) + '</p>'
                + '<p>BMI ' + bmi + ' <span class="metric-status ' + bs.cls + '">' + bs.label + '</span> · WHtR ' + whtr + ' <span class="metric-status ' + ws.cls + '">' + ws.label + '</span></p>'
                + (r.notes ? '<p style="color:var(--text-light);">备注：' + esc(r.notes) + '</p>' : '')
                + '</div></div>';
        });
        $('#bodyTrendList').innerHTML = html;
    }

    function deleteBodyRecord(id) {
        if (!confirm('确定删除这条测量记录吗？')) return;
        writeStore(STORE_KEYS.body, readStore(STORE_KEYS.body).filter(function (r) { return r.id !== id; }));
        renderBody(); showToast('已删除该条记录');
    }

    // ================= 营养咨询 =================
    function stars(n) {
        n = Math.max(1, Math.min(5, +n || 3));
        var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '●' : '○';
        return s;
    }
    $('#feedbackForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateForm(this)) return;
        var rec = collectForm(this);
        rec.id = uid(); rec.createdAt = new Date().toISOString();
        var list = readStore(STORE_KEYS.feedback);
        list.unshift(rec);
        if (writeStore(STORE_KEYS.feedback, list)) { showToast('✅ 咨询记录已保存'); resetForm(this); renderFeedback(); }
    });

    function renderFeedback() { renderFeedbackHistory(); renderFeedbackAnalytics(); }

    function renderFeedbackHistory() {
        var list = readStore(STORE_KEYS.feedback).slice().sort(byDateDesc);
        var box = $('#feedbackHistoryList');
        if (!list.length) {
            box.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:16px 0;font-size:13px;">还没有咨询记录</p>';
            return;
        }
        var html = '';
        list.forEach(function (r) {
            var checks = (r.checkboxes || []).map(function (c) {
                return '<span class="tag tag-feedback">' + esc(FB_CHECKS[c] || c) + '</span>';
            }).join('');
            html += '<div class="history-item">'
                + '<div class="history-date"><span>📅 ' + esc(r.date) + ' · ' + esc(L.consultType[r.consultType] || '咨询') + '</span>'
                + '<button class="delete-btn" onclick="deleteFeedbackRecord(\'' + r.id + '\')">删除</button></div>'
                + '<div class="history-detail">'
                + '<p><strong>' + esc(r.consultTopic || '') + '</strong></p>'
                + (r.nutritionistAdvice ? '<p>💡 ' + esc(r.nutritionistAdvice) + '</p>' : '')
                + '<p>执行度 ' + stars(r.adherenceLevel) + ' · 体重：' + esc(L.weightChange[r.weightChange] || '—') + ' · 配合度：' + esc(L.childCooperation[r.childCooperation] || '—') + '</p>'
                + (checks ? '<p style="margin:4px 0 6px;">' + checks + '</p>' : '')
                + (r.notes ? '<p style="color:var(--text-light);">📝 ' + esc(r.notes) + '</p>' : '')
                + '</div></div>';
        });
        box.innerHTML = html;
    }

    function renderFeedbackAnalytics() {
        var list = readStore(STORE_KEYS.feedback);
        $('#fbTotal').textContent = list.length;
        var adh = list.filter(function (r) { return r.adherenceLevel != null && r.adherenceLevel !== ''; });
        $('#fbAvgAdherence').textContent = adh.length
            ? (adh.reduce(function (s, r) { return s + (+r.adherenceLevel || 0); }, 0) / adh.length).toFixed(1) : '0.0';
        var act = list.filter(function (r) { return r.childCooperation === 'active'; }).length;
        $('#fbActiveRate').textContent = (list.length ? Math.round(act / list.length * 100) : 0) + '%';
        var fam = list.filter(function (r) { return (r.checkboxes || []).indexOf('familySupport') > -1; }).length;
        $('#fbFamilyRate').textContent = (list.length ? Math.round(fam / list.length * 100) : 0) + '%';
    }

    function deleteFeedbackRecord(id) {
        if (!confirm('确定删除这条咨询记录吗？')) return;
        writeStore(STORE_KEYS.feedback, readStore(STORE_KEYS.feedback).filter(function (r) { return r.id !== id; }));
        renderFeedback(); showToast('已删除该条记录');
    }

    // ================= 导出 / 清空 =================
    function exportAsJSON() { exportData(readStore(STORE_KEYS.diet), '成长食光-饮食记录.json', '饮食记录'); }
    function backupData() { exportAsJSON(); }
    function exportBodyJSON() { exportData(readStore(STORE_KEYS.body), '成长食光-身体数据.json', '身体数据'); }
    function exportFeedbackJSON() { exportData(readStore(STORE_KEYS.feedback), '成长食光-咨询记录.json', '咨询记录'); }

    function clearAllData() {
        if (!confirmClearBeforeWipe('饮食记录')) return;
        writeStore(STORE_KEYS.diet, []); renderDiet(); showToast('饮食记录已清空');
    }
    function clearBodyData() {
        if (!confirmClearBeforeWipe('身体测量数据')) return;
        writeStore(STORE_KEYS.body, []); renderBody(); showToast('身体数据已清空');
    }
    function clearFeedbackData() {
        if (!confirmClearBeforeWipe('咨询记录')) return;
        writeStore(STORE_KEYS.feedback, []); renderFeedback(); showToast('咨询记录已清空');
    }

    // ================= 初始化 =================
    (function init() {
        $$('input[type="date"]').forEach(function (el) { el.value = todayStr(); }); // 修复原 valueAsDate 在早8点前显示昨天的问题
        renderDiet();
        renderBody();
        renderFeedback();
        updateBackupUI();
    })();

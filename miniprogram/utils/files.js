function exportJson(payload, fileName) {
  return new Promise((resolve, reject) => {
    const filePath = wx.env.USER_DATA_PATH + '/' + fileName;
    wx.getFileSystemManager().writeFile({
      filePath, data: JSON.stringify(payload, null, 2), encoding: 'utf8',
      success() {
        if (typeof wx.shareFileMessage === 'function') {
          wx.shareFileMessage({ filePath, fileName, success: () => resolve({ filePath, shared: true }), fail: () => resolve({ filePath, shared: false }) });
        } else resolve({ filePath, shared: false });
      },
      fail() { reject(new Error('无法写入备份文件，请检查存储空间')); }
    });
  });
}

function pickJson() {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['json'],
      success(result) {
        const file = result.tempFiles[0];
        if (!file || file.size > 50 * 1024 * 1024) { reject(new Error('请选择不超过 50 MB 的 JSON 备份')); return; }
        wx.getFileSystemManager().readFile({
          filePath: file.path, encoding: 'utf8',
          success(data) {
            try { resolve(JSON.parse(data.data.replace(/^\uFEFF/, ''))); }
            catch (_) { reject(new Error('不是有效的 JSON 文件，请选择成长健研社导出的备份')); }
          },
          fail() { reject(new Error('无法读取文件，请重新选择')); }
        });
      },
      fail(result) {
        const error = new Error('文件选择未完成');
        error.cancelled = (result.errMsg || '').includes('cancel');
        reject(error);
      }
    });
  });
}

function showExportResult(result) {
  if (result.shared) wx.showToast({ title: '备份已导出', icon: 'success' });
  else wx.showModal({ title: '备份已保存', content: 'JSON 文件已保存在小程序本地：' + result.filePath + '。可再次点击导出，选择分享给文件接收方。请妥善保存私人备份。', showCancel: false, confirmText: '知道了', confirmColor: '#245c45' });
}

function jsonBytes(value) {
  return encodeURIComponent(JSON.stringify(value)).replace(/%[0-9A-F]{2}/g, 'x').length;
}

async function importBatches(path, key, rows, progress, extra = {}) {
  const maxBytes = 1024 * 1024;
  const batches = [];
  let batch = [];
  for (const row of rows) {
    if (jsonBytes({ ...extra, [key]: [row] }) > maxBytes) throw new Error('备份中的单条记录超过 1 MiB，无法安全导入，请拆分该条记录后重试');
    if (batch.length && (batch.length >= 100 || jsonBytes({ ...extra, [key]: batch.concat(row) }) > maxBytes)) {
      batches.push(batch); batch = [];
    }
    batch.push(row);
  }
  if (batch.length) batches.push(batch);
  let imported = 0, skipped = 0, processed = 0;
  for (const items of batches) {
    try {
      const result = await request(path, 'POST', { ...extra, [key]: items });
      imported += result.imported;
      skipped += result.skipped;
      processed += items.length;
      if (progress) progress({ imported, skipped, processed, total: rows.length });
    } catch (error) {
      throw new Error('已完成 ' + processed + '/' + rows.length + ' 条，导入 ' + imported + ' 条、跳过重复 ' + skipped + ' 条。后续批次未完成：' + error.message + '。可重试同一备份，已有记录会去重。');
    }
  }
  return { imported, skipped, processed };
}

module.exports = { exportJson, pickJson, showExportResult, importBatches };
const { request } = require('./api');


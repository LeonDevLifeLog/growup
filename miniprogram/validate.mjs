import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = dirname(fileURLToPath(import.meta.url));
const read = file => readFileSync(join(root, file), 'utf8');
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const path = join(directory, item.name);
    return item.isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
const jsonFiles = files.filter(file => file.endsWith('.json'));
jsonFiles.forEach(file => JSON.parse(readFileSync(file, 'utf8')));
const app = JSON.parse(read('app.json'));
const project = JSON.parse(read('project.config.json'));
assert.equal(project.compileType, 'miniprogram');
assert.equal(project.miniprogramRoot, './');
assert.ok(typeof project.appid === 'string' && project.appid.length > 0, '请配置 AppID 或本地 touristappid 占位');
assert.ok(app.pages.length > 0);
assert.equal(new Set(app.pages).size, app.pages.length, '页面路径重复');
assert.ok(app.tabBar.list.length >= 2 && app.tabBar.list.length <= 5, '原生 Tab 需要 2–5 个入口');
app.tabBar.list.forEach(tab => {
  assert.ok(app.pages.includes(tab.pagePath), `Tab 页面不存在: ${tab.pagePath}`);
  for (const key of ['iconPath', 'selectedIconPath']) {
    const path = tab[key];
    assert.ok(typeof path === 'string' && path.startsWith('assets/tabbar/') && !path.includes('..'), `${tab.text} 缺少有效的本地图标: ${key}`);
    assert.ok(existsSync(join(root, path)), `${tab.text} 图标文件不存在: ${path}`);
    const png = readFileSync(join(root, path));
    assert.ok(png.length < 40 * 1024, `${path} 图标必须小于 40 KiB`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${path} 不是 PNG`);
    assert.equal(png.readUInt32BE(16), 81, `${path} 图标宽度需为 81px`);
    assert.equal(png.readUInt32BE(20), 81, `${path} 图标高度需为 81px`);
  }
  assert.notDeepEqual(readFileSync(join(root, tab.iconPath)), readFileSync(join(root, tab.selectedIconPath)), `${tab.text} 普通与选中图标需要区分`);
});
console.log(`原生 Tab 图标检查通过：${app.tabBar.list.length * 2} 张本地 PNG，含普通和选中状态。`);
assert.equal(new Set(app.tabBar.list.map(tab => tab.pagePath)).size, app.tabBar.list.length);
app.pages.forEach(page => {
  assert.ok(!page.startsWith('/') && !page.includes('..'), `非法页面路径: ${page}`);
  ['js', 'json', 'wxml', 'wxss'].forEach(extension => assert.ok(existsSync(join(root, page + '.' + extension)), `缺少页面文件: ${page}.${extension}`));
});

const jsFiles = files.filter(file => file.endsWith('.js'));
jsFiles.forEach(file => new vm.Script(readFileSync(file, 'utf8'), { filename: file }));
// 只装载模块定义，绝不调用生命周期、wx.request 或页面事件。
const moduleCache = new Map();
function loadModule(file) {
  file = resolve(file);
  if (moduleCache.has(file)) return moduleCache.get(file);
  const module = { exports: {} };
  moduleCache.set(file, module.exports);
  let page;
  const sandbox = {
    module, exports: module.exports, Page(definition) { page = definition; }, App() {},
    require(path) {
      assert.ok(path.startsWith('.'), `小程序仅允许相对模块依赖: ${path}`);
      const target = resolve(dirname(file), path + (path.endsWith('.js') ? '' : '.js'));
      assert.ok(relative(root, target).startsWith('..') === false, '模块越过小程序目录');
      assert.ok(existsSync(target), `依赖不存在: ${target}`);
      return loadModule(target);
    }
  };
  new vm.Script(readFileSync(file, 'utf8'), { filename: file }).runInNewContext(sandbox);
  const result = page || module.exports;
  moduleCache.set(file, result);
  return result;
}

const nativeTags = new Set(['view', 'text', 'button', 'input', 'textarea', 'picker', 'scroll-view', 'block', 'checkbox-group', 'checkbox', 'label', 'canvas']);
const tipCopy = loadModule(join(root, 'utils/tips.js')).tips;
let bindingCount = 0;
for (const page of app.pages) {
  const definition = loadModule(join(root, page + '.js'));
  const wxml = read(page + '.wxml');
  for (const match of wxml.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    // WXML 不会把绑定表达式中的 HTML 实体解码成运算符；字符串里的实体是合法文本。
    const expression = match[1].replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '');
    const entity = /&(?:[a-zA-Z]+|#(?:[0-9]+|x[0-9a-fA-F]+));/.exec(expression);
    const line = wxml.slice(0, match.index).split('\n').length;
    assert.ok(!entity, `${page}.wxml:${line} 绑定表达式含 HTML 实体 ${entity?.[0]}，请使用原始运算符（如 &&、<、>）`);
  }
  for (const match of wxml.matchAll(/\b(?:bind|catch)(?::)?(?:tap|input|change|confirm|submit)="([^"]+)"/g)) {
    assert.equal(typeof definition[match[1]], 'function', `${page} 缺少事件处理器 ${match[1]}`);
    bindingCount++;
  }
  for (const match of wxml.matchAll(/data-tip="([^"]+)"/g))
    assert.ok(tipCopy[match[1]], `${page} 引用了不存在的提示 ${match[1]}`);
  assert.ok(!/\{\{[^}]*\.[A-Za-z]+\(/.test(wxml), `${page} WXML 不允许直接调用 JS 方法`);
  const tags = wxml.replace(/\{\{[\s\S]*?\}\}/g, '').matchAll(/<\/?([a-z][a-z\d-]*)\b[^>]*>/g);
  const stack = [];
  for (const match of tags) {
    assert.ok(nativeTags.has(match[1]), `${page} 不是已声明的原生标签: ${match[1]}`);
    const token = match[0];
    if (token.startsWith('</')) assert.equal(stack.pop(), match[1], `${page} 标签未配对: ${token}`);
    else if (!token.endsWith('/>')) stack.push(match[1]);
  }
  assert.equal(stack.length, 0, `${page} WXML 未闭合: ${stack.join(', ')}`);
}
let routeCount = 0;
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/url:\s*['"]\/(pages\/[a-z-]+\/index)(?:\?[^'"]*)?['"]/g)) {
    assert.ok(app.pages.includes(match[1]), `${file} 的导航页面不存在: ${match[1]}`);
    routeCount++;
  }
  if (!file.endsWith('config.js')) assert.ok(!source.includes('http://127.0.0.1:8787'), 'API 地址应只在 config.js 中配置');
}
const content = loadModule(join(root, 'data/content.js'));
assert.equal(content.modules.length, 13);
const apiConfig = loadModule(join(root, 'config.js'));
assert.ok(/^https?:\/\//.test(apiConfig.apiBase));

console.log(`小程序结构检查：${jsonFiles.length} 个 JSON，${jsFiles.length} 个 JS，${app.pages.length} 个页面，${app.tabBar.list.length} 个 Tab，${bindingCount} 处事件绑定，${routeCount} 处导航；工具 schema 由 API 提供。`);
const wccPath = process.env.WCC_PATH || '/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/wcc';
if (existsSync(wccPath)) {
  const output = mkdtempSync(join(tmpdir(), 'growup-wcc-'));
  try {
    const compilation = spawnSync(wccPath, ['-o', join(output, 'compiled.js'), ...app.pages.map(page => page + '.wxml')], { cwd: root, encoding: 'utf8' });
    assert.equal(compilation.status, 0, '真实 WXML 编译失败：' + (compilation.stderr || compilation.stdout || compilation.error));
    console.log(`微信 WXML 编译器检查通过：${app.pages.length} 个页面。`);
  } finally { rmSync(output, { recursive: true, force: true }); }
} else {
  if (process.argv.includes('--require-wcc')) throw new Error('没有找到 wcc，请通过 WCC_PATH 配置微信开发者工具内的编译器');
  console.log('没有找到 wcc：只完成结构与语法检查，未完成微信 WXML 编译。可设置 WCC_PATH 或传入 --require-wcc。');
}
console.log('本脚本不验证微信开发者工具运行、真机交互或上线。');

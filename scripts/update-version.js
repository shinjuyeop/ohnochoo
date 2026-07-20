const fs = require('fs');
const path = require('path');

// 한국 시간 (KST, UTC+9) 기준으로 버전 문자열 생성 (YYYY-MM-DD-HHMMSS)
const now = new Date();
const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
const yyyy = kst.getUTCFullYear();
const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
const dd = String(kst.getUTCDate()).padStart(2, '0');
const hh = String(kst.getUTCHours()).padStart(2, '0');
const min = String(kst.getUTCMinutes()).padStart(2, '0');
const ss = String(kst.getUTCSeconds()).padStart(2, '0');

const versionStr = `${yyyy}-${mm}-${dd}-${hh}${min}${ss}`;
const filePaths = [
  path.join(__dirname, '..', 'version.json'),
  path.join(__dirname, '..', 'public', 'version.json'),
];

try {
  const contents = JSON.stringify({ version: versionStr }, null, 2) + '\n';
  for (const filePath of filePaths) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }
  console.log(`[Success] version.json files updated to: ${versionStr}`);
} catch (err) {
  console.error('[Error] Failed to update version.json:', err);
  process.exit(1);
}

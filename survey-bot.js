const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Users\\Alan Garzon\\.cache\\puppeteer\\chrome\\win64-150.0.7871.24\\chrome-win64\\chrome.exe';
const PROFILE_DIR = path.join(__dirname, 'profile');
const LOG_FILE = path.join(__dirname, 'bot.log');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CAPTCHA_FLAG = path.join(__dirname, 'captcha.txt');
const SURVEY_CHECK_INTERVAL = 30000;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const textAnswers = [
  "Yes", "No", "Sometimes", "Usually", "Never", "Often",
  "I agree", "I disagree", "Neutral", "Good", "Fair", "Poor",
  "Excellent", "Satisfied", "Dissatisfied", "Very satisfied",
  "Daily", "Weekly", "Monthly", "Rarely",
  "Under 18", "18-24", "25-34", "35-44", "45-54", "55+",
  "Male", "Female", "Prefer not to say",
  "High school", "College", "Bachelor's", "Master's", "PhD",
  "$0-25k", "$25k-50k", "$50k-75k", "$75k-100k", "$100k+",
  "Employed full-time", "Employed part-time", "Self-employed", "Student", "Unemployed",
  "Single", "Married", "Divorced", "Widowed",
  "Yes, I have children", "No, I don't have children",
  "Rent", "Own", "Live with family",
  "City", "Suburbs", "Rural",
  "Android", "iOS", "Both", "Neither",
  "Netflix", "Amazon Prime", "Hulu", "Disney+", "HBO Max", "None",
  "Morning", "Afternoon", "Evening", "Night",
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function detectCaptcha(page) {
  const selectors = [
    'iframe[src*="recaptcha"]', 'iframe[src*="turnstile"]', 'iframe[src*="hcaptcha"]',
    '.g-recaptcha', '.cf-turnstile', '.h-captcha',
    '#captcha', '[class*="captcha"]', '[id*="captcha"]',
    'iframe[src*="challenges.cloudflare.com"]',
    '[aria-label*="captcha"]',
  ];
  for (const sel of selectors) {
    if (await page.$(sel)) return true;
  }
  return false;
}

async function waitForCaptchaSolved(page, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (!(await detectCaptcha(page))) {
      log('Captcha solved');
      return true;
    }
    await sleep(1000);
  }
  log('Captcha wait timeout');
  return false;
}

async function handleCaptcha(page) {
  log('*** CAPTCHA DETECTED ***');
  const shot = path.join(SCREENSHOT_DIR, `captcha-${Date.now()}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  for (let i = 0; i < 5; i++) { try { process.stdout.write('\x07'); } catch (e) {} }
  fs.writeFileSync(CAPTCHA_FLAG, `Solve captcha! Screenshot: ${shot}\n`);
  log(`Screenshot: ${shot}`);
  log('Solve captcha in the browser window...');
  const solved = await waitForCaptchaSolved(page);
  try { fs.unlinkSync(CAPTCHA_FLAG); } catch (e) {}
  return solved;
}

async function answerPage(page) {
  let answered = 0;
  const frames = [page, ...page.frames()];
  for (const frame of frames) {
    try {
      const context = await frame.executionContext();
      await context.evaluate(() => {
        document.querySelectorAll('input[type="radio"]').forEach((r, i, all) => {
          if (!r.checked && Math.random() > 0.3) r.click();
        });
        document.querySelectorAll('input[type="checkbox"]').forEach((c, i) => {
          if (i < 3 && Math.random() > 0.5 && !c.checked) c.click();
        });
        document.querySelectorAll('select').forEach(s => {
          const opts = s.querySelectorAll('option:not([value=""])');
          if (opts.length) s.selectedIndex = Math.floor(Math.random() * opts.length) + 1;
        });
        document.querySelectorAll('input[type="text"], input:not([type]), textarea').forEach(t => {
          if (!t.value && t.offsetParent !== null) {
            const p = (t.placeholder || '').toLowerCase();
            if (p.includes('email')) t.value = 'user' + Date.now() + '@example.com';
            else if (p.includes('phone') || p.includes('number')) t.value = '555-0100';
            else if (p.includes('zip') || p.includes('postal')) t.value = '10001';
            else if (p.includes('age') || p.includes('year')) t.value = '30';
            else if (p.includes('first') || p.includes('last') || p.includes('name')) t.value = 'John';
            else t.value = ['Good','Fine','Yes','No','Sometimes','Daily','Weekly','Never'][Math.floor(Math.random()*7)];
            t.dispatchEvent(new Event('input', { bubbles: true }));
            t.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      });
      answered++;
      const btns = await frame.$$('button, input[type="submit"], a[role="button"]');
      for (const btn of btns) {
        const text = (await btn.evaluate(el => el.textContent.trim().toLowerCase())) || '';
        if (['next','submit','continue','send','done','ok','finish','complete','yes, continue'].some(k => text.includes(k))) {
          try { await btn.click(); answered++; } catch (e) {}
          break;
        }
      }
    } catch (e) {}
  }
  return answered > 0;
}

async function waitForSurveyEnd(page, timeout = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const url = page.url().toLowerCase();
    if (url.includes('thank') || url.includes('complete') || url.includes('done') || url.includes('finished') || url.includes('success')) {
      log('Survey completion page detected');
      await sleep(2000);
      return true;
    }
    if (await detectCaptcha(page)) {
      await handleCaptcha(page);
    }
    await answerPage(page);
    await sleep(2000);
  }
  log('Survey wait timeout - closing');
  return false;
}

let browser;

async function main() {
  log('=== Survey Bot v2 ===');
  log('Browser will open for you to log in and solve captchas.');
  log('The bot handles everything else automatically.\n');

  browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    defaultViewport: { width: 1280, height: 900 },
    userDataDir: PROFILE_DIR,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
    ],
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  page.on('popup', async (popup) => {
    log('Popup detected - survey window opened');
    await popup.waitForSelector('body', { timeout: 10000 }).catch(() => {});
    log('Survey popup loaded, answering questions...');
    await waitForSurveyEnd(popup);
    try { await popup.close(); } catch (e) {}
    log('Survey popup closed, returning to main page');
    await page.bringToFront();
  });

  await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);

  const isLoggedIn = await page.evaluate(() => {
    return document.body.innerText.includes('Cashout') || !!document.querySelector('[href*="cashout"]');
  });

  if (!isLoggedIn) {
    log('Please log in to Freecash.com in the browser.');
    log('Waiting up to 5 minutes for login...');
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const ok = await page.evaluate(() => {
        return document.body.innerText.includes('Cashout') || !!document.querySelector('[href*="cashout"]');
      });
      if (ok) { log('Login detected!'); break; }
    }
  } else {
    log('Already logged in.');
  }

  log('\nBot running. Scans for surveys every 30s.');
  log('When captcha appears, solve it in the browser window.\n');

  let surveyCount = 0;
  const seenOffers = new Set();

  while (true) {
    try {
      await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);

      const offers = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('a, button, [role="button"], .offer, .task, [class*="offer"], [class*="card"]').forEach(el => {
          const text = (el.textContent || '').trim().toLowerCase();
          const href = el.href || '';
          if (text.includes('survey') || text.includes('start') || text.includes('play') || text.includes('earn')) {
            items.push({ text: text.slice(0, 80), href });
          }
        });
        return items;
      });

      if (offers.length > 0) {
        log(`Found ${offers.length} potential offers`);
        for (const o of offers.slice(0, 3)) {
          const key = o.text + o.href;
          if (seenOffers.has(key)) continue;
          seenOffers.add(key);
          log(`Clicking: "${o.text}"`);
          const links = await page.$$('a');
          for (const link of links) {
            const t = (await link.evaluate(el => el.textContent.trim().toLowerCase())) || '';
            if (o.text.includes(t) && (t.includes('survey') || t.includes('start'))) {
              try {
                await link.click();
                await sleep(5000);
                surveyCount++;
                log(`Survey #${surveyCount} started`);
                break;
              } catch (e) { log(`Click error: ${e.message}`); }
            }
          }
        }
      } else {
        log(`No offers found (${new Date().toLocaleTimeString()})`);
      }

      if (await detectCaptcha(page)) {
        await handleCaptcha(page);
      }
    } catch (e) {
      log(`Loop error: ${e.message}`);
    }
    await sleep(SURVEY_CHECK_INTERVAL);
  }
}

process.on('SIGINT', async () => {
  log('Shutting down...');
  if (browser) await browser.close();
  process.exit(0);
});

main().catch(async (e) => {
  log(`Fatal: ${e.message}`);
  console.error(e);
  if (browser) await browser.close();
  process.exit(1);
});

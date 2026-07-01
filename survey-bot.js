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
const STATE_FILE = path.join(__dirname, 'session.json');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function log(msg) { const line = `[${new Date().toISOString()}] ${msg}`; console.log(line); fs.appendFileSync(LOG_FILE, line + '\n'); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

let sessionState = { answers: {}, surveyCount: 0, startTime: Date.now(), disqualified: 0, completed: 0 };
try { if (fs.existsSync(STATE_FILE)) sessionState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) {}

function saveState() { fs.writeFileSync(STATE_FILE, JSON.stringify(sessionState, null, 2)); }

const answerBank = {
  yesno: ['Yes', 'No', 'Sometimes', 'Usually', 'Never', 'Rarely', 'Definitely', 'Probably not'],
  frequency: ['Daily', 'Weekly', 'Monthly', 'Several times a week', 'Several times a month', 'Once in a while', 'Never'],
  satisfaction: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'],
  agreement: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
  likelihood: ['Extremely likely', 'Very likely', 'Somewhat likely', 'Not very likely', 'Not at all likely'],
  quality: ['Excellent', 'Good', 'Average', 'Fair', 'Poor'],
  age: ['18-24', '25-34', '35-44', '45-54', '55+'],
  gender: ['Male', 'Female', 'Prefer not to say'],
  income: ['Under $25,000', '$25,000 - $49,999', '$50,000 - $74,999', '$75,000 - $99,999', '$100,000+'],
  education: ['High school', 'Some college', 'Bachelor\'s degree', 'Master\'s degree', 'PhD/Doctorate'],
  employment: ['Employed full-time', 'Employed part-time', 'Self-employed', 'Student', 'Unemployed', 'Retired'],
  region: ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Australia'],
  household: ['1', '2', '3', '4', '5+'],
  children: ['Yes', 'No'],
  browsing: ['Desktop/Laptop', 'Mobile phone', 'Tablet', 'All of the above'],
  social: ['Facebook', 'Instagram', 'Twitter/X', 'TikTok', 'YouTube', 'LinkedIn', 'Reddit', 'Snapchat', 'None of the above'],
  streaming: ['Netflix', 'Amazon Prime', 'Hulu', 'Disney+', 'HBO Max', 'Apple TV+', 'None'],
  shopping: ['Amazon', 'Walmart', 'Target', 'eBay', 'Etsy', 'Best Buy', 'Other'],
  health: ['Excellent', 'Good', 'Fair', 'Poor'],
  exercise: ['Daily', 'Several times a week', 'Once a week', 'Rarely', 'Never'],
};

function getAnswer(category) {
  if (!sessionState.answers[category]) {
    sessionState.answers[category] = {};
  }
  const answers = answerBank[category];
  if (!answers) return 'Yes';
  const used = Object.keys(sessionState.answers[category]);
  const available = answers.filter(a => !used.includes(a));
  if (available.length === 0) {
    sessionState.answers[category] = {};
    return answers[Math.floor(Math.random() * answers.length)];
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  sessionState.answers[category][pick] = true;
  saveState();
  return pick;
}

function classifyQuestion(text) {
  const t = text.toLowerCase();
  if (/\b(yes|no|do you|are you|have you|is it|does it|would you|will you)\b/.test(t)) return 'yesno';
  if (/\b(frequency|how often|times per|times a |per day|per week|per month)\b/.test(t)) return 'frequency';
  if (/\b(satisf(y|ied)|satisfaction|how satisfied)\b/.test(t)) return 'satisfaction';
  if (/\b(agree|agree|strongly|disagree|to what extent)\b/.test(t)) return 'agreement';
  if (/\b(likely|likelihood|how likely|probability)\b/.test(t)) return 'likelihood';
  if (/\b(quality|how would you rate|excellent|poor|rate the)\b/.test(t)) return 'quality';
  if (/\b(age|how old|age group|year old)\b/.test(t)) return 'age';
  if (/\b(gender|sex|male|female)\b/.test(t)) return 'gender';
  if (/\b(income|salary|earn|make per year)\b/.test(t)) return 'income';
  if (/\b(education|degree|college|university|high school)\b/.test(t)) return 'education';
  if (/\b(employ|job|work|occupation|career|student|retired)\b/.test(t)) return 'employment';
  if (/\b(region|country|live|located|area|state)\b/.test(t)) return 'region';
  if (/\b(household|people living|family size|how many people)\b/.test(t)) return 'household';
  if (/\b(children|kids|child|parent)\b/.test(t)) return 'children';
  if (/\b(brows(e|er)|device|computer|phone|mobile|desktop)\b/.test(t)) return 'browsing';
  if (/\b(social media|facebook|instagram|twitter|tiktok)\b/.test(t)) return 'social';
  if (/\b(stream|netflix|hulu|disney|hbo|watch)\b/.test(t)) return 'streaming';
  if (/\b(shopping|buy|purchase|store|amazon|walmart)\b/.test(t)) return 'shopping';
  if (/\b(health|medical|condition|wellness|sick)\b/.test(t)) return 'health';
  if (/\b(exercise|workout|gym|physical|active|sport)\b/.test(t)) return 'exercise';
  return null;
}

function getSmartText(fieldText) {
  const known = {
    email: () => `user${Math.floor(Math.random() * 99999)}@email.com`,
    phone: () => '555-' + String(Math.floor(Math.random() * 900) + 100).padStart(3, '0') + '-' + String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0'),
    zip: () => String(Math.floor(Math.random() * 90000) + 10000),
    postal: () => String(Math.floor(Math.random() * 90000) + 10000),
    code: () => String(Math.floor(Math.random() * 90000) + 10000),
    name: () => ['Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Sam', 'Jamie'][Math.floor(Math.random() * 8)],
    first: () => ['Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Sam', 'Jamie'][Math.floor(Math.random() * 8)],
    last: () => ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'][Math.floor(Math.random() * 8)],
    city: () => ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'][Math.floor(Math.random() * 8)],
    state: () => ['California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia'][Math.floor(Math.random() * 8)],
    occupation: () => ['Software Engineer', 'Teacher', 'Nurse', 'Manager', 'Sales Representative', 'Analyst', 'Consultant', 'Administrator'][Math.floor(Math.random() * 8)],
    company: () => ['Tech Corp', 'Global Solutions', 'Innovation Inc', 'Premier Services', 'Atlas Group', 'Summit Industries'][Math.floor(Math.random() * 6)],
  };
  for (const [key, fn] of Object.entries(known)) {
    if (fieldText.includes(key)) return fn();
  }
  const categories = Object.keys(answerBank);
  const cat = categories[Math.floor(Math.random() * categories.length)];
  return getAnswer(cat);
}

async function captchaGuard(page) {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]', 'iframe[src*="turnstile"]', 'iframe[src*="hcaptcha"]',
    '.g-recaptcha', '.cf-turnstile', '.h-captcha',
    '#captcha', '[class*="captcha"]', '[id*="captcha"]',
    'iframe[src*="challenges.cloudflare.com"]',
    '[aria-label*="captcha"]',
    'div[style*="visibility: visible"][style*="position: absolute"]',
  ];
  for (const sel of captchaSelectors) {
    if (await page.$(sel).catch(() => null)) {
      log('*** CAPTCHA DETECTED ***');
      const shot = path.join(SCREENSHOT_DIR, `captcha-${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
      for (let i = 0; i < 5; i++) { try { process.stdout.write('\x07'); } catch (e) {} }
      fs.writeFileSync(CAPTCHA_FLAG, `CAPTCHA at ${new Date().toISOString()}\nSolve in browser! Screenshot: ${shot}\n`);
      log(`Screenshot: ${shot}`);
      const start = Date.now();
      while (Date.now() - start < 180000) {
        if (!(await page.$(sel).catch(() => false))) {
          log('Captcha solved!');
          fs.unlinkSync(CAPTCHA_FLAG);
          return true;
        }
        await sleep(1000);
      }
      log('Captcha timeout');
      return false;
    }
  }
  return true;
}

async function surveyBrain(framePage, depth = 0) {
  if (depth > 3) return false;
  if (!(await captchaGuard(framePage))) return false;

  const url = framePage.url().toLowerCase();
  if (url.includes('thank') || url.includes('complete') || url.includes('finished') || url.includes('success') || url.includes('congratulations')) {
    log('Completion page detected');
    await sleep(2000);
    sessionState.completed++;
    saveState();
    return true;
  }
  if (url.includes('disqualif') || url.includes('screen') || url.includes('unfortunately') || url.includes('not a match') || url.includes('quotafull')) {
    log('Disqualified from survey');
    sessionState.disqualified++;
    saveState();
    return true;
  }

  let interacted = false;
  const frames = [framePage, ...framePage.frames()];

  for (const f of frames) {
    try {
      const answered = await f.evaluate(() => {
        let count = 0;
        const used = new Set();

        document.querySelectorAll('input[type="radio"]').forEach(r => {
          const name = r.name || r.id || '';
          if (!name || used.has(name)) return;
          const group = document.querySelectorAll(`input[type="radio"][name="${r.name}"]`);
          const midIdx = Math.floor(group.length / 2);
          const pick = group[Math.min(midIdx + Math.floor(Math.random() * 2 - 1), group.length - 1)];
          if (!pick.checked) { pick.click(); count++; }
          used.add(name);
        });

        document.querySelectorAll('input[type="checkbox"]').forEach((c, i) => {
          if (i < 3 && Math.random() > 0.4 && !c.checked) { c.click(); count++; }
        });

        document.querySelectorAll('select').forEach(s => {
          const opts = [...s.querySelectorAll('option')].filter(o => o.value && o.value !== s.value);
          const mid = Math.floor(opts.length / 2);
          const pick = opts[Math.min(mid + Math.floor(Math.random() * 2 - 1), opts.length - 1)];
          if (pick) { s.value = pick.value; s.dispatchEvent(new Event('change', { bubbles: true })); count++; }
        });

        document.querySelectorAll('input[type="text"], input:not([type]), input[type="number"], textarea').forEach(t => {
          if (t.value || t.offsetParent === null) return;
          const p = (t.placeholder || '').toLowerCase();
          const id = (t.id || '').toLowerCase();
          const label = (document.querySelector(`label[for="${t.id}"]`) || {}).textContent || '';
          const ctx = p + ' ' + id + ' ' + label.toLowerCase();

          if (ctx.includes('email')) t.value = `user${Date.now()}@email.com`;
          else if (ctx.includes('phone')) t.value = '555-0100';
          else if (ctx.includes('zip') || ctx.includes('postal')) t.value = '10001';
          else if (ctx.includes('name') || ctx.includes('first') || ctx.includes('last')) t.value = ['Alex','Jordan','Morgan','Taylor'][Math.floor(Math.random()*4)];
          else if (ctx.includes('code')) t.value = String(Math.floor(Math.random() * 99999));
          else t.value = ['Good','Fine','Yes','No','Sometimes','Daily','Weekly','Never','3-4 times','Once or twice','Several'][Math.floor(Math.random()*11)];

          t.dispatchEvent(new Event('input', { bubbles: true }));
          t.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        });

        const btns = [...document.querySelectorAll('button, input[type="submit"], input[type="image"], a[role="button"], .btn, [class*="button"]')];
        for (const btn of btns) {
          const txt = (btn.textContent || btn.value || '').trim().toLowerCase();
          if (['next','submit','continue','send','done','ok','finish','complete','yes','confirm','forward','proceed','>>','>','start survey','begin survey','i agree'].some(k => txt.includes(k))) {
            if (btn.offsetParent !== null) { btn.click(); count++; break; }
          }
        }
        return count;
      });
      if (answered > 0) interacted = true;
    } catch (e) {
      if (depth < 2 && f !== framePage) {
        try {
          const innerAnswered = await surveyBrain(f, depth + 1);
          if (innerAnswered) interacted = true;
        } catch (innerE) {}
      }
    }
  }
  return interacted;
}

async function handleSurveyPopup(popup) {
  try {
    await popup.waitForSelector('body', { timeout: 20000 });
  } catch (e) {
    log('Popup had no body, closing');
    try { popup.close(); } catch(e2) {}
    return;
  }

  log('Survey popup detected, running brain...');
  const url = popup.url().toLowerCase();
  log(`Survey URL: ${url.slice(0, 200)}`);

  const start = Date.now();
  let lastActivity = Date.now();
  let idleLoops = 0;

  while (Date.now() - start < 300000) {
    if (Date.now() - lastActivity > 30000) idleLoops++;
    else idleLoops = 0;

    if (idleLoops > 3) {
      log('No activity for 90s, closing survey');
      break;
    }

    const currentUrl = popup.url().toLowerCase();
    if (currentUrl.includes('thank') || currentUrl.includes('complete') || currentUrl.includes('congratulations')) {
      log('Survey completed!');
      sessionState.completed++;
      saveState();
      await sleep(3000);
      break;
    }
    if (currentUrl.includes('disqualif') || currentUrl.includes('quotafull') || currentUrl.includes('not a match')) {
      log('Screen-out / disqualified');
      sessionState.disqualified++;
      saveState();
      await sleep(2000);
      break;
    }

    try {
      const acted = await surveyBrain(popup);
      if (acted) {
        lastActivity = Date.now();
        await captchaGuard(popup);
      }
    } catch (e) {
      log(`Popup loop error: ${e.message.slice(0, 100)}`);
    }

    if (popup.isClosed()) break;
    await sleep(1500 + Math.random() * 2000);
  }

  try { if (!popup.isClosed()) await popup.close(); } catch (e) {}
  log('Survey popup closed');
}

let browser;

async function main() {
  log('=== Survey Bot v3 (Intelligent) ===');
  log(`Session: ${sessionState.completed} completed, ${sessionState.disqualified} disqualified, ${sessionState.surveyCount} started`);

  browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    defaultViewport: { width: 1280, height: 900 },
    userDataDir: PROFILE_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const activePopups = new Set();

  page.on('popup', async (popup) => {
    if (activePopups.size >= 2) {
      try { popup.close(); } catch(e) {}
      return;
    }
    activePopups.add(popup);
    await handleSurveyPopup(popup);
    activePopups.delete(popup);
    try { await page.bringToFront(); } catch(e) {}
  });

  await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(5000);

  const isLoggedIn = await page.evaluate(() =>
    document.body.innerText.includes('Cashout') || !!document.querySelector('[href*="cashout"]')
  );

  if (!isLoggedIn) {
    log('Waiting for login...');
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const ok = await page.evaluate(() =>
        document.body.innerText.includes('Cashout') || !!document.querySelector('[href*="cashout"]')
      );
      if (ok) { log('Logged in!'); break; }
    }
  }

  log('\n=== Survey Bot running ===');
  log(`Completed this session: ${sessionState.completed}`);
  log(`Disqualified: ${sessionState.disqualified}`);
  log(`Watch the browser window. Solve captchas when prompted.\n`);

  let fails = 0;

  while (true) {
    try {
      if (activePopups.size > 0) {
        await sleep(15000);
        continue;
      }

      await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(5000);

      for (let scroll = 0; scroll < 5; scroll++) {
        await page.evaluate(() => window.scrollBy(0, 400));
        await sleep(800 + Math.random() * 500);
      }

      const offerTexts = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('a, button, [role="button"], [class*="offer"], [class*="card"], [class*="item"], [class*="tile"]').forEach(el => {
          const text = (el.textContent || '').trim();
          const href = el.href || '';
          if (text && text.length > 5 && !items.find(i => i.text === text)) {
            items.push({ text: text.slice(0, 120), href, rect: el.getBoundingClientRect() });
          }
        });
        return items.filter(i => i.rect && i.rect.top < window.innerHeight && i.rect.bottom > 0);
      });

      const clicks = offerTexts.filter(o => {
        const t = o.text.toLowerCase();
        const worthScore = (t.match(/\$\d+/g) || []).reduce((sum, n) => sum + parseFloat(n.replace('$','')), 0);
        return worthScore > 0 || t.includes('survey') || t.includes('start') || t.includes('play now') || t.includes('get paid');
      }).sort((a, b) => {
        const aVal = (a.text.match(/\$\d+/g) || []).reduce((s, n) => s + parseFloat(n.replace('$','')), 0);
        const bVal = (b.text.match(/\$\d+/g) || []).reduce((s, n) => s + parseFloat(n.replace('$','')), 0);
        return bVal - aVal;
      });

      if (clicks.length > 0) {
        const target = clicks[Math.floor(Math.random() * Math.min(clicks.length, 3))];
        log(`Clicking offer: "${target.text.slice(0, 80)}"`);
        fails = 0;

        const clickable = await page.$(`a[href="${target.href}"]`);
        if (clickable) {
          await clickable.click().catch(() => {});
          await sleep(5000 + Math.random() * 3000);
          sessionState.surveyCount++;
          saveState();
        }
      } else {
        fails++;
        log(`No visible offers found (attempt ${fails})`);
        if (fails >= 5) {
          log('5 failed scans. Refreshing page...');
          await page.reload({ waitUntil: 'domcontentloaded' });
          await sleep(5000);
          fails = 0;
        }
      }

      await captchaGuard(page);
      log(`Status: ${sessionState.completed} done, ${sessionState.disqualified} dq, ${fails} failed scans`);
    } catch (e) {
      log(`Main error: ${e.message.slice(0, 150)}`);
      fails++;
    }

    await sleep(25000 + Math.random() * 10000);
  }
}

process.on('SIGINT', async () => {
  log('Shutting down...');
  saveState();
  if (browser) await browser.close();
  process.exit(0);
});

main().catch(async (e) => {
  log(`Fatal: ${e.message}`);
  console.error(e);
  saveState();
  if (browser) await browser.close();
  process.exit(1);
});

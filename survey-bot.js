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

const log = (msg) => { const l = `[${new Date().toISOString()}] ${msg}`; console.log(l); fs.appendFileSync(LOG_FILE, l + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let sessionState = { surveyCount: 0, completed: 0, disqualified: 0, startTime: Date.now() };
try { if (fs.existsSync(STATE_FILE)) sessionState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) {}
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(sessionState, null, 2));

// ── GOLDEN PROFILE ──────────────────────────────────────────────────────────────
const GOLDEN = {
  age: '25-34',
  gender: 'Female',
  income: '$50,000 - $74,999',
  education: "Bachelor's degree",
  employment: 'Employed full-time',
  occupation: 'Marketing Manager',
  industry: 'Technology',
  company: 'Mid-size company (50-999 employees)',
  household: '3',
  children: 'Yes',
  childrenAges: '6-12',
  marital: 'Married',
  homeowner: 'Own',
  residence: 'Suburbs',
  region: 'United States',
  state: 'California',
  city: 'San Diego',
  zip: '92101',
  ethnicity: 'White / Caucasian',
  health: 'Good',
  exercise: 'Several times a week',
  diet: 'Omnivore',
  smoker: 'No',
  alcohol: 'Socially',
  shopping: 'Amazon',
  shoppingFreq: 'Weekly',
  streaming: 'Netflix',
  streamingHours: '1-3 hours',
  socialMedia: ['Facebook', 'Instagram', 'YouTube'],
  browser: 'Desktop/Laptop',
  mobile: 'iPhone',
  carrier: 'Verizon',
  pet: 'Dog',
  travel: '1-2 times per year',
  car: 'Toyota',
  carAge: '3-5 years',
  insurance: ['Health', 'Auto', 'Home'],
  banking: ['Checking', 'Savings', 'Credit Card'],
  invest: 'Yes',
  crypto: 'No',
  dining: '2-3 times per week',
  cooking: 'Several times a week',
  hobbies: ['Reading', 'Cooking', 'Hiking', 'Photography'],
};

// ── OFFERWALL DETECTION ──────────────────────────────────────────────────────────
const OFFERWALLS = [
  { name: 'Revenue Universe', domains: ['rev-u.com', 'revenueuniverse', 'revunetechnology'] },
  { name: 'AdGem', domains: ['adgem.com', 'adgem'] },
  { name: 'BitLabs', domains: ['bitlabs.com', 'bitlabs', 'bitlabsapi'] },
  { name: 'Lootably', domains: ['lootably.com', 'lootably'] },
  { name: 'CPX Research', domains: ['cpxresearch.com', 'cpx', 'cpxsurvey'] },
  { name: 'Adscend Media', domains: ['adscendmedia.com', 'adscend'] },
  { name: 'YourSurveys', domains: ['your-surveys.com', 'yoursurveys'] },
  { name: 'Pollfish', domains: ['pollfish.com', 'pollfish'] },
  { name: 'Toluna', domains: ['toluna.com', 'toluna'] },
  { name: 'Samplicio', domains: ['samplicio.us', 'samplicio'] },
];

function detectOfferwall(url) {
  const u = url.toLowerCase();
  for (const w of OFFERWALLS) {
    if (w.domains.some(d => u.includes(d))) return w.name;
  }
  return 'Unknown';
}

// ── SURVEY TOPIC ANALYSIS ─────────────────────────────────────────────────────────
const TOPICS = {
  automotive: { keywords: ['car', 'auto', 'vehicle', 'driving', 'truck', 'toyota', 'honda', 'ford', 'tesla', 'gas', 'insurance auto'], profile: { car: 'Toyota Camry', carAge: '3-5 years', insurance: ['Health','Auto','Home'] } },
  health: { keywords: ['health', 'medical', 'insurance health', 'doctor', 'hospital', 'pharma', 'drug', 'vitamin', 'wellness', 'condition', 'disease', 'symptom', 'covid'], profile: { health: 'Good', exercise: 'Several times a week', smoker: 'No', alcohol: 'Socially', diet: 'Omnivore' } },
  technology: { keywords: ['tech', 'software', 'app', 'computer', 'laptop', 'smartphone', 'gadget', 'device', 'internet', 'wifi', 'streaming', 'gaming console'], profile: { browser: 'Desktop/Laptop', mobile: 'iPhone 15', hobbies: ['Reading','Cooking','Hiking','Photography','Gaming'] } },
  gaming: { keywords: ['gaming', 'video game', 'console', 'xbox', 'playstation', 'nintendo', 'pc game', 'mobile game', 'esport', 'roblox', 'fortnite', 'minecraft'], profile: { hobbies: ['Gaming','Reading','Streaming'], streamingHours: '3-5 hours', browser: 'Desktop/Laptop' } },
  finance: { keywords: ['finance', 'bank', 'credit card', 'mortgage', 'loan', 'invest', 'saving', 'retirement', 'crypto', 'stock', 'insurance life'], profile: { banking: ['Checking','Savings','Credit Card','Investment'], invest: 'Yes', income: '$75,000 - $99,999' } },
  travel: { keywords: ['travel', 'vacation', 'hotel', 'flight', 'airline', 'cruise', 'trip', 'tourist', 'destination', 'travel insurance'], profile: { travel: '3-4 times per year', hobbies: ['Travel','Photography','Hiking'] } },
  shopping: { keywords: ['shop', 'retail', 'store', 'online shop', 'amazon', 'walmart', 'target', 'fashion', 'clothing', 'beauty', 'cosmetic', 'brand'], profile: { shoppingFreq: 'Weekly', shopping: 'Amazon', dining: '3-4 times per week' } },
  food: { keywords: ['food', 'restaurant', 'cooking', 'grocery', 'snack', 'beverage', 'drink', 'diet', 'nutrition', 'meal', 'recipe'], profile: { cooking: 'Daily', dining: '3-4 times per week', diet: 'Omnivore', hobbies: ['Cooking','Reading'] } },
  entertainment: { keywords: ['movie', 'tv', 'show', 'netflix', 'hulu', 'disney', 'stream', 'music', 'concert', 'ticket', 'entertainment'], profile: { streamingHours: '3-5 hours', streaming: 'Netflix', hobbies: ['Streaming','Reading'] } },
  parenting: { keywords: ['parent', 'child', 'kid', 'family', 'baby', 'toddler', 'school', 'education child', 'toy'], profile: { children: 'Yes', childrenAges: '6-12', marital: 'Married', household: '3', hobbies: ['Reading','Cooking','Photography'] } },
  education: { keywords: ['education', 'college', 'university', 'school', 'student', 'learning', 'course', 'degree', 'online learning'], profile: { education: "Master's degree", occupation: 'Marketing Manager', industry: 'Technology' } },
  pet: { keywords: ['pet', 'dog', 'cat', 'veterinary', 'pet food', 'animal'], profile: { pet: 'Dog', hobbies: ['Hiking','Photography'] } },
  home: { keywords: ['home', 'house', 'garden', 'renovation', 'furniture', 'decor', 'appliance', 'cleaning', 'home improvement'], profile: { homeowner: 'Own', residence: 'Suburbs', hobbies: ['Cooking','Gardening'] } },
  fitness: { keywords: ['fitness', 'gym', 'exercise', 'workout', 'sport', 'athletic', 'running', 'yoga', 'supplement'], profile: { exercise: 'Daily', health: 'Excellent', hobbies: ['Hiking','Running','Yoga'] } },
};

function analyzeOffer(text) {
  const t = text.toLowerCase();
  const money = [...t.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map(m => parseFloat(m[1]));
  const reward = money.length > 0 ? Math.max(...money) : 0;
  const topicScores = {};
  for (const [topic, data] of Object.entries(TOPICS)) {
    let score = 0;
    for (const kw of data.keywords) {
      if (t.includes(kw)) score++;
    }
    if (score > 0) topicScores[topic] = score;
  }
  const sortedTopics = Object.entries(topicScores).sort((a, b) => b[1] - a[1]);
  const primaryTopic = sortedTopics.length > 0 ? sortedTopics[0][0] : null;
  return { text: t, reward, topics: sortedTopics.map(s => s[0]), primaryTopic };
}

function getProfileForSurvey(offerText) {
  const analysis = analyzeOffer(offerText);
  const profile = { ...GOLDEN };
  if (analysis.primaryTopic && TOPICS[analysis.primaryTopic]) {
    Object.assign(profile, TOPICS[analysis.primaryTopic].profile);
  }
  return profile;
}

// ── ANSWER GENERATION ─────────────────────────────────────────────────────────
let currentSurveyProfile = null;
let usedAnswers = {};

function resetProfile(offerText) {
  currentSurveyProfile = getProfileForSurvey(offerText);
  usedAnswers = {};
}

function findProfileValue(questionText) {
  if (!currentSurveyProfile) return null;
  const t = questionText.toLowerCase();

  const map = [
    ['age', ['age', 'how old', 'year old', 'age group']],
    ['gender', ['gender', 'sex', 'male', 'female', 'man', 'woman']],
    ['income', ['income', 'salary', 'earn', 'make per year', 'household income']],
    ['education', ['education', 'degree', 'college', 'university', 'high school', 'level of school']],
    ['employment', ['employ', 'job', 'work', 'occupation', 'career', 'working', 'student', 'retired', 'current status']],
    ['occupation', ['occupation', 'job title', 'what do you do', 'position', 'role']],
    ['industry', ['industry', 'sector', 'field of work', 'company type']],
    ['company', ['company size', 'employer size', 'number of employee', 'company type']],
    ['marital', ['marital', 'married', 'single', 'relationship', 'status']],
    ['household', ['household', 'people in your home', 'family size', 'live with', 'how many people']],
    ['children', ['children', 'kids', 'child', 'parent', 'have any']],
    ['childrenAges', ['age of your child', 'oldest child', 'youngest child', 'child age']],
    ['homeowner', ['home', 'house', 'own', 'rent', 'live', 'residence type', 'housing', 'property']],
    ['residence', ['urban', 'rural', 'suburb', 'area', 'community type']],
    ['region', ['region', 'country', 'where do you live', 'nation', 'located', 'area']],
    ['state', ['state', 'province', 'region us']],
    ['ethnicity', ['ethnic', 'race', 'background', 'hispanic', 'origin']],
    ['health', ['health', 'wellness', 'medical condition', 'health status', 'how is your health']],
    ['exercise', ['exercise', 'workout', 'physical activity', 'active', 'gym', 'sport']],
    ['diet', ['diet', 'eat', 'food', 'meal', 'vegetarian', 'vegan', 'dietary']],
    ['smoker', ['smoke', 'tobacco', 'cigarette', 'vape', 'nicotine']],
    ['alcohol', ['alcohol', 'drink', 'beer', 'wine', 'liquor']],
    ['shopping', ['shop', 'store', 'retail', 'where do you shop', 'online shopping']],
    ['shoppingFreq', ['how often do you shop', 'shopping frequency', 'shop online']],
    ['streaming', ['stream', 'netflix', 'hulu', 'disney', 'hbo', 'watch tv']],
    ['streamingHours', ['hours of tv', 'watch per day', 'screen time', 'media consumption']],
    ['socialMedia', ['social media', 'facebook', 'instagram', 'twitter', 'tiktok', 'social network']],
    ['mobile', ['smartphone', 'phone', 'iphone', 'android', 'mobile device', 'cell phone']],
    ['carrier', ['carrier', 'mobile provider', 'cell provider', 'verizon', 'at&t', 't-mobile']],
    ['pet', ['pet', 'dog', 'cat', 'animal']],
    ['travel', ['travel', 'vacation', 'trip', 'holiday', 'flight']],
    ['car', ['car', 'vehicle', 'automobile', 'drive']],
    ['carAge', ['car age', 'vehicle age', 'how old is your car', 'when did you buy']],
    ['insurance', ['insurance', 'coverage', 'policy']],
    ['banking', ['bank', 'checking', 'saving', 'account', 'banking product']],
    ['invest', ['invest', 'stock', 'bond', 'mutual fund', 'retirement account', '401k']],
    ['crypto', ['crypto', 'bitcoin', 'ethereum', 'digital currency', 'nft']],
    ['dining', ['dining', 'restaurant', 'eat out', 'takeout']],
    ['cooking', ['cooking', 'cook', 'meal prep', 'homemade']],
    ['hobbies', ['hobby', 'interest', 'free time', 'leisure', 'spare time', 'activity']],
    ['browser', ['device', 'computer', 'laptop', 'desktop', 'tablet', 'browsing device', 'primary device']],
  ];

  for (const [key, patterns] of map) {
    if (patterns.some(p => t.includes(p))) {
      const val = currentSurveyProfile[key];
      if (val) return val;
    }
  }
  return null;
}

function getSmartAnswer(questionText, elementType = 'radio') {
  const fromProfile = findProfileValue(questionText);
  if (fromProfile) {
    if (Array.isArray(fromProfile)) return fromProfile[Math.floor(Math.random() * fromProfile.length)];
    return fromProfile;
  }

  const t = questionText.toLowerCase();

  if (elementType === 'checkbox') return Math.random() > 0.4;

  if (t.includes('yes') || t.includes('do you') || t.includes('are you') || t.includes('have you') || t.includes('is it') || t.includes('does it') || t.includes('would you') || t.includes('will you') || t.includes('did you')) {
    return 'Yes';
  }
  if (t.includes('frequency') || t.includes('how often') || t.includes('per day') || t.includes('per week') || t.includes('per month')) {
    return 'Several times a week';
  }
  if (t.includes('satisf') || t.includes('how satisfied') || t.includes('rate your')) return 'Satisfied';
  if (t.includes('agree') || t.includes('extent')) return 'Agree';
  if (t.includes('likely') || t.includes('how likely')) return 'Very likely';
  if (t.includes('quality') || t.includes('rate the') || t.includes('excellent')) return 'Good';
  if (t.includes('recommend')) return 'Very likely';
  if (t.includes('importance') || t.includes('important')) return 'Important';
  if (t.includes('often')) return 'Often';

  return null;
}

async function getPageText(framePage, selector) {
  try {
    const el = await framePage.$(selector);
    return el ? await el.evaluate(e => e.textContent.trim()) : '';
  } catch (e) { return ''; }
}

// ── CAPTCHA HANDLING ─────────────────────────────────────────────────────────
async function checkCaptcha(page) {
  const sels = [
    'iframe[src*="recaptcha"]', 'iframe[src*="turnstile"]', 'iframe[src*="hcaptcha"]',
    '.g-recaptcha', '.cf-turnstile', '.h-captcha',
    '#captcha', '[class*="captcha"]', '[id*="captcha"]',
    'iframe[src*="challenges.cloudflare.com"]',
  ];
  for (const sel of sels) {
    if (await page.$(sel).catch(() => null)) return sel;
  }
  return null;
}

async function handleCaptcha(page) {
  const sel = await checkCaptcha(page);
  if (!sel) return true;
  log('*** CAPTCHA ***');
  const shot = path.join(SCREENSHOT_DIR, `captcha-${Date.now()}.png`);
  await page.screenshot({ path: shot }).catch(() => {});
  for (let i = 0; i < 5; i++) { try { process.stdout.write('\x07'); } catch (e) {} }
  fs.writeFileSync(CAPTCHA_FLAG, `CAPTCHA at ${new Date().toISOString()}\nSolve in browser! Screenshot: ${shot}`);
  log(`Captcha screenshot: ${shot}`);
  const start = Date.now();
  while (Date.now() - start < 180000) {
    if (!(await page.$(sel).catch(() => null))) { log('Captcha solved!'); try { fs.unlinkSync(CAPTCHA_FLAG); } catch(e) {} return true; }
    await sleep(1000);
  }
  log('Captcha timeout');
  return false;
}

// ── SURVEY ANSWERING ENGINE ───────────────────────────────────────────────────
async function answerPage(framePage) {
  if (!(await handleCaptcha(framePage))) return false;
  let interacted = false;
  const frames = [framePage, ...framePage.frames()];

  for (const f of frames) {
    try {
      const answered = await f.evaluate((profileStr) => {
        const p = JSON.parse(profileStr);
        let c = 0;
        const done = new Set();

        // Label extraction helper (looks for text near the input)
        const getQuestionText = (el) => {
          const label = el.closest('div, fieldset, li, .question, .row, .form-group');
          if (label) {
            const clone = label.cloneNode(true);
            const inputs = clone.querySelectorAll('input, select, textarea, button');
            inputs.forEach(inp => inp.remove());
            return (clone.textContent || '').trim().slice(0, 200);
          }
          return el.getAttribute('aria-label') || el.placeholder || el.id || '';
        };

        // Radios
        document.querySelectorAll('input[type="radio"]').forEach(r => {
          const name = r.name || '';
          if (!name || done.has(name)) return;
          const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)];
          if (group.length === 0) return;
          const qText = getQuestionText(group[0]);
          const preferred = p[Object.keys(p).find(k => qText.toLowerCase().includes(k.toLowerCase()))];
          let pick;
          if (preferred && Array.isArray(preferred)) {
            pick = group.find(g => g.value && preferred.some(pv => g.value.toLowerCase().includes(pv.toLowerCase())));
          } else if (preferred) {
            pick = group.find(g => g.value && g.value.toLowerCase().includes(String(preferred).toLowerCase()));
          }
          if (!pick) {
            const values = group.map(g => ({ el: g, v: g.value })).filter(x => x.v);
            if (values.length <= 2) pick = values.find(v => v.v === 'Yes' || v.v === '1' || v.v === 'true')?.el || values[0]?.el;
            else pick = values[Math.floor(values.length * 0.4)]?.el;
          }
          if (pick && !pick.checked) { pick.click(); c++; }
          done.add(name);
        });

        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
          if (cb.checked || i >= 3) return;
          const qText = getQuestionText(cb);
          const val = cb.value.toLowerCase();
          if (i === 0 || Math.random() > 0.4) { cb.click(); c++; }
        });

        // Selects
        document.querySelectorAll('select').forEach(s => {
          const opts = [...s.options].filter(o => o.value && o.value !== s.value);
          if (opts.length === 0) return;
          const qText = getQuestionText(s);
          const preferred = p[Object.keys(p).find(k => qText.toLowerCase().includes(k.toLowerCase()))];
          let pick;
          if (preferred) pick = opts.find(o => o.text.toLowerCase().includes(String(preferred).toLowerCase()));
          if (!pick) pick = opts[Math.floor(opts.length * 0.4)];
          if (pick) { s.value = pick.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; }
        });

        // Text inputs
        document.querySelectorAll('input[type="text"], input:not([type]), input[type="number"], textarea').forEach(t => {
          if (t.value || t.offsetParent === null) return;
          const ctx = (t.placeholder + ' ' + t.id + ' ' + getQuestionText(t)).toLowerCase();
          if (ctx.includes('email')) t.value = `user${Date.now()}@mail.com`;
          else if (ctx.includes('phone')) t.value = '555-0123';
          else if (ctx.includes('zip') || ctx.includes('postal')) t.value = '92101';
          else if (ctx.includes('name') || ctx.includes('first') || ctx.includes('last')) t.value = ['Jessica','Ashley','Sarah','Amanda'][Math.floor(Math.random()*4)];
          else if (ctx.includes('city')) t.value = 'San Diego';
          else if (ctx.includes('state')) t.value = 'California';
          else t.value = ['Yes','Daily','Weekly','Monthly','3-4 times','Good','Fine','Sometimes'][Math.floor(Math.random()*8)];
          t.dispatchEvent(new Event('input', { bubbles: true }));
          t.dispatchEvent(new Event('change', { bubbles: true }));
          c++;
        });

        // Next buttons
        const btns = [...document.querySelectorAll('button, input[type="submit"], input[type="image"], [role="button"], .btn, [class*="button"], a:has(span)')];
        for (const btn of btns) {
          const txt = (btn.textContent || btn.value || '').trim().toLowerCase();
          if (['next','submit','continue','send','done','ok','finish','complete','yes','confirm','forward','proceed','>>','>','start','begin','i agree','accept','take survey'].some(k => txt.includes(k))) {
            if (btn.offsetParent !== null) { btn.click(); c++; break; }
          }
        }
        return c;
      }, JSON.stringify(currentSurveyProfile || GOLDEN));
      if (answered > 0) interacted = true;
    } catch (e) {}
  }
  return interacted;
}

async function runSurvey(popup) {
  try { await popup.waitForSelector('body', { timeout: 20000 }); } catch (e) { try { popup.close(); } catch(e2) {} return; }

  const url = popup.url().toLowerCase();
  const offerwall = detectOfferwall(url);
  log(`Popup: ${offerwall} | ${url.slice(0, 150)}`);

  const start = Date.now();
  let lastAction = Date.now();

  while (Date.now() - start < 360000) {
    if (popup.isClosed()) return;

    const cu = popup.url().toLowerCase();
    if (cu.includes('thank') || cu.includes('complete') || cu.includes('congratulations') || cu.includes('success') || cu.includes('finished')) {
      log('SURVEY COMPLETED!'); sessionState.completed++; saveState(); await sleep(3000); break;
    }
    if (cu.includes('disqualif') || cu.includes('quotafull') || cu.includes('not a match') || cu.includes('unfortunately') || cu.includes('screen') || cu.includes('terminated')) {
      log('Screen-out'); sessionState.disqualified++; saveState(); await sleep(2000); break;
    }

    if (Date.now() - lastAction > 60000) {
      log('60s idle, closing survey'); break;
    }

    const acted = await answerPage(popup);
    if (acted) lastAction = Date.now();
    await sleep(2000 + Math.random() * 2000);
  }

  try { if (!popup.isClosed()) popup.close(); } catch(e) {}
  log('Popup closed');
}

// ── OFFER DISCOVERY ────────────────────────────────────────────────────────
function analyzeFreecashOffers(page) {
  return page.evaluate(() => {
    const items = [];
    const seen = new Set();
    document.querySelectorAll('a, button, [role="button"], [class*="offer"], [class*="card"], [class*="tile"], [class*="item"], [class*="wall"], [class*="ad"]').forEach(el => {
      const text = (el.textContent || '').trim();
      const href = el.href || el.getAttribute('data-url') || el.getAttribute('data-href') || '';
      const key = text.slice(0, 50) + href;
      if (text.length < 8 || seen.has(key)) return;
      seen.add(key);
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 50) {
        const money = [...text.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map(m => parseFloat(m[1]));
        items.push({ text: text.slice(0, 200), href, money: money.length ? Math.max(...money) : 0, isSurvey: text.toLowerCase().includes('survey') || text.toLowerCase().includes('opinion') || text.toLowerCase().includes('answer') });
      }
    });
    return items.sort((a, b) => (b.isSurvey ? 10 : 0) + b.money - (a.isSurvey ? 10 : 0) - a.money);
  });
}

// ── MAIN ────────────────────────────────────────────────────────────────
let browser;

async function main() {
  log('=== Survey Bot v4 (Intelligent Profile) ===');
  log(`Session: ${sessionState.completed} completed / ${sessionState.disqualified} disqualified`);

  browser = await puppeteer.launch({
    headless: false, executablePath: CHROME_PATH,
    defaultViewport: { width: 1280, height: 900 },
    userDataDir: PROFILE_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  const activePopups = new Set();
  page.on('popup', async (popup) => {
    if (activePopups.size >= 2) { try { popup.close(); } catch(e) {} return; }
    activePopups.add(popup);
    await runSurvey(popup);
    activePopups.delete(popup);
    try { await page.bringToFront(); } catch(e) {}
  });

  await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(5000);

  if (!(await page.evaluate(() => document.body.innerText.includes('Cashout') || !!document.querySelector('[href*="cashout"]')))) {
    log('Login required...');
    for (let i = 0; i < 60; i++) { await sleep(5000); if (await page.evaluate(() => document.body.innerText.includes('Cashout'))) { log('Logged in'); break; } }
  }

  log('\nProfile loaded: Female, 25-34, $50-74k, Bachelor, Full-time, Married, 1 child, Homeowner\n');

  let fails = 0;

  while (true) {
    try {
      if (activePopups.size > 0) { await sleep(15000); continue; }

      await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(5000);

      for (let s = 0; s < 6; s++) { await page.evaluate(() => window.scrollBy(0, 400)); await sleep(600 + Math.random() * 400); }

      const offers = await analyzeFreecashOffers(page);
      const surveyOffers = offers.filter(o => o.isSurvey || o.money > 0);

      if (surveyOffers.length > 0) {
        const analysis = analyzeOffer(surveyOffers[0].text);
        log(`Best offer: $${analysis.reward} | Topic: ${analysis.primaryTopic || 'general'} | "${surveyOffers[0].text.slice(0, 100)}"`);
        fails = 0;

        const a = analysis;
        const topicStr = a.primaryTopic ? ` (${a.primaryTopic})` : '';
        log(`→ Profile adapted for: ${a.primaryTopic || 'general survey'}${topicStr}`);

        resetProfile(surveyOffers[0].text);

        const els = await page.$$('a, button, [role="button"]');
        let clicked = false;
        for (const el of els) {
          const t = (await el.evaluate(e => e.textContent.trim())).slice(0, 100);
          if (surveyOffers[0].text.includes(t) && t.length > 5) {
            try { await el.click(); clicked = true; sessionState.surveyCount++; saveState(); break; } catch(e) {}
          }
        }
        if (clicked) {
          log('Offer clicked, waiting for popup...');
          await sleep(8000 + Math.random() * 4000);
        }
      } else {
        fails++;
        if (fails >= 5) { log('5 fails, refreshing...'); await page.reload(); await sleep(5000); fails = 0; }
        else log(`No offers (${fails})`);
      }
    } catch (e) {
      log(`Error: ${e.message.slice(0, 120)}`);
      fails++;
    }
    await sleep(20000 + Math.random() * 10000);
  }
}

process.on('SIGINT', async () => { log('Shutdown'); saveState(); if (browser) await browser.close(); process.exit(0); });
main().catch(async e => { log(`Fatal: ${e.message}`); saveState(); if (browser) await browser.close(); process.exit(1); });

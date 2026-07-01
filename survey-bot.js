const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE_DIR = path.join(__dirname, 'profile');
try {
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
    const p = path.join(PROFILE_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
} catch (e) {}
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

// ── IDENTITY SYSTEM ─────────────────────────────────────────────────────────
const ID = {
  fixed: {
    age: '25-34', gender: 'Female', income: '$50,000 - $74,999',
    education: "Bachelor's degree", employment: 'Employed full-time',
    occupation: 'Marketing Manager', industry: 'Technology',
    company: 'Mid-size company (50-999)',
    household: '3', children: 'Yes', childrenAges: '6-12',
    marital: 'Married', homeowner: 'Own', residence: 'Suburbs',
    region: 'United States', state: 'California', city: 'San Diego', zip: '92101',
    ethnicity: 'White / Caucasian',
    browser: 'Desktop/Laptop', mobile: 'iPhone', carrier: 'Verizon', smoker: 'No',
  },
  variable: {
    health: 'Good', exercise: 'Several times a week', diet: 'Omnivore',
    alcohol: 'Socially', shopping: 'Amazon', shoppingFreq: 'Weekly',
    streaming: 'Netflix', streamingHours: '1-3 hours',
    socialMedia: ['Facebook', 'Instagram', 'YouTube'],
    pet: 'Dog', travel: '1-2 times per year',
    car: 'Toyota', carAge: '3-5 years',
    insurance: ['Health', 'Auto', 'Home'],
    banking: ['Checking', 'Savings', 'Credit Card'],
    invest: 'Yes', crypto: 'No',
    dining: '2-3 times per week', cooking: 'Several times a week',
    hobbies: ['Reading', 'Cooking', 'Hiking', 'Photography'],
  },
};

const TOPIC_ADAPT = {
  automotive: { car: 'Toyota Camry', carAge: '3-5 years', insurance: ['Health', 'Auto', 'Home'], hobbies: ['Driving', 'Hiking'] },
  health: { health: 'Good', exercise: 'Several times a week', diet: 'Omnivore', alcohol: 'Socially', hobbies: ['Yoga', 'Hiking', 'Reading'] },
  technology: { streamingHours: '3-5 hours', hobbies: ['Gaming', 'Photography', 'Reading'] },
  gaming: { streamingHours: '3-5 hours', hobbies: ['Gaming', 'Streaming', 'Technology'] },
  finance: { banking: ['Checking', 'Savings', 'Credit Card', 'Investment'], invest: 'Yes', crypto: 'No' },
  travel: { travel: '3-4 times per year', hobbies: ['Travel', 'Photography', 'Hiking'], dining: '3-4 times per week' },
  shopping: { shoppingFreq: 'Weekly', dining: '3-4 times per week', hobbies: ['Shopping', 'Fashion', 'Cooking'] },
  food: { cooking: 'Daily', dining: '3-4 times per week', diet: 'Omnivore', hobbies: ['Cooking', 'Baking', 'Reading'] },
  entertainment: { streamingHours: '3-5 hours', hobbies: ['Streaming', 'Reading', 'Movies'] },
  parenting: { childrenAges: '6-12', hobbies: ['Cooking', 'Photography', 'Reading'] },
  pet: { pet: 'Dog', hobbies: ['Hiking', 'Photography', 'Walking'] },
  fitness: { exercise: 'Daily', health: 'Excellent', diet: 'Omnivore', hobbies: ['Running', 'Yoga', 'Hiking'] },
};

const TOPIC_KEYWORDS = {
  automotive: ['car', 'auto', 'vehicle', 'driving', 'truck', 'toyota', 'honda', 'ford', 'tesla', 'gas'],
  health: ['health', 'medical', 'doctor', 'hospital', 'pharma', 'drug', 'vitamin', 'wellness', 'disease', 'symptom'],
  technology: ['tech', 'software', 'app', 'computer', 'laptop', 'smartphone', 'gadget', 'internet', 'wifi'],
  gaming: ['gaming', 'video game', 'console', 'xbox', 'playstation', 'nintendo', 'pc game', 'mobile game', 'esport', 'roblox', 'fortnite', 'minecraft'],
  finance: ['finance', 'bank', 'credit card', 'mortgage', 'loan', 'invest', 'saving', 'retirement', 'stock'],
  travel: ['travel', 'vacation', 'hotel', 'flight', 'airline', 'cruise', 'trip', 'tourist', 'destination'],
  shopping: ['shop', 'retail', 'store', 'online shop', 'amazon', 'walmart', 'target', 'fashion', 'clothing', 'beauty'],
  food: ['food', 'restaurant', 'cooking', 'grocery', 'snack', 'beverage', 'drink', 'diet', 'nutrition', 'meal', 'recipe'],
  entertainment: ['movie', 'tv', 'show', 'netflix', 'hulu', 'disney', 'stream', 'music', 'concert'],
  parenting: ['parent', 'child', 'kid', 'family', 'baby', 'toddler', 'school', 'toy'],
  pet: ['pet', 'dog', 'cat', 'veterinary', 'pet food', 'animal'],
  fitness: ['fitness', 'gym', 'exercise', 'workout', 'sport', 'athletic', 'running', 'yoga', 'supplement'],
};

function getProfile(text) {
  const t = text.toLowerCase();
  const scores = {};
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
    const s = kws.reduce((sum, kw) => sum + (t.includes(kw) ? 1 : 0), 0);
    if (s > 0) scores[topic] = s;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topic = sorted.length > 0 ? sorted[0][0] : null;
  const p = { ...ID.fixed, ...ID.variable };
  if (topic && TOPIC_ADAPT[topic]) Object.assign(p, TOPIC_ADAPT[topic]);
  return { profile: p, topic };
}

// ── OFFERWALLS ─────────────────────────────────────────────────────────────
const OFFERWALLS = [
  ['Revenue Universe', ['rev-u.com', 'revenueuniverse', 'revunetechnology']],
  ['AdGem', ['adgem.com']],
  ['BitLabs', ['bitlabs.com', 'bitlabs']],
  ['Lootably', ['lootably.com']],
  ['CPX Research', ['cpxresearch.com', 'cpx']],
  ['Adscend Media', ['adscendmedia.com']],
  ['YourSurveys', ['your-surveys.com', 'yoursurveys']],
  ['Pollfish', ['pollfish.com']],
  ['Toluna', ['toluna.com']],
];
function detectWall(url) { const u = url.toLowerCase(); for (const [name, domains] of OFFERWALLS) { if (domains.some(d => u.includes(d))) return name; } return 'Unknown'; }

// ── CAPTCHA ────────────────────────────────────────────────────────────────
async function ctc(frame) {
  const sels = ['iframe[src*="recaptcha"]','iframe[src*="turnstile"]','iframe[src*="hcaptcha"]','.g-recaptcha','.cf-turnstile','.h-captcha','[class*="captcha"]','iframe[src*="challenges.cloudflare.com"]'];
  for (const s of sels) { if (await frame.$(s).catch(() => null)) return s; }
  return null;
}
async function captchaHandler(frame) {
  const sel = await ctc(frame); if (!sel) return true;
  log('*** CAPTCHA ***'); const shot = path.join(SCREENSHOT_DIR, `captcha-${Date.now()}.png`); await frame.screenshot({ path: shot }).catch(() => {});
  for (let i = 0; i < 5; i++) { try { process.stdout.write('\x07'); } catch (e) {} }
  fs.writeFileSync(CAPTCHA_FLAG, `CAPTCHA at ${new Date().toISOString()}\nSolve in browser!\n`);
  log(`Captcha screenshot: ${shot}`);
  const start = Date.now();
  while (Date.now() - start < 180000) { if (!(await frame.$(sel).catch(() => null))) { log('Captcha solved!'); try { fs.unlinkSync(CAPTCHA_FLAG); } catch (e) {} return true; } await sleep(1000); }
  log('Captcha timeout'); return false;
}

// ── UNIVERSAL SURVEY ENGINE ────────────────────────────────────────────────
// Handles: Qualtrics, Typeform, SurveyMonkey, Google Forms, Toluna,
//          CPX, Pollfish, YourSurveys, and any generic HTML survey

async function universalAnswer(frame, profile) {
  if (!(await captchaHandler(frame))) return false;
  const pStr = JSON.stringify(profile);

  const result = await frame.evaluate((profileJSON) => {
    const p = JSON.parse(profileJSON);
    let actions = 0;
    const doneNames = new Set();
    const doneLabels = new Set();

    // Recursively collect ALL interactive elements including shadow DOM
    function collectInteractive(root) {
      const all = [];
      const walk = (node) => {
        if (!node || !node.querySelectorAll) return;
        // Regular DOM
        node.querySelectorAll('input, select, textarea, button, [role="button"], [role="radio"], [role="checkbox"], [role="slider"], [tabindex], a, .btn, [class*="button"], [class*="btn"], [class*="star"], [class*="rating"], [class*="nps"], [class*="scale"], li[data-value], .radio, .checkbox, label').forEach(el => all.push(el));
        // Shadow DOM
        node.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
        // SVG elements
        node.querySelectorAll('svg g, svg rect, svg circle, svg path').forEach(el => all.push(el));
      };
      walk(root);
      return all;
    }

    const els = collectInteractive(document);
    if (els.length === 0) { document.querySelectorAll('*').forEach(el => els.push(el)); }

    // Helper: get nearby question text
    function getLabel(el) {
      if (!el) return '';
      const id = el.id || '';
      const label = id ? (document.querySelector(`label[for="${id}"]`) || {}).textContent || '' : '';
      if (label) return label;
      const parent = el.closest('div, fieldset, li, .question, .row, .form-group, [class*="question"], [class*="field"], td, th, .survey-item, .question-container, .q-item');
      if (parent) {
        const c = parent.cloneNode(true);
        c.querySelectorAll('input, select, textarea, button').forEach(i => i.remove());
        return (c.textContent || '').trim().slice(0, 250);
      }
      return '';
    }

    // Find profile value by matching question label
    function profileVal(label) {
      const l = label.toLowerCase();
      const map = {
        age: ['age','how old','year','age group','birth year','generation'],
        gender: ['gender','sex','male','female','man','woman','identify'],
        income: ['income','salary','earn','make','household income','annual'],
        education: ['education','degree','college','university','high school','schooling'],
        employment: ['employ','job','work','occupation','career','working','status','student','retired'],
        marital: ['marital','married','single','relationship','status','partner'],
        household: ['household','people','live with','family size','members'],
        children: ['children','kids','child','parent','have children'],
        homeowner: ['own','rent','home','house','housing','property','residence type','live in'],
        ethnicity: ['ethnic','race','background','hispanic','origin'],
        health: ['health','wellness','medical condition'],
        exercise: ['exercise','workout','physical activity','active','gym','sport'],
        smoker: ['smoke','tobacco','cigarette','vape','nicotine'],
        alcohol: ['alcohol','drink','beer','wine','liquor'],
        shopping: ['shop','store','retail','where do you shop'],
        streaming: ['stream','netflix','hulu','disney','hbo','watch tv','video service'],
        mobile: ['smartphone','phone','iphone','android','mobile device','cell'],
        car: ['car','vehicle','automobile','drive','transportation'],
        pet: ['pet','dog','cat','animal'],
        travel: ['travel','vacation','trip','holiday','flight'],
        diet: ['diet','eat','food','meal','dietary','vegetarian','vegan'],
        hobbies: ['hobby','interest','free time','leisure','activity','pass time'],
        socialMedia: ['social media','facebook','instagram','twitter','tiktok'],
      };
      for (const [key, pats] of Object.entries(map)) {
        if (pats.some(pat => l.includes(pat))) return p[key] || null;
      }
      return null;
    }

    // ── TYPE 1: RADIO BUTTONS ──
    function handleRadios() {
      let c = 0;
      document.querySelectorAll('input[type="radio"]').forEach(r => {
        const name = r.name || r.id || '';
        if (!name || doneNames.has(name)) return;
        const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)].filter(x => x.offsetParent !== null);
        if (group.length === 0) return;
        const label = getLabel(group[0]);
        const val = profileVal(label);
        let target = null;
        if (val) {
          target = group.find(g => { const gt = (g.value + ' ' + (g.parentElement ? g.parentElement.textContent : '')).toLowerCase(); return gt.includes(val.toLowerCase()); });
        }
        if (!target && val === 'Yes') target = group.find(g => g.value === '1' || g.value.toLowerCase() === 'yes' || g.value === 'true');
        if (!target && val === 'No') target = group.find(g => g.value === '0' || g.value.toLowerCase() === 'no' || g.value === 'false');
        if (!target) {
          if (group.length <= 3) {
            // Yes/No/Maybe style - pick Yes
            target = group.find(g => ['1','yes','true','y'].includes(g.value.toLowerCase())) || group[0];
          } else {
            // Multi-option - pick middle-ish, slightly skewed to positive
            const idx = Math.min(Math.floor(group.length * 0.4), group.length - 1);
            target = group[idx];
          }
        }
        if (target && !target.checked) { target.click(); c++; }
        doneNames.add(name);
      });
      return c;
    }

    // ── TYPE 2: CHECKBOXES ──
    function handleCheckboxes() {
      let c = 0;
      document.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
        if (cb.checked) return;
        const label = getLabel(cb).toLowerCase();
        const id = (cb.id || '').toLowerCase();
        const val = (cb.value || '').toLowerCase();
        const isConsent = /consent|agree.*term|agree.*condition|privacy|opt.?in|accept/i.test(label) || /consent|agree.*term|agree.*condition|privacy|opt.?in|accept/i.test(id) || /consent|agree.*term|agree.*condition|privacy|opt.?in|accept/i.test(val);
        const isTrap = /select.*check|trap|attention|control|verification/i.test(label) || /select.*check|trap|attention|control|verification/i.test(id);
        const isAttentionCheck = /select all that apply|choose all|check all/i.test(label) && label.length < 60;

        if (isConsent) { cb.click(); c++; }
        else if (isTrap && i <= 2) { cb.click(); c++; } // traps usually listed first
        else if (isAttentionCheck) {
          // Attention checks: if it says "Select X that apply" with < 5 options, select 1-2
          if (Math.random() > 0.3) { cb.click(); c++; }
        } else {
          // Normal checkbox - 40% chance
          if (Math.random() > 0.6) { cb.click(); c++; }
        }
      });
      return c;
    }

    // ── TYPE 3: SELECT DROPDOWNS ──
    function handleSelects() {
      let c = 0;
      document.querySelectorAll('select').forEach(s => {
        if (s.disabled || s.offsetParent === null) return;
        const opts = [...s.options].filter(o => o.value && o.value !== s.value);
        if (opts.length === 0) return;
        const label = getLabel(s);
        const val = profileVal(label);
        let target = null;
        if (val) target = opts.find(o => o.text.toLowerCase().includes(val.toLowerCase()));
        if (!target) target = opts.find(o => !['select','choose','pick','--'].some(x => o.text.toLowerCase().includes(x)));
        if (!target) target = opts[Math.floor(opts.length * 0.5)];
        if (target) { s.value = target.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; }
      });
      return c;
    }

    // ── TYPE 4: TEXT INPUTS ──
    function handleTexts() {
      let c = 0;
      document.querySelectorAll('input[type="text"], input:not([type]), input[type="number"], textarea').forEach(t => {
        if (t.value || t.disabled || t.offsetParent === null || t.type === 'hidden') return;
        const ctx = (getLabel(t) + ' ' + t.placeholder + ' ' + t.id + ' ' + t.className).toLowerCase();
        if (ctx.includes('email') || ctx.includes('@') || t.type === 'email') { t.value = `user${Date.now()}@mail.com`; }
        else if (ctx.includes('phone') || ctx.includes('cell')) { t.value = '555-012-3456'; }
        else if (ctx.includes('zip') || ctx.includes('postal') || ctx.includes('post code')) { t.value = '92101'; }
        else if ((ctx.includes('first') || ctx.includes('last') || ctx.includes('name')) && !ctx.includes('username')) { t.value = ['Jessica','Ashley','Sarah','Amanda','Emily'][Math.floor(Math.random()*5)]; }
        else if (ctx.includes('city')) { t.value = 'San Diego'; }
        else if (ctx.includes('state') || ctx.includes('province')) { t.value = 'California'; }
        else if (ctx.includes('company') || ctx.includes('employer') || ctx.includes('organization')) { t.value = 'TechCorp Media'; }
        else if (ctx.includes('occupation') || ctx.includes('job') || ctx.includes('title') || ctx.includes('position')) { t.value = 'Marketing Manager'; }
        else if (ctx.includes('address') && !ctx.includes('email')) { t.value = '1234 Main Street'; }
        else if (ctx.includes('age') || ctx.includes('year')) { t.value = '32'; }
        else if (ctx.includes('website') || ctx.includes('url')) { t.value = ''; }
        else if (ctx.includes('comment') || ctx.includes('other') || ctx.includes('please specify') || ctx.includes('tell us') || ctx.includes('describe')) { t.value = 'No, everything is fine.'; }
        else { t.value = ['Good','Fine','3-4 times','Weekly','Daily','Sometimes','Yes','No','Maybe'][Math.floor(Math.random()*9)]; }
        t.dispatchEvent(new Event('input', { bubbles: true }));
        t.dispatchEvent(new Event('change', { bubbles: true }));
        c++;
      });
      return c;
    }

    // ── TYPE 5: MATRIX / GRID (tables with radio per cell) ──
    function handleMatrix() {
      let c = 0;
      // Qualtrix-style matrix
      document.querySelectorAll('table, [role="grid"], .Matrix, .matrix, .question-grid, .grid-layout').forEach(table => {
        const rows = table.querySelectorAll('tr, [role="row"], .row, .question-line');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, [role="gridcell"], .cell, .answer-cell');
          if (cells.length === 0) return;
          const label = getLabel(row);
          const preferred = profileVal(label);
          if (preferred && cells.length <= 6) {
            // Find cell whose text matches preference (e.g., "Agree", "Satisfied")
            const target = [...cells].find(c => c.textContent.toLowerCase().includes(preferred.toLowerCase()));
            if (target) {
              const radio = target.querySelector('input[type="radio"]');
              if (radio && !radio.checked) { radio.click(); c++; }
            }
          }
          if (!preferred || c === 0) {
            // Pick cell at ~40% position
            const mid = Math.floor(cells.length * 0.4);
            const radio = cells[mid]?.querySelector('input[type="radio"]');
            if (radio && !radio.checked) { radio.click(); c++; }
          }
        });
      });
      // Google Forms grid
      document.querySelectorAll('[role="grid"]').forEach(grid => {
        const rows = grid.querySelectorAll('[role="row"]');
        rows.forEach(row => {
          const cells = row.querySelectorAll('[role="gridcell"], [role="radio"]');
          if (cells.length === 0) return;
          const mid = Math.floor(cells.length * 0.4);
          const radio = cells[mid]?.querySelector('input[type="radio"]');
          if (radio && !radio.checked) { radio.click(); c++; }
        });
      });
      return c;
    }

    // ── TYPE 6: NPS / 0-10 SCALE ──
    function handleNPS() {
      let c = 0;
      // NPS buttons (0-10)
      document.querySelectorAll('[role="radio"], button, a, span, div').forEach(el => {
        if (doneLabels.has(el)) return;
        const text = (el.textContent || '').trim();
        const cls = (el.className || '').toLowerCase();
        const isScaleItem = /nps|scale|rating|score|[0-9]/.test(text) && (cls.includes('nps') || cls.includes('scale') || cls.includes('star') || cls.includes('rating') || cls.includes('score') || el.closest('[class*="nps"]') || el.closest('[class*="scale"]'));
        if (!isScaleItem) return;
        const num = parseInt(text);
        if (num >= 7 && num <= 10) { // Promoters give 9-10, Passives 7-8
          el.click(); c++; doneLabels.add(el);
        }
      });
      // List items that are numbers (Typeform, SurveyMonkey style)
      document.querySelectorAll('li[data-value], [data-value], .choice-item, .answer-item').forEach(el => {
        if (doneLabels.has(el)) return;
        const text = (el.textContent || '').trim();
        const num = parseInt(text);
        if (!isNaN(num) && num >= 0 && num <= 10 && text === String(num)) {
          doneLabels.add(el);
        }
      });
      return c;
    }

    // ── TYPE 7: STAR RATINGS ──
    function handleStars() {
      let c = 0;
      document.querySelectorAll('[class*="star"], [class*="rating"], .star-rating, .star-group').forEach(container => {
        const stars = container.querySelectorAll('span, a, i, svg, label, [role="img"]');
        const clickable = [...stars].filter(s => s.offsetParent !== null);
        if (clickable.length > 0) {
          const pick = Math.min(Math.floor(clickable.length * 0.7), clickable.length - 1);
          clickable[pick].click(); c++;
        }
      });
      return c;
    }

    // ── TYPE 8: SLIDER / RANGE ──
    function handleSliders() {
      let c = 0;
      document.querySelectorAll('input[type="range"], [role="slider"], [class*="slider"]').forEach(slider => {
        if (slider.type === 'range') {
          const max = parseFloat(slider.max) || 100;
          const min = parseFloat(slider.min) || 0;
          const val = min + (max - min) * 0.65;
          slider.value = val;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
          c++;
        }
        // Custom sliders (Toluna, etc.)
        if (slider.getAttribute && slider.getAttribute('role') === 'slider') {
          slider.setAttribute('aria-valuenow', '65');
          slider.click();
          c++;
        }
      });
      return c;
    }

    // ── TYPE 9: DATE INPUTS ──
    function handleDates() {
      let c = 0;
      document.querySelectorAll('input[type="date"], input[type="month"], input[type="year"]').forEach(d => {
        if (d.value) return;
        if (d.type === 'date') d.value = '1992-06-15';
        else if (d.type === 'month') d.value = '2024-06';
        d.dispatchEvent(new Event('input', { bubbles: true }));
        c++;
      });
      return c;
    }

    // ── TYPE 10: CONSENT FORM DETECTION ──
    function handleConsent() {
      let c = 0;
      // Look for consent checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) return;
        const ctx = (getLabel(cb) + ' ' + cb.id + ' ' + cb.value + ' ' + (cb.parentElement?.textContent || '')).toLowerCase();
        if (/consent|agree|terms|condition|privacy|opt.?in|i accept|i understand|18.*year|age.*18|confirm/.test(ctx)) {
          cb.click(); c++;
        }
      });
      // Look for consent buttons
      document.querySelectorAll('button, a, [role="button"]').forEach(btn => {
        const txt = (btn.textContent || '').toLowerCase();
        if (/consent|i agree|i accept|agree.*term|accept.*cookie|start survey|begin survey/i.test(txt) && btn.offsetParent !== null) {
          btn.click(); c++;
        }
      });
      return c;
    }

    // ── TYPE 11: ATTENTION / TRAP QUESTIONS ──
    function handleTraps() {
      let c = 0;
      const allText = document.body.innerText;
      const trapPatterns = [
        /select.*(?:strongly agree|agree|disagree|option|answer|choice)/i,
        /this is an attention check/i,
        /please select.*(?:strongly agree|agree|disagree)/i,
        /choose.*(?:strongly agree|agree|disagree)/i,
        /which of these is (?:not|NOT)/i,
        /trap question/i,
        /control question/i,
        /verification question/i,
      ];
      for (const pat of trapPatterns) {
        if (pat.test(allText)) {
          // The correct answer is usually the first option or "Strongly Agree"
          const btns = [...document.querySelectorAll('input[type="radio"], [role="radio"], button, [data-value]')].filter(b => b.offsetParent !== null);
          if (btns.length > 0) {
            // Pick first clickable (usually the correct one)
            for (const btn of btns) {
              const txt = (btn.textContent || btn.value || '').toLowerCase();
              if (['strongly agree','agree', '1', 'a'].some(k => txt.includes(k))) {
                btn.click(); c++; break;
              }
            }
          }
        }
      }
      return c;
    }

    // ── TYPE 12: NEXT / SUBMIT BUTTONS ──
    function handleButtons() {
      let c = 0;
      const btns = [...document.querySelectorAll('button, input[type="submit"], input[type="image"], [role="button"], a.btn, a[class*="button"], .btn, [class*="btn-primary"], [class*="btn-next"], [class*="next"], [class*="submit"], li[data-value], a:has(span)')].filter(b => b.offsetParent !== null);
      for (const btn of btns) {
        const txt = (btn.textContent || btn.value || '').trim().toLowerCase();
        const id = (btn.id || '').toLowerCase();
        const cls = (btn.className || '').toLowerCase();
        const isNext = ['next','submit','continue','send','done','ok','finish','complete','yes','confirm','forward','proceed','>>','>','start','begin','i agree','accept','take survey','save','go','→','►','➡','skip'].some(k => txt.includes(k) || id.includes(k) || cls.includes(k) || txt === k);
        const isPrev = /back|prev|previous/i.test(txt);
        if (isNext && !isPrev) {
          btn.click(); c++; break;
        }
      }
      // Qualtrics-specific: "Next" button
      const qNext = document.querySelector('#NextButton, .NextButton, [data-action="next"], button:has(svg)');
      if (qNext && qNext.offsetParent !== null) { qNext.click(); c++; }
      // Typeform-specific: submit button at bottom
      const tfNext = document.querySelector('[data-qa="submit-button"], [class*="proceed"], button[type="submit"]');
      if (tfNext && tfNext.offsetParent !== null) { tfNext.click(); c++; }
      return c;
    }

    // ── EXECUTE ALL HANDLERS ──
    try { actions += handleConsent(); } catch (e) {}
    try { actions += handleCheckboxes(); } catch (e) {}
    try { actions += handleRadios(); } catch (e) {}
    try { actions += handleMatrix(); } catch (e) {}
    try { actions += handleSelects(); } catch (e) {}
    try { actions += handleNPS(); } catch (e) {}
    try { actions += handleStars(); } catch (e) {}
    try { actions += handleSliders(); } catch (e) {}
    try { actions += handleTexts(); } catch (e) {}
    try { actions += handleDates(); } catch (e) {}
    try { actions += handleTraps(); } catch (e) {}
    try { actions += handleButtons(); } catch (e) {}

    return actions;
  }, pStr);

  return (result || 0) > 0;
}

// ── SURVEY RUNNER ──────────────────────────────────────────────────────────
async function runSurvey(popup, profile) {
  try { await popup.waitForSelector('body', { timeout: 20000 }); } catch (e) { try { popup.close(); } catch(e2) {} return; }
  const url = popup.url().toLowerCase();
  log(`Popup: ${detectWall(url)} | ${url.slice(0, 150)}`);

  const start = Date.now();
  let lastAct = Date.now();

  while (Date.now() - start < 420000) {
    if (popup.isClosed()) return;
    const cu = popup.url().toLowerCase();
    const finish = ['thank','complete','congratulations','success','finished','submitted','great','done!','well done'].some(k => cu.includes(k));
    if (finish) { log('COMPLETED!'); sessionState.completed++; saveState(); await sleep(3000); break; }
    const screenout = ['disqualif','quotafull','not a match','unfortunately','terminated','does not match','screen','sorry','no longer','not qualify','not eligible'].some(k => cu.includes(k));
    if (screenout) { log('Screen-out'); sessionState.disqualified++; saveState(); await sleep(2000); break; }
    if (Date.now() - lastAct > 60000 && !finish && !screenout) { log('60s idle'); break; }
    const acted = await universalAnswer(popup, profile);
    if (acted) { lastAct = Date.now(); }
    await sleep(2000 + Math.random() * 2000);
  }
  try { if (!popup.isClosed()) popup.close(); } catch(e) {}
  log('Popup closed');
}

// ── OFFER DISCOVERY ────────────────────────────────────────────────────────
async function findOffers(page) {
  return page.evaluate(() => {
    const items = []; const seen = new Set();
    document.querySelectorAll('a, button, [role="button"], [class*="offer"], [class*="card"], [class*="tile"]').forEach(el => {
      const text = (el.textContent || '').trim();
      const href = el.href || '';
      const key = text.slice(0, 40) + href;
      if (text.length < 8 || seen.has(key)) return; seen.add(key);
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 30) {
        const money = [...text.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map(m => parseFloat(m[1]));
        const isSurvey = /survey|opinion|answer|questionnaire|study|feedback/i.test(text);
        items.push({ text: text.slice(0, 200), href, money: money.length ? Math.max(...money) : 0, isSurvey });
      }
    });
    return items.sort((a, b) => (b.isSurvey ? 50 : 0) + b.money * 10 - (a.isSurvey ? 50 : 0) - a.money * 10);
  });
}

// ── MAIN ───────────────────────────────────────────────────────────────────
let browser;
async function main() {
  log('=== Survey Bot v5 (Universal Engine) ===');
  log(`Session: ${sessionState.completed} done / ${sessionState.disqualified} dq`);

  browser = await puppeteer.launch({
    headless: false, executablePath: CHROME_PATH,
    defaultViewport: { width: 1280, height: 900 },
    userDataDir: PROFILE_DIR,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
      '--disable-features=ChromeWhatsNewUI',
      '--no-default-browser-check',
    ],
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  let currentProfile = null;
  let currentTopic = null;

  await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);

  // Popup handler: just log during login, don't close (might be email sign-in)
  page.on('popup', async (popup) => {
    try {
      const u = popup.url().slice(0, 100);
      log(`Popup opened during login: ${u}`);
      // Don't close it - user might be signing in via email
    } catch (e) { /* ignore */ }
  });

  // ===== LOGIN GATE =====
  await page.evaluate(() => { document.title = '🔴 SURVEY BOT - LOG IN FIRST 🔴'; });
  log('===========================================');
  log('  SURVEY BOT - LOG IN MANUALLY');
  log('  Browser is open. Sign in to Freecash.');
  log('  Use EMAIL (NOT Google - Google breaks the bot)');
  log('  The bot does NOTHING until you log in.');
  log('===========================================\n');

  let loggedIn = false;
  log('Checking for login...');
  for (let i = 0; i < 120; i++) {
    const check = await page.evaluate(() => {
      const body = (document.body?.innerText || '');
      const hasSignIn = /sign\s*in/i.test(body);
      const hasSignUp = /sign\s*up/i.test(body);
      const hasCashout = /cashout/i.test(body);
      const hasAvatar = !!document.querySelector('[class*="avatar"], [class*="Avatar"], [class*="user-menu"], [class*="UserMenu"], [data-testid*="user"], [class*="profile"]');
      const noSignButtons = !hasSignIn && !hasSignUp;
      return { hasCashout, hasSignIn, hasSignUp, hasAvatar, noSignButtons, loggedIn: (hasCashout && noSignButtons) || hasAvatar };
    }).catch(() => ({ loggedIn: false }));

    if (check.loggedIn) { loggedIn = true; break; }

    // If we navigated away from freecash (e.g. auth redirect), go back
    const curUrl = page.url().toLowerCase();
    if (!curUrl.includes('freecash')) {
      log(`Navigated away to ${curUrl.slice(0, 80)} - going back to Freecash`);
      try { await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch(e) {}
      await sleep(3000);
    }

    if (i % 6 === 0) log(`Waiting for login... (${Math.round(i * 5 / 60)}min) - sign: ${check.hasSignIn ? 'yes' : 'no'}, cashout: ${check.hasCashout ? 'yes' : 'no'}`);
    await sleep(5000);
  }

  if (!loggedIn) {
    log('Login timeout (10min). Restart.');
    try { await browser.close(); } catch(e) {}
    process.exit(1);
  }

  // ===== LOGIN DONE - navigate to main page & start =====
  page.removeAllListeners('popup');
  page.on('popup', async (popup) => {
    try {
      await runSurvey(popup, currentProfile || { ...ID.fixed, ...ID.variable });
      try { await page.bringToFront(); } catch(e) {}
    } catch (e) { log(`Popup error: ${e.message}`); }
  });

  await page.evaluate(() => { document.title = '✅ SURVEY BOT - RUNNING ✅'; });
  log('✅ Login detected! Bot starting in 3s...');
  await sleep(3000);

  let fails = 0;

  while (true) {
    try {
      await page.goto('https://freecash.com/en', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(5000);
      for (let s = 0; s < 6; s++) { try { await page.evaluate(() => window.scrollBy(0, 400)); } catch(e) {} await sleep(600 + Math.random() * 400); }

      const offers = await findOffers(page);
      const targets = offers.filter(o => o.isSurvey || o.money > 0);

      if (targets.length > 0) {
        const best = targets[0];
        const { profile, topic } = getProfile(best.text);
        currentProfile = profile;
        currentTopic = topic;
        log(`Offer: $${best.money} | ${topic || 'general'} | "${best.text.slice(0, 80)}"`);
        fails = 0;

        const clickables = await page.$$('a, button, [role="button"]');
        let clicked = false;
        for (const el of clickables) {
          const t = (await el.evaluate(e => e.textContent.trim())).slice(0, 100);
          if (best.text.includes(t) && t.length > 5) {
            try { await el.click(); clicked = true; sessionState.surveyCount++; saveState(); break; } catch(e) {}
          }
        }
        if (clicked) await sleep(8000 + Math.random() * 4000);
      } else {
        fails++;
        if (fails >= 5) { try { await page.reload(); } catch(e) {} await sleep(5000); fails = 0; }
      }
    } catch (e) { log(`Error: ${e.message.slice(0, 120)}`); fails++; }
    await sleep(20000 + Math.random() * 10000);
  }
}

process.on('SIGINT', async () => { log('Shutdown'); saveState(); try { if (browser) await browser.close(); } catch(e) {} process.exit(0); });
process.on('unhandledRejection', (err) => { log(`Unhandled Rejection: ${err?.message || err}`); });
process.on('uncaughtException', (err) => { log(`Uncaught Exception: ${err?.message || err}`); });
main().catch(async e => { log(`Fatal: ${e.message}`); saveState(); try { if (browser) await browser.close(); } catch(e2) {} process.exit(1); });

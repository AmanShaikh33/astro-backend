/**
 * kundliMatch.js
 * Core Ashtakoot (Guna Milan) matching logic for AstroConnect.
 * Install: npm install astronomy-engine tz-lookup moment-timezone node-fetch
 * (pure JS — no native compilation required)
 */

import { getMoonSiderealLongitude } from './Moonposition.js';

// ---------- Longitude -> Nakshatra / Rashi ----------

const NAKSHATRA_NAMES = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha',
  'Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada',
  'Uttara Bhadrapada','Revati'
];

const RASHI_NAMES = [
  'Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya',
  'Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'
];

const NAKSHATRA_LORDS = [
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'
];

const RASHI_LORDS = [
  'Mars','Venus','Mercury','Moon','Sun','Mercury',
  'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'
];

export function getNakshatraAndRashi(moonLongitude) {
  const nakshatraIndex = Math.floor(moonLongitude / (360 / 27));
  const pada = Math.floor((moonLongitude % (360 / 27)) / (360 / 27 / 4)) + 1;
  const rashiIndex = Math.floor(moonLongitude / 30);

  return {
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex],
    nakshatraNum: nakshatraIndex + 1,
    pada,
    rashi: RASHI_NAMES[rashiIndex],
    rashiNum: rashiIndex + 1,
    nakshatraLord: NAKSHATRA_LORDS[nakshatraIndex],
    rashiLord: RASHI_LORDS[rashiIndex],
  };
}

// ---------- Ashtakoot lookup tables ----------

const GANA = [0,2,1,0,1,2,0,1,2, 1,1,1,1,0,0,2,1,2, 2,1,0,0,0,2,2, 1,0];
const GANA_TABLE = [
  [6, 5, 1],
  [5, 6, 0],
  [1, 0, 6],
];
function ganaKoota(boyNak, girlNak) {
  const b = GANA[boyNak.nakshatraNum - 1];
  const g = GANA[girlNak.nakshatraNum - 1];
  return { score: GANA_TABLE[b][g], max: 6 };
}

const YONI = [
  'Horse','Elephant','Goat','Serpent','Serpent','Dog','Cat','Sheep','Cat',
  'Rat','Rat','Cow','Buffalo','Tiger','Buffalo','Tiger','Deer','Deer',
  'Dog','Monkey','Monkey','Lion','Horse','Lion','Cow',
  'Elephant','Cow'
];
const YONI_ENEMIES = {
  'Cow':'Tiger', 'Tiger':'Cow',
  'Horse':'Buffalo', 'Buffalo':'Horse',
  'Elephant':'Lion', 'Lion':'Elephant',
  'Dog':'Deer', 'Deer':'Dog',
  'Cat':'Rat', 'Rat':'Cat',
  'Serpent':'Mongoose', 'Mongoose':'Serpent',
  'Sheep':'Monkey', 'Monkey':'Sheep',
};
function yoniKoota(boyNak, girlNak) {
  const b = YONI[boyNak.nakshatraNum - 1];
  const g = YONI[girlNak.nakshatraNum - 1];
  let score;
  if (b === g) score = 4;
  else if (YONI_ENEMIES[b] === g) score = 0;
  else score = 3;
  return { score, max: 4 };
}

const VASHYA_GROUP = [
  'Chatushpada','Chatushpada','Manav','Jalachar','Vanachar','Manav',
  'Manav','Keeta','Manav','Jalachar','Manav','Jalachar'
];
const VASHYA_TABLE = {
  'Manav-Manav': 2, 'Chatushpada-Chatushpada': 2, 'Jalachar-Jalachar': 2, 'Vanachar-Vanachar': 1, 'Keeta-Keeta': 1,
};
function vashyaKoota(boyNak, girlNak) {
  const b = VASHYA_GROUP[boyNak.rashiNum - 1];
  const g = VASHYA_GROUP[girlNak.rashiNum - 1];
  const key = `${b}-${g}`;
  const score = VASHYA_TABLE[key] !== undefined ? VASHYA_TABLE[key] : 1;
  return { score, max: 2 };
}

function taraKoota(boyNak, girlNak) {
  const countForward = (((girlNak.nakshatraNum - boyNak.nakshatraNum) % 27) + 27) % 27 + 1;
  const remForward = countForward % 9 || 9;
  const countBack = (((boyNak.nakshatraNum - girlNak.nakshatraNum) % 27) + 27) % 27 + 1;
  const remBack = countBack % 9 || 9;
  const badRemainders = [3, 5, 7];
  const goodForward = !badRemainders.includes(remForward);
  const goodBack = !badRemainders.includes(remBack);
  const score = (goodForward ? 1.5 : 0) + (goodBack ? 1.5 : 0);
  return { score, max: 3 };
}

const PLANET_FRIENDS = {
  Sun: ['Moon','Mars','Jupiter'], Moon: ['Sun','Mercury'], Mars: ['Sun','Moon','Jupiter'],
  Mercury: ['Sun','Venus'], Jupiter: ['Sun','Moon','Mars'], Venus: ['Mercury','Saturn'],
  Saturn: ['Mercury','Venus'],
};
const PLANET_ENEMIES = {
  Sun: ['Venus','Saturn'], Moon: [], Mars: ['Mercury'],
  Mercury: ['Moon'], Jupiter: ['Mercury','Venus'], Venus: ['Sun','Moon'],
  Saturn: ['Sun','Moon','Mars'],
};
function grahaMaitriKoota(boyNak, girlNak) {
  const b = boyNak.rashiLord, g = girlNak.rashiLord;
  let score;
  if (b === g) score = 5;
  else if (PLANET_FRIENDS[b]?.includes(g) && PLANET_FRIENDS[g]?.includes(b)) score = 5;
  else if (PLANET_FRIENDS[b]?.includes(g) || PLANET_FRIENDS[g]?.includes(b)) score = 4;
  else if (PLANET_ENEMIES[b]?.includes(g) && PLANET_ENEMIES[g]?.includes(b)) score = 0;
  else if (PLANET_ENEMIES[b]?.includes(g) || PLANET_ENEMIES[g]?.includes(b)) score = 1;
  else score = 3;
  return { score, max: 5 };
}

const VARNA_GROUP = ['Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin'];
const VARNA_RANK = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };
function varnaKoota(boyNak, girlNak) {
  const b = VARNA_GROUP[boyNak.rashiNum - 1];
  const g = VARNA_GROUP[girlNak.rashiNum - 1];
  const score = VARNA_RANK[b] >= VARNA_RANK[g] ? 1 : 0;
  return { score, max: 1 };
}

const BAD_BHAKOOT_DISTANCES = [6, 8];
function bhakootKoota(boyNak, girlNak) {
  const dist1 = (((girlNak.rashiNum - boyNak.rashiNum) % 12) + 12) % 12 + 1;
  const dist2 = (((boyNak.rashiNum - girlNak.rashiNum) % 12) + 12) % 12 + 1;
  const bad = BAD_BHAKOOT_DISTANCES.includes(dist1) || BAD_BHAKOOT_DISTANCES.includes(dist2)
    || dist1 === 2 || dist1 === 12 || dist2 === 2 || dist2 === 12;
  return { score: bad ? 0 : 7, max: 7 };
}

const NADI = [0,1,2, 2,1,0, 0,1,2, 2,1,0, 0,1,2, 2,1,0, 0,1,2, 2,1,0, 0,1,2];
function nadiKoota(boyNak, girlNak) {
  const b = NADI[boyNak.nakshatraNum - 1];
  const g = NADI[girlNak.nakshatraNum - 1];
  return { score: b === g ? 0 : 8, max: 8 };
}

// ---------- Master matching function ----------

export async function matchKundli(boy, girl) {
  const boyLong = getMoonSiderealLongitude(boy.date, boy.timezoneOffsetHours);
  const girlLong = getMoonSiderealLongitude(girl.date, girl.timezoneOffsetHours);

  const boyNak = getNakshatraAndRashi(boyLong);
  const girlNak = getNakshatraAndRashi(girlLong);

  const koota = {
    varna: varnaKoota(boyNak, girlNak),
    vashya: vashyaKoota(boyNak, girlNak),
    tara: taraKoota(boyNak, girlNak),
    yoni: yoniKoota(boyNak, girlNak),
    grahaMaitri: grahaMaitriKoota(boyNak, girlNak),
    gana: ganaKoota(boyNak, girlNak),
    bhakoot: bhakootKoota(boyNak, girlNak),
    nadi: nadiKoota(boyNak, girlNak),
  };

  const totalScore = Object.values(koota).reduce((sum, k) => sum + k.score, 0);
  const maxScore = Object.values(koota).reduce((sum, k) => sum + k.max, 0);

  let verdict;
  if (koota.nadi.score === 0) verdict = 'Nadi Dosha present — needs remedy/exception check';
  else if (totalScore >= 24) verdict = 'Excellent match';
  else if (totalScore >= 18) verdict = 'Good match';
  else verdict = 'Below average match';

  return { boy: boyNak, girl: girlNak, koota, totalScore, maxScore, verdict };
}
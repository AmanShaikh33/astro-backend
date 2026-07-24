/**
 * locationResolver.js
 * Converts a free-text birth place into { lat, lon, timezoneOffsetHours }.
 *
 * NOTE: Nominatim (OpenStreetMap) was tried first, but it blocks/rate-limits
 * requests from cloud hosting providers like Render — that's why you were
 * seeing "Access denied" instead of JSON. Switched to OpenCage instead,
 * which allows server/cloud traffic on its free tier (2,500 requests/day).
 *
 * Get a free API key at: https://opencagedata.com/users/sign_up
 * Then add to your Render environment variables: OPENCAGE_API_KEY=your_key_here
 *
 * Install:
 *   npm install tz-lookup moment-timezone node-fetch
 */

import tzLookup from 'tz-lookup';
import moment from 'moment-timezone';
import fetch from 'node-fetch';

const geocodeCache = new Map();

// ---------- Step 1: Place name -> lat/lon (OpenCage) ----------

export async function geocodePlace(placeName) {
  const cacheKey = placeName.trim().toLowerCase();

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error('OPENCAGE_API_KEY is missing from environment variables');
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(placeName)}&key=${apiKey}&limit=1`;

  const response = await fetch(url);

  // Defensive check: if OpenCage ever returns non-JSON (rate limit page, etc.),
  // fail with a clear message instead of a cryptic JSON parse error.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    throw new Error(`Geocoding service returned non-JSON response: ${rawText.slice(0, 200)}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not find location for "${placeName}"`);
  }

  const result = {
    lat: data.results[0].geometry.lat,
    lon: data.results[0].geometry.lng,
    displayName: data.results[0].formatted,
  };

  geocodeCache.set(cacheKey, result);
  return result;
}

// ---------- Step 2: lat/lon + birth date -> timezone offset at that date ----------

export function getTimezoneOffset(lat, lon, birthDateTime) {
  const timezoneName = tzLookup(lat, lon); // e.g. "Asia/Kolkata" — offline, no API call
  const offsetMinutes = moment.tz(birthDateTime, timezoneName).utcOffset();

  return {
    timezoneName,
    timezoneOffsetHours: offsetMinutes / 60,
  };
}

// ---------- Combined helper ----------

export async function resolveBirthLocation(placeName, birthDateTime) {
  const { lat, lon, displayName } = await geocodePlace(placeName);
  const { timezoneName, timezoneOffsetHours } = getTimezoneOffset(lat, lon, birthDateTime);

  return { lat, lon, displayName, timezoneName, timezoneOffsetHours };
}
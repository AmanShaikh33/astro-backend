/**
 * locationResolver.js
 * Converts a free-text birth place into { lat, lon, timezoneOffsetHours }
 * using free/offline services, with an in-memory cache so repeated
 * city lookups (Pune, Mumbai, Delhi...) don't hit Nominatim every time.
 *
 * Install:
 *   npm install tz-lookup moment-timezone node-fetch
 *
 * NOTE: the in-memory cache below resets on server restart. For production,
 * swap the Map for a DB table (e.g. a `geocode_cache` collection in MongoDB)
 * so the cache survives restarts and works across multiple server instances.
 */

import tzLookup from 'tz-lookup';
import moment from 'moment-timezone';
import fetch from 'node-fetch';

// Simple in-memory cache: placeName (lowercased) -> { lat, lon, displayName }
const geocodeCache = new Map();

// ---------- Step 1: Place name -> lat/lon (Nominatim, OpenStreetMap) ----------

export async function geocodePlace(placeName) {
  const cacheKey = placeName.trim().toLowerCase();

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AstroConnect/1.0 (contact: your-email@example.com)',
    },
  });

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`Could not find location for "${placeName}"`);
  }

  const result = {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
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
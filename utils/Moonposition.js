/**
 * moonPosition.js
 * Gets the Moon's sidereal (Vedic) ecliptic longitude at a given birth
 * date/time and location, using astronomy-engine (pure JS — no native
 * compilation required).
 *
 * Install: npm install astronomy-engine
 */

import * as Astronomy from 'astronomy-engine';
import { getLahiriAyanamsa } from './Ayanamsa.js';

/**
 * @param {Date} localDateTime - birth date+time in LOCAL time
 * @param {number} timezoneOffsetHours - e.g. 5.5 for IST
 * @returns {number} Moon's sidereal ecliptic longitude in degrees (0-360)
 */
export function getMoonSiderealLongitude(localDateTime, timezoneOffsetHours) {
  // Convert local birth time to UTC — astronomy-engine works in UTC/TT internally
  const utcDateTime = new Date(localDateTime.getTime() - timezoneOffsetHours * 3600000);

  // Geocentric ecliptic longitude of the Moon (tropical, date-of-equinox frame)
  const moonVector = Astronomy.GeoVector(Astronomy.Body.Moon, utcDateTime, false);
  const eclipticCoords = Astronomy.Ecliptic(moonVector);
  const tropicalLongitude = eclipticCoords.elon; // degrees, 0-360

  // Convert tropical -> sidereal by subtracting the ayanamsa for this date
  const ayanamsa = getLahiriAyanamsa(utcDateTime);
  let siderealLongitude = tropicalLongitude - ayanamsa;

  // Normalize to 0-360
  siderealLongitude = ((siderealLongitude % 360) + 360) % 360;

  return siderealLongitude;
}
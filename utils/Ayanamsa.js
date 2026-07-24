/**
 * ayanamsa.js
 * Calculates the Lahiri ayanamsa (offset between tropical and sidereal zodiac)
 * for a given date. Used to convert astronomy-engine's tropical longitude
 * into the sidereal longitude Vedic astrology requires.
 *
 * Reference point: Lahiri ayanamsa at J2000.0 (Jan 1, 2000, 12:00 UTC) = 23.853 degrees
 * Precession rate: ~50.2388475 arcsec/year = 0.0139552 degrees/year
 *
 * This linear approximation is accurate to within ~0.01-0.02 degrees over a
 * +/-100 year range around 2000 — more than precise enough for nakshatra/rashi
 * boundaries (each nakshatra spans 13.33 degrees, each rashi spans 30 degrees).
 */

const AYANAMSA_AT_J2000 = 23.853; // degrees, on Jan 1 2000
const PRECESSION_RATE_PER_YEAR = 0.0139552; // degrees/year

/**
 * @param {Date} date - any date (UTC or local, only the calendar date matters here)
 * @returns {number} Lahiri ayanamsa in degrees for that date
 */
export function getLahiriAyanamsa(date) {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const endOfYear = new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
  const yearFraction = (date - startOfYear) / (endOfYear - startOfYear);
  const decimalYear = date.getUTCFullYear() + yearFraction;

  return AYANAMSA_AT_J2000 + PRECESSION_RATE_PER_YEAR * (decimalYear - 2000);
}
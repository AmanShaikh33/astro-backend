/**
 * matchKundliController.js
 * Full request flow: raw form input -> resolved location -> matched kundli.
 *
 * Expects req.body shaped like:
 * {
 *   boy:  { name, dob: "1998-04-12", tob: "14:30", unknownTime: false, placeName: "Pune, India" },
 *   girl: { name, dob: "1999-08-03", tob: "09:15", unknownTime: false, placeName: "Nagpur, India" }
 * }
 */

import { resolveBirthLocation } from '../utils/Locationresolver.js';
import { matchKundli } from '../utils/Kundlimatch.js';

export async function matchKundliHandler(req, res) {
  try {
    const { boy, girl } = req.body;

    const boyDateTime = new Date(`${boy.dob}T${boy.unknownTime ? '12:00' : boy.tob}`);
    const girlDateTime = new Date(`${girl.dob}T${girl.unknownTime ? '12:00' : girl.tob}`);

    // Resolve place name -> lat/lon/timezone (invisible to the user)
    const [boyLocation, girlLocation] = await Promise.all([
      resolveBirthLocation(boy.placeName, boyDateTime),
      resolveBirthLocation(girl.placeName, girlDateTime),
    ]);

    const result = await matchKundli(
      { date: boyDateTime, timezoneOffsetHours: boyLocation.timezoneOffsetHours },
      { date: girlDateTime, timezoneOffsetHours: girlLocation.timezoneOffsetHours }
    );

    res.json({
      ...result,
      boyLocation: { placeName: boyLocation.displayName, lat: boyLocation.lat, lon: boyLocation.lon },
      girlLocation: { placeName: girlLocation.displayName, lat: girlLocation.lat, lon: girlLocation.lon },
      warnings: [
        boy.unknownTime ? 'Boy: birth time unknown — Nakshatra-based kootas may be inaccurate' : null,
        girl.unknownTime ? 'Girl: birth time unknown — Nakshatra-based kootas may be inaccurate' : null,
      ].filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
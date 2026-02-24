// controllers/horoscopeController.js
import axios from "axios";

export const getDailyHoroscope = async (req, res) => {
  try {
    const { sign, day } = req.body;

    if (!sign || !day) {
      return res.status(400).json({ message: "Sign and day required" });
    }

    const response = await axios.get(
      `https://api.api-ninjas.com/v1/horoscope?zodiac=${sign}`,
      {
        headers: {
          "X-Api-Key": process.env.HOROSCOPE_API_KEY,
        },
      }
    );

    // Normalize response (important)
    const data = response.data;

    res.json({
      description: data.horoscope,
      lucky_number: data.lucky_number || null,
      mood: data.mood || null,
      color: data.color || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch horoscope" });
  }
};
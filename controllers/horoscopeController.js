import axios from "axios";

export const getDailyHoroscope = async (req, res) => {
  try {
    const { sign } = req.body;

    if (!sign) {
      return res.status(400).json({ message: "Sign is required" });
    }

    const response = await axios.get(
      `https://api.api-ninjas.com/v1/horoscope?zodiac=${sign}`,
      {
        headers: {
          "X-Api-Key": process.env.HOROSCOPE_API_KEY,
        },
      }
    );

    const data = response.data;

    res.json({
      description: data.horoscope,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch horoscope" });
  }
};
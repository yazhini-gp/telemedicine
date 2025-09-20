const functions = require("firebase-functions");
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔑 Replace with your RapidAPI key
const RAPIDAPI_KEY = "YOUR_RAPIDAPI_KEY";

app.post("/online_symptom_check", async (req, res) => {
  const { symptoms } = req.body;

  try {
    const response = await axios.post(
      "https://ai-medical-diagnosis.p.rapidapi.com/api/v1/symptoms",
      { symptoms: symptoms.join(", ") }, // send as string
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": "66809dfdf1msh597d5ecc1b36cefp170ecfjsn8e68e0e62c07",
          "X-RapidAPI-Host": "ai-medical-diagnosis.p.rapidapi.com",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("Online API error:", err.message || err);
    res.status(500).json({ success: false, error: "Failed online check" });
  }
});

exports.api = functions.https.onRequest(app);

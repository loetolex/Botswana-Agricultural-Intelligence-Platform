import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { disease, confidence, country, district, cropOrAnimal } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a senior agricultural and veterinary advisor for SADC. Return valid HTML only."
        },
        {
          role: "user",
          content: `
Disease/Pest: ${disease}
Confidence: ${confidence}%
Country: ${country}
District: ${district}
Category: ${cropOrAnimal}

Generate:
1. Overview
2. Severity
3. Immediate Actions
4. Treatment Plan
5. Prevention
6. Economic Impact
7. Vaccination Recommendations
8. When To Contact A Vet
9. Monitoring Plan

Return HTML only.
`
        }
      ]
    });

    res.status(200).json({
      success: true,
      report: completion.choices[0].message.content
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
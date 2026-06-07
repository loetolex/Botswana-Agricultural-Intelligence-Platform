export default async function handler(req, res) {

  try {

    const {
      disease,
      confidence,
      country,
      district,
      cropOrAnimal
    } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Disease: ${disease}
Confidence: ${confidence}
Country: ${country}
District: ${district}
Category: ${cropOrAnimal}

Generate a detailed HTML agricultural report.
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(
      "GEMINI RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    return res.status(200).json({
      success: true,
      report:
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No report generated."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

}
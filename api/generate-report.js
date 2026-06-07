export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {

    console.log(
      "GEMINI KEY EXISTS:",
      !!process.env.GEMINI_API_KEY
    );

    const {
      disease,
      confidence,
      country,
      district,
      cropOrAnimal
    } = req.body;

    const geminiResponse = await fetch(
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
You are a senior agricultural advisor for SADC.

Disease/Pest: ${disease}
Confidence: ${confidence}
Country: ${country}
District: ${district}
Category: ${cropOrAnimal}

Generate a detailed HTML report with:

<h2>Overview</h2>
<h2>Severity</h2>
<h2>Immediate Actions</h2>
<h2>Treatment Plan</h2>
<h2>Prevention</h2>
<h2>Economic Impact</h2>
<h2>Monitoring Plan</h2>

Return HTML only.
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    console.log(
      "FULL GEMINI RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    if (data.error) {

      return res.status(500).json({
        success: false,
        error: data.error.message,
        gemini: data
      });

    }

    const report =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!report) {

      return res.status(500).json({
        success: false,
        error: "Gemini returned no report",
        gemini: data
      });

    }

    return res.status(200).json({
      success: true,
      report
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

}
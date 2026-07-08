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
      disease = "Fall Armyworm",
      confidence = 0,
      country = "",
      district = "",
      cropOrAnimal = "Maize"
    } = req.body;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
You are a senior plant pathologist specializing in potato diseases.

Crop: ${cropOrAnimal}
Disease: ${disease}
Confidence: ${confidence}%
Country: ${country}
District: ${district}

Generate a detailed evidence-based HTML report specifically for Late Blight of Potato.

Late Blight is caused by:

Phytophthora infestans

Late Blight is one of the most destructive potato diseases worldwide and was responsible for the Irish Potato Famine.

Include information about:

- water-soaked leaf lesions
- dark brown to black lesions
- white fungal growth on leaf undersides
- stem infections
- tuber rot
- rapid disease spread
- cool wet weather
- disease cycle
- economic importance

Return the following sections exactly.

<h2>Overview</h2>

Explain:

- what the disease is
- symptoms
- causal organism
- disease cycle
- transmission
- favourable environmental conditions.

<h2>Severity</h2>

Explain:

- disease severity
- expected yield losses
- economic importance.

<h2>Immediate Actions</h2>

Provide immediate recommendations.

<h2>Treatment Plan</h2>

Include:

- cultural control
- biological control
- chemical control
- integrated disease management

Mention:

- certified disease-free seed tubers
- destruction of infected plants
- crop rotation
- proper plant spacing
- field sanitation
- avoiding overhead irrigation

Mention fungicides such as:

- Mancozeb
- Chlorothalonil
- Cymoxanil
- Fluazinam
- Metalaxyl (where resistance is not an issue)

Explain fungicide resistance management and that pesticide use should follow national agricultural regulations.

<h2>Prevention</h2>

Provide long-term prevention recommendations.

<h2>Economic Impact</h2>

Explain:

- yield losses
- storage losses
- tuber quality reduction
- production costs
- financial implications.

<h2>Monitoring Plan</h2>

Explain:

- scouting frequency
- weather monitoring
- early symptom detection
- indicators of recovery.

<h2>Scientific References</h2>

Provide an HTML list:

<ul>
<li>
<a href="URL">
Title - Authors (Year)
</a>
</li>
</ul>

Include at least five REAL references from:

- FAO
- USDA
- CABI
- CIP (International Potato Center)
- Penn State Extension
- University of Wisconsin Extension
- NCBI
- APS Journals
- Peer-reviewed journals.

<h2>Reference Images</h2>

Provide an HTML list:

<ul>
<li>
<img src="IMAGE_URL"/>
<a href="SOURCE_URL">
Caption
</a>
</li>
</ul>

Use REAL publicly accessible image URLs.

<h2>Scientific References JSON</h2>

[
{
"title":"",
"authors":"",
"year":"",
"url":""
}
]

<h2>Reference Images JSON</h2>

[
{
"caption":"",
"imageUrl":"",
"sourceUrl":""
}
]

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

    const extractSection = (html, title) => {
      const regex = new RegExp(
        `<h2>${title}<\\/h2>([\\s\\S]*?)(?=<h2>|$)`,
        "i"
      );

      const match = html.match(regex);

      return match
        ? match[1]
            .replace(/<[^>]*>/g, "")
            .replace(/\n/g, " ")
            .trim()
        : "";
    };

    const extractHtml = (html, title) => {
      const regex = new RegExp(
        `<h2>${title}<\\/h2>([\\s\\S]*?)(?=<h2>|$)`,
        "i"
      );

      const match = html.match(regex);

      return match
        ? match[1].trim()
        : "";
    };

    const parseJsonSection = (text) => {
      try {
        return JSON.parse(text);
      } catch {
        return [];
      }
    };

    const scientificReferencesJson =
      parseJsonSection(
        extractSection(
          report,
          "Scientific References JSON"
        )
      );

    const referenceImagesJson =
      parseJsonSection(
        extractSection(
          report,
          "Reference Images JSON"
        )
      );

    const structuredReport = {
      diseaseName: disease,

      confidenceLevel:
        confidence >= 90
          ? "High"
          : confidence >= 70
          ? "Medium"
          : "Low",

      overview: extractSection(
        report,
        "Overview"
      ),

      severity: extractSection(
        report,
        "Severity"
      ),

      immediateActions:
        extractSection(
          report,
          "Immediate Actions"
        ),

      treatmentPlan:
        extractSection(
          report,
          "Treatment Plan"
        ),

      prevention:
        extractSection(
          report,
          "Prevention"
        ),

      economicImpact:
        extractSection(
          report,
          "Economic Impact"
        ),

      monitoringPlan:
        extractSection(
          report,
          "Monitoring Plan"
        ),

      scientificReferences:
        extractHtml(
          report,
          "Scientific References"
        ),

      referenceImages:
        extractHtml(
          report,
          "Reference Images"
        ),

      scientificReferencesJson,

      referenceImagesJson
    };

    return res.status(200).json({
      success: true,
      report,
      structuredReport
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
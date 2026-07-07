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
      disease = "Black Rot",
      confidence = 0,
      country = "",
      district = "",
      cropOrAnimal = "Grape"
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
You are a senior plant pathologist and viticulture advisor specializing in grape diseases.

Crop: ${cropOrAnimal}
Disease: ${disease}
Confidence: ${confidence}%
Country: ${country}
District: ${district}

Generate a detailed evidence-based HTML report specifically for Grape Black Rot.

Grape Black Rot is caused by:

Guignardia bidwellii
(Phyllosticta ampelicida)

Include information about:

- Leaf lesions
- Brown circular spots
- Black pycnidia
- Fruit rot
- Black shriveled mummified berries
- Tendril infections
- Stem lesions
- Disease cycle
- Overwintering inoculum
- Environmental conditions favoring infection
- Yield and fruit quality losses

Return the following sections exactly:

<h2>Overview</h2>

Explain:
- what the disease is
- symptoms
- causal organism
- transmission
- disease cycle
- favorable environmental conditions.

<h2>Severity</h2>

Explain:
- disease severity
- expected yield losses
- economic importance.

<h2>Immediate Actions</h2>

Provide actions farmers should take immediately.

<h2>Treatment Plan</h2>

Include:

- cultural control
- biological control
- chemical control
- integrated disease management

Mention:

- pruning infected shoots
- removing mummified berries
- sanitation
- canopy management
- improving airflow
- fungicides such as myclobutanil, mancozeb, captan and copper-based fungicides where appropriate.

<h2>Prevention</h2>

Provide prevention recommendations.

<h2>Economic Impact</h2>

Explain:

- crop losses
- quality losses
- financial implications
- impact on commercial vineyards.

<h2>Monitoring Plan</h2>

Explain:

- what to monitor
- how often
- indicators of disease progression
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

Include at least 5 REAL references from:

- Cornell University
- Penn State Extension
- University of Minnesota Extension
- USDA
- APS Journals
- NCBI
- FAO
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
    "title": "",
    "authors": "",
    "year": "",
    "url": ""
  }
]

<h2>Reference Images JSON</h2>

[
  {
    "caption": "",
    "imageUrl": "",
    "sourceUrl": ""
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
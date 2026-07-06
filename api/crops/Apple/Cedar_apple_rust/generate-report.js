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
      disease = "Cedar Apple Rust",
      confidence = 0,
      country = "",
      district = "",
      cropOrAnimal = "Apple"
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
You are a senior plant pathologist and agricultural advisor specializing in apple diseases.

Crop: Apple
Disease: Cedar Apple Rust
Confidence: ${confidence}%
Country: ${country}
District: ${district}

Generate a detailed evidence-based HTML report specifically for Cedar Apple Rust.

Cedar Apple Rust is caused by the fungus:

Gymnosporangium juniperi-virginianae.

Include information about:
- Orange or yellow leaf spots.
- Lesions on fruit and twigs.
- The role of juniper/cedar trees as alternate hosts.
- The disease cycle between juniper and apple trees.
- Environmental conditions favoring infection.
- Impact on fruit quality and yield.

Return the following sections exactly:

<h2>Overview</h2>

Explain:
- what the disease is
- symptoms
- causal organism
- transmission
- favorable conditions.

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
- integrated disease management.

Mention:
- removal of nearby juniper hosts
- pruning
- sanitation
- fungicides such as myclobutanil, captan and mancozeb.

<h2>Prevention</h2>

Provide prevention recommendations.

<h2>Economic Impact</h2>

Explain:
- crop losses
- quality losses
- financial implications.

<h2>Monitoring Plan</h2>

Explain:
- what to monitor
- how often
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

- University of Minnesota Extension
- Penn State Extension
- USDA
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

    const extractSection = (
      html,
      title
    ) => {
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

    const extractHtml = (
      html,
      title
    ) => {
      const regex = new RegExp(
        `<h2>${title}<\\/h2>([\\s\\S]*?)(?=<h2>|$)`,
        "i"
      );

      const match = html.match(regex);

      return match
        ? match[1].trim()
        : "";
    };

    const parseJsonSection = (
      text
    ) => {
      try {
        return JSON.parse(text);
      } catch (e) {
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
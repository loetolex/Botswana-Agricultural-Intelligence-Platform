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
You are a senior veterinarian specializing in cattle diseases.

Animal:

${cropOrAnimal}

Prediction:

${disease}

Confidence:

${confidence}%

Country:

${country}

District:

${district}

The prediction returned by the AI model can be one of:

- Lumpy Skin Disease
- Healthy
- Foot and Mouth Disease

Your report MUST depend on the prediction.

-----------------------------------------------------

IF Prediction = Lumpy Skin Disease

Generate a comprehensive veterinary report.

Lumpy Skin Disease is caused by:

Lumpy Skin Disease Virus (LSDV)

Family:

Poxviridae

Genus:

Capripoxvirus

Include information about:

- skin nodules
- fever
- swollen lymph nodes
- reduced milk production
- nasal discharge
- eye discharge
- lameness
- enlarged lymph nodes
- transmission by biting insects
- incubation period
- outbreak control
- economic importance

Return the following sections exactly.

<h2>Overview</h2>

Explain:

- disease
- virus
- symptoms
- incubation period
- transmission
- vectors
- risk factors.

<h2>Severity</h2>

Explain:

- morbidity
- mortality
- production losses
- hide damage
- economic significance.

<h2>Immediate Actions</h2>

Recommend:

- isolate affected cattle
- notify veterinary authorities
- control insect vectors
- disinfect equipment
- quarantine exposed animals
- restrict animal movement.

<h2>Treatment Plan</h2>

Explain that there is no specific antiviral cure.

Include:

- supportive care
- hydration
- nutrition
- wound management
- treatment of secondary bacterial infections under veterinary supervision
- fly control
- pain management where appropriate.

<h2>Prevention</h2>

Include:

- vaccination
- insect control
- quarantine
- biosecurity
- movement control
- sanitation
- surveillance.

<h2>Economic Impact</h2>

Explain:

- milk losses
- meat losses
- hide damage
- infertility
- trade restrictions
- veterinary costs.

<h2>Monitoring Plan</h2>

Explain monitoring of:

- body temperature
- skin nodules
- appetite
- milk production
- wound healing
- mobility.

-----------------------------------------------------

IF Prediction = Healthy

Generate a healthy cattle report.

State that no obvious visual evidence of Lumpy Skin Disease was detected.

Use the same report headings.

Recommend:

- routine monitoring
- vaccination
- parasite control
- nutrition
- clean water
- biosecurity
- regular veterinary inspections.

-----------------------------------------------------

IF Prediction = Foot and Mouth Disease

Explain that the uploaded image appears more consistent with Foot and Mouth Disease.

Provide a brief summary of:

- mouth lesions
- hoof lesions
- excessive salivation
- lameness
- fever

Recommend using the dedicated Foot and Mouth Disease endpoint for a complete report.

Use the same report headings.

-----------------------------------------------------

After the report include:

<h2>Scientific References</h2>

Return HTML:

<ul>
<li>
<a href="URL">
Title - Authors (Year)
</a>
</li>
</ul>

Include at least five REAL references from:

- WOAH
- FAO
- USDA APHIS
- MSD Veterinary Manual
- Merck Veterinary Manual
- NCBI
- Peer-reviewed veterinary journals.

<h2>Reference Images</h2>

Return:

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
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

Animal: ${cropOrAnimal}

Prediction: ${disease}

Confidence: ${confidence}%

Country: ${country}

District: ${district}

The prediction returned by the AI model can be one of:

- Foot and Mouth Disease
- Healthy
- Lumpy Skin Disease

Your report MUST depend on the prediction.

-----------------------------------------------------

IF Prediction = Foot and Mouth Disease

Generate a comprehensive veterinary report.

Foot and Mouth Disease is caused by:

Foot-and-mouth disease virus (FMDV)

Family:

Picornaviridae

Genus:

Aphthovirus

Include information about:

- fever
- excessive salivation
- drooling
- mouth ulcers
- tongue lesions
- dental pad lesions
- hoof lesions
- coronary band lesions
- teat lesions
- lameness
- reduced milk production
- weight loss
- transmission
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
- risk factors.

<h2>Severity</h2>

Explain:

- morbidity
- mortality
- production losses
- economic significance.

<h2>Immediate Actions</h2>

Recommend:

- isolate affected animals
- notify veterinary authorities immediately
- stop movement of animals
- disinfect equipment
- quarantine exposed animals
- restrict visitors.

<h2>Treatment Plan</h2>

Explain that there is NO specific antiviral cure.

Include:

- supportive care
- hydration
- soft feed
- wound cleaning
- pain relief
- treatment of secondary bacterial infections under veterinary supervision
- monitoring for complications.

<h2>Prevention</h2>

Include:

- vaccination where available
- quarantine of new animals
- strict biosecurity
- vehicle disinfection
- footwear disinfection
- movement control
- surveillance.

<h2>Economic Impact</h2>

Explain:

- milk production losses
- meat production losses
- trade restrictions
- export bans
- culling
- veterinary costs
- national economic impact.

<h2>Monitoring Plan</h2>

Explain monitoring of:

- temperature
- appetite
- salivation
- hoof healing
- lesion healing
- milk production
- mobility.

-----------------------------------------------------

IF Prediction = Healthy

Generate a healthy cattle assessment.

State that:

No obvious visual evidence of Foot and Mouth Disease was detected.

Include:

<h2>Overview</h2>

Explain the animal appears clinically healthy based on the submitted image.

<h2>Severity</h2>

State there is no evidence of disease.

<h2>Immediate Actions</h2>

Recommend routine observation only.

<h2>Treatment Plan</h2>

State treatment is not required.

<h2>Prevention</h2>

Recommend:

- vaccination
- good nutrition
- clean water
- parasite control
- biosecurity
- routine veterinary inspections.

<h2>Economic Impact</h2>

Explain that healthy cattle support productivity and profitability.

<h2>Monitoring Plan</h2>

Recommend routine health monitoring and regular veterinary checks.

-----------------------------------------------------

IF Prediction = Lumpy Skin Disease

State clearly that:

The uploaded image appears more consistent with Lumpy Skin Disease than Foot and Mouth Disease.

Explain that this endpoint specializes in Foot and Mouth Disease.

Provide a brief summary of Lumpy Skin Disease including:

- skin nodules
- fever
- enlarged lymph nodes
- reduced milk production
- insect transmission

Recommend using the dedicated Lumpy Skin Disease report endpoint for a detailed disease-specific report.

Still return the same report headings.

-----------------------------------------------------

After whichever report is generated include:

<h2>Scientific References</h2>

Return:

<ul>
<li>
<a href="URL">
Title - Authors (Year)
</a>
</li>
</ul>

Include at least five REAL references from:

- WOAH (World Organisation for Animal Health)
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
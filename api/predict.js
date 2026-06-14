const formidable = require("formidable");
const fs = require("fs");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs");

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

let model = null;
let labels = null;

async function loadModel() {
  if (model) return;

  console.log("Loading model...");

  model = await tf.loadLayersModel(
    "https://botswana-agricultural-intelligence-three.vercel.app/models/livestock/model.json"
  );

  console.log("Model loaded");

  const metadataResponse = await fetch(
    "https://botswana-agricultural-intelligence-three.vercel.app/models/livestock/metadata.json"
  );

  const metadata = await metadataResponse.json();

  labels = metadata.labels;

  console.log("Labels loaded:", labels.length);
}

module.exports = async function handler(req, res) {
  try {
    await loadModel();

    const form = formidable({
      multiples: false,
    });

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }

        const uploadedFile =
          files.image?.[0] || files.image;

        if (!uploadedFile) {
          return res.status(400).json({
            success: false,
            error: "No image uploaded",
          });
        }

        const imageBuffer = fs.readFileSync(
          uploadedFile.filepath
        );

        const resized = await sharp(imageBuffer)
          .resize(224, 224)
          .removeAlpha()
          .raw()
          .toBuffer();

        let tensor = tf.tensor3d(
          new Uint8Array(resized),
          [224, 224, 3]
        );

        tensor = tensor
          .toFloat()
          .div(127.5)
          .sub(1)
          .expandDims(0);

        const prediction = model.predict(tensor);

        const scores = await prediction.data();

        let bestIndex = 0;

        for (let i = 1; i < scores.length; i++) {
          if (scores[i] > scores[bestIndex]) {
            bestIndex = i;
          }
        }

        return res.status(200).json({
          success: true,
          prediction: labels[bestIndex],
          confidence: Number(
            (scores[bestIndex] * 100).toFixed(2)
          ),
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
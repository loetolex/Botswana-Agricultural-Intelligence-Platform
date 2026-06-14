import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";

export const config = {
  api: {
    bodyParser: false
  }
};

let model;
let labels;

async function loadModel() {

  if (model) return;

  model = await tf.loadLayersModel(
    "https://your-vercel-domain/models/livestock/model.json"
  );

  const metadata = JSON.parse(
    fs.readFileSync(
      "./public/models/livestock/metadata.json",
      "utf8"
    )
  );

  labels = metadata.labels;
}

export default async function handler(req, res) {

  await loadModel();

  const form = formidable({});

  form.parse(req, async (err, fields, files) => {

    try {

      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }

      const uploadedFile = files.image?.[0] || files.image;

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: "No image uploaded"
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
        .expandDims();

      const prediction =
        model.predict(tensor);

      const scores =
        await prediction.data();

      let bestIndex = 0;

      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[bestIndex]) {
          bestIndex = i;
        }
      }

      return res.status(200).json({
        success: true,
        prediction: labels[bestIndex],
        confidence:
          Number(
            (scores[bestIndex] * 100)
              .toFixed(2)
          )
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
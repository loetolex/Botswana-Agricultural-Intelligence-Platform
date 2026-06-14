import * as tf from "@tensorflow/tfjs-node";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const loadedModels = {};

async function loadModel(modelName) {
  if (loadedModels[modelName]) {
    return loadedModels[modelName];
  }

  const modelPath = path.join(
    process.cwd(),
    "public",
    "models",
    modelName,
    "model.json"
  );

  const metadataPath = path.join(
    process.cwd(),
    "public",
    "models",
    modelName,
    "metadata.json"
  );

  const model = await tf.loadLayersModel(
    `file://${modelPath}`
  );

  const metadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf8")
  );

  loadedModels[modelName] = {
    model,
    labels: metadata.labels
  };

  console.log(`${modelName} model loaded`);

  return loadedModels[modelName];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const {
      model: modelName,
      image
    } = req.body;

    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: "Model not specified"
      });
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        error: "Image not provided"
      });
    }

    const {
      model,
      labels
    } = await loadModel(modelName);

    const base64Data = image.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    const buffer = Buffer.from(
      base64Data,
      "base64"
    );

    const resized = await sharp(buffer)
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

    const prediction = model.predict(tensor);

    const scores = await prediction.data();

    let bestIndex = 0;

    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIndex]) {
        bestIndex = i;
      }
    }

    const results = labels.map((label, index) => ({
      label,
      confidence: Number(
        (scores[index] * 100).toFixed(2)
      )
    }));

    results.sort(
      (a, b) => b.confidence - a.confidence
    );

    tf.dispose(tensor);
    tf.dispose(prediction);

    return res.status(200).json({
      success: true,
      model: modelName,
      prediction: labels[bestIndex],
      confidence: Number(
        (scores[bestIndex] * 100).toFixed(2)
      ),
      topPredictions: results.slice(0, 5)
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
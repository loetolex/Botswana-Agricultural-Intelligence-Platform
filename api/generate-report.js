export default async function handler(req, res) {

  try {

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch(error){

    return res.status(500).json({
      error:error.message
    });

  }

}
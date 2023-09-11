const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const process = require("process");
const recorder = require("node-record-lpcm16");
const speech = require("@google-cloud/speech");
const textToSpeech = require("@google-cloud/text-to-speech");
const fs = require("fs");
const util = require("util");
const { v4: uuidv4 } = require("uuid");

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const port = process.env.PORT || 3333;
// const router = express.Router();
const templates = path.join(process.cwd(), "templates");
const publicDir = path.join(process.cwd(), "public");
const responseFileDir = path.join(publicDir, "responseFiles");
app.use(express.static(publicDir));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* RECORD */
const speechClient = new speech.SpeechClient();
const encoding = "LINEAR16"; //e.g. LINEAR16, FLAC, OGG_OPUS - https://cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig#AudioEncoding
const sampleRateHertz = 16000; //HZ - you generally need to sample more than twice the highest frequency of any sound wave you wish to capture digitally
const languageCode = "en-US"; //BCP-47 language code - https://cloud.google.com/speech-to-text/docs/languages
let streamScript = ""; //will hold the transcript of the user's request
let recording; //will hold the noderecord instance;
let recognizeStream; //will hold the google speech to text stream

/* RESPOND */
const ttsClient = new textToSpeech.TextToSpeechClient();
const writeFile = util.promisify(fs.writeFile);

let aiResponse = "";

const initRecognizeStream = () => {
  const userRequestConfig = {
    config: {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
    interimResults: false,
  };
  recognizeStream = speechClient
    .streamingRecognize(userRequestConfig)
    .on("error", console.error)
    .on("data", (data) => {
      const transcript =
        data.results[0] && data.results[0].alternatives[0]
          ? `${data.results[0].alternatives[0].transcript}\n`
          : "\n\nReached transcription time limit, press Ctrl+C\n";
      // process.stdout.write(transcript);
      streamScript += transcript;
    });
  console.log("recognize stream initialized");
};

const pauseRecordVoice = () => {
  recording.pause();
};

const stopRecordVoice = () => {
  recognizeStream.end();
  recognizeStream.destroy();
  recording.stop();
  recognizeStream = null;
};

const recordVoice = () => {
  if (!recording) {
    recording = recorder.record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0,
      // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
      verbose: false,
      recordProgram: "rec", // Try also "arecord" or "sox"
      silence: "10.0",
    });

    // Start recording and send the microphone input to the Speech API.
    // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
    recording.stream().on("error", console.error).pipe(recognizeStream);
  } else {
    recording.resume();
  }

  console.log("Listening");
};

app.get("/api/getTranscription", (req, res) => {
  res.status(200).json({ script: streamScript });
});

app.get("/api/clearTranscription", (req, res) => {
  console.log("api clear");
  streamScript = "";
  res.status(200).json({ message: "transcription cleared" });
});

app.get("/api/submitTranscription", async (req, res) => {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: streamScript }],
    model: "gpt-3.5-turbo",
  });

  // console.log(completion.choices);
  try {
    aiResponse = completion.choices[0].message.content;
    res.status(200).json({ message: "success", aiResponse: aiResponse });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: `error, ${error}` });
  }
});

const getSpeechFilePath = (speechFileName) => {
  return path.join(responseFileDir, `/${speechFileName}.mp3`);
};

app.post("/api/deleteResponseFile", (req, res) => {
  const { speechFile } = req.body;
  const speechFilePath = getSpeechFilePath(speechFile);
  fs.unlink(speechFilePath, (err) => {
    if (err) {
      res.status(500).json({ message: `error deleting audio, ${err}` });
    } else {
      res.status(200).json({ message: "audio file deleted" });
    }
  });
});

app.get("/api/generateAIResponseFile", async (req, res) => {
  const speechRequest = {
    input: { text: aiResponse },
    // Select the language and SSML voice gender (optional)
    //https://cloud.google.com/text-to-speech/docs/ssml
    voice: {
      languageCode: "en-US",
      name: "en-US-Studio-M",
      ssmlGender: "MALE",
    },
    // select the type of audio encoding
    audioConfig: { audioEncoding: "MP3" },
  };

  // Performs the text-to-speech request
  const [speechResponse] = await ttsClient.synthesizeSpeech(speechRequest);
  // Write the binary audio content to a local file

  const speechFileName = uuidv4();
  const speechFilePath = getSpeechFilePath(speechFileName);
  console.log(speechFilePath);
  await writeFile(speechFilePath, speechResponse.audioContent, "binary");
  res.status(200).json({ message: "success", speechFile: speechFileName });
});

app.get("/api/pauseRecordVoice", (req, res) => {
  console.log("api pause");
  pauseRecordVoice();
  res.status(200).json({ message: "recording paused" });
});

app.get("/api/stopRecordVoice", (req, res) => {
  console.log("api stop");
  stopRecordVoice();
  res.status(200).json({ message: "recording stopped" });
});

app.get("/api/recordVoice", (req, res) => {
  console.log("api voice");
  if (!recognizeStream) {
    initRecognizeStream();
  }
  recordVoice();
  res.status(200).json({ message: "recording" });
});

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: templates });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const express = require("express");
const app = express();
const path = require("path");
const process = require("process");
const recorder = require("node-record-lpcm16");
const speech = require("@google-cloud/speech");

const port = process.env.PORT || 3333;
// const router = express.Router();
const templates = path.join(process.cwd(), "templates");
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

const client = new speech.SpeechClient();
const encoding = "LINEAR16"; //e.g. LINEAR16, FLAC, OGG_OPUS - https://cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig#AudioEncoding
const sampleRateHertz = 16000; //HZ - you generally need to sample more than twice the highest frequency of any sound wave you wish to capture digitally
const languageCode = "en-US"; //BCP-47 language code - https://cloud.google.com/speech-to-text/docs/languages

let streamScript = "";
let recording;

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: false,
};

const recognizeStream = client
  .streamingRecognize(request)
  .on("error", console.error)
  .on("data", (data) => {
    const transcript =
      data.results[0] && data.results[0].alternatives[0]
        ? `${data.results[0].alternatives[0].transcript}\n`
        : "\n\nReached transcription time limit, press Ctrl+C\n";
    // process.stdout.write(transcript);
    streamScript += transcript;
  });

const pauseRecordVoice = () => {
  recording.pause();
};

const stopRecordVoice = () => {
  recognizeStream.end();
  recognizeStream.destroy();
  recording.stop();
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
  recordVoice();
  res.status(200).json({ message: "recording" });
});

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: templates });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

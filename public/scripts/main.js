let recordActive = false;
let transcriptionInterval;

const clearAudioTranscript = () => {
  document.querySelector(".audio-transcript").innerText = "";
};

const toggleTranscriptionPolling = (active = false) => {
  if (active) {
    transcriptionInterval = setInterval(() => {
      fetch("/api/getTranscription", {
        method: "get",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          document.querySelector(".audio-transcript").innerText = data.script;
        })
        .catch((err) => console.log(err));
    }, 1000);
  } else {
    clearInterval(transcriptionInterval);
  }
};

const toggleRecordingUI = (active = false) => {
  document.body.classList.toggle("js-recording", active);
  if (active) {
    document.querySelector(".audio-record-btn").innerText = "Pause";
  } else {
    document.querySelector(".audio-record-btn").innerText = "Record";
  }
};

const handleServerPauseRecord = () => {
  fetch("/api/pauseRecordVoice", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    })
    .catch((err) => console.log(err));
};

const handleServerStopRecord = () => {
  fetch("/api/stopRecordVoice", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    })
    .catch((err) => console.log(err));
};

const handleServerRecord = () => {
  fetch("/api/recordVoice", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      "recording started";
      console.log(data);
    })
    .catch((err) => console.log(err));
};

const handleServerClearTranscription = () => {
  fetch("/api/clearTranscription", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    })
    .catch((err) => console.log(err));
};

const onRecordClick = () => {
  if (recordActive) {
    //if recording, stop
    recordActive = false;
    handleServerPauseRecord();
    toggleTranscriptionPolling(false);
    toggleRecordingUI(false);
  } else {
    //startRecording
    recordActive = true;
    handleServerRecord();
    toggleRecordingUI(true);
    toggleTranscriptionPolling(true);
  }
};

const onClearClick = () => {
  clearAudioTranscript();
  handleServerClearTranscription();
};

const onAudioSubmitClick = () => {
  toggleRecordingUI(false);
  handleServerStopRecord();
};

const addEventListeners = () => {
  document
    .querySelector(".audio-record-btn")
    .addEventListener("click", onRecordClick);

  document
    .querySelector(".audio-clear-btn")
    .addEventListener("click", onClearClick);

  document
    .querySelector(".audio-submit-btn")
    .addEventListener("click", onAudioSubmitClick);
};

const init = () => {
  addEventListeners();
};

init();

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

const clearJSClasses = () => {
  document.body.className = "";
};

const toggleRecordingUI = (active = false) => {
  clearJSClasses();
  // document.body.classList.toggle("js-recording", active);
  if (active) {
    document.querySelector(".audio-record-btn").innerText = "Pause";
  } else {
    document.querySelector(".audio-record-btn").innerText = "Record";
  }
};

const toggleResponseUI = (active = false) => {
  clearJSClasses();
  document.body.classList.toggle("js-responding", active);
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

const handleServerStopRecord = async () => {
  return new Promise((resolve, reject) => {
    fetch("/api/stopRecordVoice", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        resolve(res.json());
      })
      .catch((err) => {
        reject(err);
      });
  });
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

const writeAIResponse = (aiResponse) => {
  document.querySelector(".audio-response").innerText = aiResponse;
};

const handleServerSubmitTranscription = () => {
  fetch("/api/submitTranscription", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      try {
        const aiResponse = data.aiResponse;
        writeAIResponse(aiResponse);
      } catch (error) {
        console.log(error);
      }
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
  toggleResponseUI(true);
  handleServerStopRecord().then(() => {
    handleServerSubmitTranscription();
  });
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

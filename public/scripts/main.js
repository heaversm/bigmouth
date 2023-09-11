let recordActive = false;
let transcriptionInterval;
let globalSpeechFile;

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

const handleDeleteSpeechFile = (speechFile) => {
  return new Promise((resolve, reject) => {
    fetch("/api/deleteResponseFile", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ speechFile: speechFile }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        globalSpeechFile = null;
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const handleServerAudioResponseFinished = async (speechFile) => {
  if (globalSpeechFile) {
    await handleDeleteSpeechFile(speechFile);
    console.log("speech file deleted");
  }
};

const playAudioResponse = (speechFile) => {
  const audioPlayer = document.querySelector(".audio-response__player");
  audioPlayer.src = `/responseFiles/${speechFile}.mp3`;

  audioPlayer.addEventListener("ended", () => {
    console.log("ended");
    handleServerAudioResponseFinished(speechFile);
  });

  audioPlayer.play();
};

const generateAIResponseFile = (aiResponse) => {
  fetch("/api/generateAIResponseFile", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      const { speechFile } = data;
      globalSpeechFile = speechFile; //store in global...for now
      try {
        playAudioResponse(speechFile);
      } catch (error) {
        console.log("error playing audio response", error);
      }
    })
    .catch((err) => console.log(err));
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
        generateAIResponseFile(aiResponse);
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

const onAskNewQuestionClick = async (e) => {
  e.preventDefault();
  //restart the q&a process
  if (globalSpeechFile) {
    await handleDeleteSpeechFile(globalSpeechFile);
    console.log("deleted");
    window.location = "/"; //TODO: no need to navigate to new page, just restart the interface
  }
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

  document
    .querySelector(".audio-response__restart-btn")
    .addEventListener("click", onAskNewQuestionClick);
};

const init = () => {
  addEventListeners();
};

init();

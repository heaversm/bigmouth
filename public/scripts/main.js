let isPlaying = false; //true when AI audio is playing
let transcriptionInterval; //interval for receiving the current recorded transcription
let globalSpeechFile; //the current speech file being played

const BUTTON_STATUS = {
  record: {
    text: "BIGMOUTH",
    iconURL: "/images/btn-record.png",
  },
  recording: {
    text: "STOP",
    iconURL: "/images/btn-stop.png",
  },
  wait: {
    text: "WAIT...",
    iconURL: "/images/btn-pause.png",
  },
};

const clearAudioTranscript = () => {
  document.querySelector(".audio-transcript").innerText = "";
};

const clearAudioResponse = () => {
  document.querySelector(".audio-response").innerText = "";
};

const disableRecordButton = (disabled = true) => {
  document.querySelector(".audio-record__btn").disabled = disabled;
};

const setRecordStatus = (status) => {
  const statusCFG = BUTTON_STATUS[status];
  document.querySelector(".audio-record__label").innerText = statusCFG.text;
  // document.querySelector(".audio-record__btn").src = `${statusCFG.iconURL}`;
};

const toggleTranscriptionPolling = (active = false) => {
  console.log("toggleTranscriptionPolling", active);
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
          if (data.script) {
            console.log(data.script);
            document.querySelector(".audio-transcript").innerText = data.script;
          }
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
  return new Promise((resolve, reject) => {
    fetch("/api/recordVoice", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const handleServerClearTranscription = () => {
  return new Promise((resolve, reject) => {
    fetch("/api/clearTranscription", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
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

const handleAudioResponseFinished = async (speechFile) => {
  //clear the transcript from the textbox
  clearAudioTranscript();
  //clear audio response from the textbox
  clearAudioResponse();
  //handle the class-based styles
  toggleState("playing", false);
  //clear the transcript from the server
  handleServerClearTranscription().then(async () => {
    if (globalSpeechFile) {
      await handleDeleteSpeechFile(speechFile);
      console.log("speech file deleted");
      disableRecordButton(false);
      setRecordStatus("record");
      // window.location = "/";
    }
  });
};

const playAudioResponse = (speechFile) => {
  toggleState("playing", true);
  const audioPlayer = document.querySelector(".audio-response__player");
  audioPlayer.src = `/responseFiles/${speechFile}.mp3`;

  audioPlayer.addEventListener("ended", () => {
    console.log("audio playback ended");
    handleAudioResponseFinished(speechFile);
  });

  audioPlayer.play();
};

const generateAIResponseFile = (aiResponse) => {
  return new Promise((resolve, reject) => {
    fetch("/api/generateAIResponseFile", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        resolve(data.speechFile);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const handleServerSubmitTranscription = () => {
  return new Promise((resolve, reject) => {
    fetch("/api/submitTranscription", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        resolve(data.aiResponse);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const toggleState = (state, active = true) => {
  clearJSClasses();
  document.body.classList.toggle(`js-${state}`, active);
};

const onRecordDown = async () => {
  handleServerRecord().then(async () => {
    //manage the UI
    setRecordStatus("recording");
    toggleState("recording", true);
    //start looking for the latest transcript results
    toggleTranscriptionPolling(true);
  });
};

const onRecordUp = () => {
  //stop looking for the latest transcript results
  toggleTranscriptionPolling(false);
  //manage the UI
  toggleState("responding", true);
  setRecordStatus("wait");
  disableRecordButton(true);
  //tell the server to stop recording
  handleServerStopRecord().then(async () => {
    console.log("stopped recording. Submitting transcription");
    handleServerSubmitTranscription().then(async (aiResponse) => {
      //write response on screen
      writeAIResponse(aiResponse);
      generateAIResponseFile(aiResponse).then(async (speechFile) => {
        globalSpeechFile = speechFile; //store in global...for now
        try {
          playAudioResponse(speechFile);
          //when play is done, handleAudioResponseFinished will be called
        } catch (error) {
          console.log("error playing audio response", error);
        }
      });
    });
  });
};

const addEventListeners = () => {
  //start recording
  document
    .querySelector(".audio-record__btn")
    .addEventListener("mousedown", onRecordDown);

  //stop recording and submit
  document
    .querySelector(".audio-record__btn")
    .addEventListener("mouseup", onRecordUp);
};

const init = () => {
  addEventListeners();
};

init();

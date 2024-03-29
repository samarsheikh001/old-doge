const socket = io("", {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

//BUTTONS
const fullScreen = document.getElementById("fullScreen");
const pauseBut = document.getElementById("pause");
const playBut = document.getElementById("play");
const hideToggle = document.getElementById("hide-toggle");
const setLinkBut = document.getElementById("set-link");
const setRoomname = document.getElementById("set-roomname");
const setUsername = document.getElementById("set-username");
const buttons = document.getElementById("buttons-group");

// INPUT ELEMENTS
const videoLinkInput = document.getElementById("video-link");
const usernameInput = document.getElementById("user-name");
const roomnameInput = document.getElementById("room-name");

//ELEMENTS
const streamVid = document.getElementById("streamVideo");
const videoUrlElem = document.getElementById("video-url-element");

//Variables
let isHost = false;
let userName = "User" + parseInt(Math.random() * 100000);
let roomName = new URL(location).searchParams.get("room");

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

videoUrlElem.style.display = "none";

let rand = () => parseInt(Math.random() * 255);
let randomColor = `rgb(${rand()},${rand()},${rand()})`;

if (roomName) {
  roomnameInput.placeholder = roomName;
  socket.emit("create or join", roomName);
}

//ONCLICKS EVENTS HERE
setUsername.onclick = () => {
  if (usernameInput.value) userName = usernameInput.value;
};

setRoomname.onclick = () => {
  if (!roomName) roomName = roomnameInput.value;
  socket.emit("create or join", roomName);
};

setLinkBut.onclick = async () => {
  await setVideo({ ytUrl: videoLinkInput.value });
  streamVid.currentTime = 0;
  if (isHost)
    socket.emit("set client video", {
      videoUrl: streamVid.src,
      position: streamVid.currentTime,
      roomName,
    });
};

hideToggle.onclick = () => {
  if (buttons.style.display == "none") {
    hideToggle.innerText = "HC";
    buttons.style.display = "";
  } else {
    hideToggle.innerText = "UC";
    buttons.style.display = "none";
  }
};

pauseBut.disabled = true;
playBut.onclick = () => streamVid.play();

pauseBut.onclick = () => streamVid.pause();
fullScreen.onclick = () => streamVid.requestFullscreen();

socket.on("control events", (event) => {
  if (isHost) return;
  event === "play" ? streamVid.play() : streamVid.pause();
});

socket.on("sync position", (position) => {
  let diff = position - player.currentTime;
  if (Math.abs(diff) > 1) player.currentTime = position;
});

socket.on("chat message", ({ userName, message, userColor }) => {
  let item = document.createElement("li");
  item.style.color = userColor;
  item.textContent = userName + ": " + message;
  messages.appendChild(item);
  scroll.scroll(0, scroll.scrollHeight);
});

socket.on("is Host", () => {
  pauseBut.disabled = false;
  isHost = true;
  videoUrlElem.style.display = "";
  let ytId = new URL(location).searchParams.get("v");
  if (ytId) setVideo({ ytId });
});

socket.on("client joined", () => {
  if (isHost)
    socket.emit("set client video", {
      videoUrl: streamVid.src,
      position: streamVid.currentTime,
      roomName,
    });
});

socket.on("set client video", ({ videoUrl, position, roomName }) => {
  console.log("set client video received", roomName, videoUrl);
  if (isHost) return;
  streamVid.src = videoUrl;
  streamVid.onloadeddata = (e) => {
    e.target.currentTime = position;
  };
});

//FUNCTIONS

const setVideo = async ({ ytUrl, ytId }) => {
  console.log("set vide called", ytUrl);
  let id;
  if (ytUrl.search("youtu") === -1) {
    streamVid.src = ytUrl;
  } else {
    try {
      if (!ytId) id = new URL(ytUrl).searchParams.get("v");
      else id = ytId;
      console.log("abeee id", id);
      if (!id) id = new URL(ytUrl).pathname.replace("/", "");
    } catch (error) {
      console.log("traceee");
    }
    console.log("hereeeeee", id);
    const response = await fetch(`/watch/${id}`);
    const jsonResponse = await response.json();
    console.log("download link", jsonResponse.link);
    streamVid.src = jsonResponse.link;
  }
};

// Sync video position (debounced)
const syncPositionDebounced = debounce(() => {
  if (isHost)
    socket.emit("sync position", { position: streamVid.currentTime, roomName });
}, 500);

streamVid.oncanplay = (e) => {
  console.log("video is ready");
};

streamVid.onpause = () => {
  if (isHost) socket.emit("control events", { event: "pause", roomName });
};
streamVid.onplay = () => {
  if (isHost) socket.emit("control events", { event: "play", roomName });
};

streamVid.ontimeupdate = (e) => {
  // Sync video position (debounced)
  const syncPositionDebounced = debounce(() => {
    if (isHost)
      socket.emit("sync position", {
        position: streamVid.currentTime,
        roomName,
      });
  }, 500);

  //   if (isHost) socket.emit("sync position", { position: streamVid.currentTime, roomName });
};

const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");
const scroll = document.getElementById("scroll");

input.addEventListener("keydown", () => {
  socket.emit("typing", { userName: userName, roomName: roomName });
});

socket.on("typing", (data) => {
  console.log(data);
  var typing = document.getElementById("typing");
  typing.innerHTML = `${data.userName} is typing...`;
});

socket.on("stop typing", (data) => {
  var typing = document.getElementById("typing");
  typing.innerHTML = "";
});

form.onsubmit = (e) => {
  e.preventDefault();
  if (input.value) {
    let item = document.createElement("li");
    item.style.color = randomColor;
    item.textContent = userName + ":  " + input.value;
    messages.appendChild(item);
    socket.emit("chat message", {
      userName: userName || "User" + Math.random(),
      message: input.value,
      roomName,
      randomColor,
    });
    input.value = "";
    scroll.scroll(0, scroll.scrollHeight);
  }
  return false;
};

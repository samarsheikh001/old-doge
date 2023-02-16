const socket = io();

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
var isHost = false;
var userName = "User" + parseInt(Math.random() * 100000);
var roomName = new URL(location).searchParams.get("room");

videoUrlElem.style.display = "none";

var rand = () => parseInt(Math.random() * 255)
var randomColor = `rgb(${rand()},${rand()},${rand()})`

if (roomName) {
    roomnameInput.placeholder = roomName;
    socket.emit("create or join", roomName);
}

//ONCLICKS EVENTS HERE
setUsername.onclick = () => {
    if (usernameInput.value)
        userName = usernameInput.value;
}

setRoomname.onclick = () => {
    if (!roomName) roomName = roomnameInput.value;
    socket.emit("create or join", roomName);
};

setLinkBut.onclick = async() => {
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
    var diff = position - player.currentTime;
    if (Math.abs(diff) > 1) player.currentTime = position;
});

socket.on("chat message", ({ userName, message, userColor }) => {
    var item = document.createElement("li");
    item.style.color = userColor;
    item.textContent = userName + ": " + message;
    messages.appendChild(item);
    scroll.scroll(0, scroll.scrollHeight);
});

socket.on("is Host", () => {
    pauseBut.disabled = false;
    isHost = true;
    videoUrlElem.style.display = "";
    var ytId = new URL(location).searchParams.get("v");
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

const setVideo = async({ ytUrl, ytId }) => {
    console.log("set vide called", ytUrl)
    var id;
    if (ytUrl.search("youtu") === -1) {
        streamVid.src = ytUrl;
    } else {
        try {
            if (!ytId) id = new URL(ytUrl).searchParams.get("v");
            else id = ytId;
            console.log("abeee id", id)
            if (!id) id = new URL(ytUrl).pathname.replace('/', '');
        } catch (error) {
            console.log("traceee")
        }
        console.log("hereeeeee", id)
        const response = await fetch(`/watch/${id}`);
        const jsonResponse = await response.json();
        console.log("download link", jsonResponse.link);
        streamVid.src = jsonResponse.link;
    }
};

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
    if (isHost)
        socket.emit("sync position", { position: streamVid.currentTime, roomName });
};

const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");
const scroll = document.getElementById("scroll");
form.onsubmit = (e) => {
    e.preventDefault();
    if (input.value) {
        var item = document.createElement("li");
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
};
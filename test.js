const fs = require('fs');
const ytdl = require('ytdl-core');

const fetch = async () => {
    const a = await ytdl.getInfo('http://www.youtube.com/watch?v=aqz-KE-bpKQ');
    console.log(a["formats"]["0"].url)
}

fetch()
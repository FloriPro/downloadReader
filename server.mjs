import express from 'express';
import fetch from 'node-fetch';
import path from 'path';

var app = express();
global.__dirname = path.resolve(path.dirname(''));


app.use("/static", express.static(__dirname + '/public', {
    maxAge: 1
}));

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

//api
app.get("/api/page", async function (req, res) {
    var url = req.query.url;
    if (!url) {
        res.status(400).send("url is required");
        return;
    }
    var page = {
        url: url,
        content: null,
        status: "ok"
    };
    try {
        var host = new URL(url).host;
        var headers = {
            'Content-Type': 'text/html',
            "Host": host,
            "Referer": "https://" + host + "/",
        };
        var copyHeaders = ["Accept", "Accept-Encoding", "Accept-Language", "Cache-Control", "Connection", "Cookie", "Pragma", "Sec-Fetch-Dest", "Sec-Fetch-Mode", "Sec-Fetch-Site", "User-Agent", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform"];
        for (var i = 0; i < copyHeaders.length; i++) {
            var h = copyHeaders[i];
            if (req.headers[h]) {
                headers[h] = req.headers[h];
            }
        }

        var f = await fetch(url, {
            headers: headers
        });
        var text = await f.text();
    } catch (err) {
        res.status(500).send({
            error: err,
            status: "error"
        });
        return;
    }
    page.content = text;

    res.send(page);
});


app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
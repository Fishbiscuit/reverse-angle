# Reverse Angle

A photo reply gives everyone a new place to stand. Reverse Angle reads photographs published on separate Blygger blogs and shows them as a contact sheet, a match cut, and two viewpoints in a walkable gallery.

[Open the live demo](https://fishbiscuit.github.io/reverse-angle/) · [Watch the walkthrough](https://fishbiscuit.github.io/reverse-angle/demo.mp4) · [Blygger v0.4](https://blygger.org/spec/0.4/)

1. In **Contact sheet**, open each photo’s source post. The reply is a thread with a native `stub_of` reference to the original item and version.
2. Choose **Watch the match cut**. The screen clamp stays in place when the author and viewpoint change. The reply lands back on the sheet.
3. Choose **Walk the room** and **Behind the screen**. The camera moves down the side aisle and opens the second photographer’s post beside the room.
4. To try a new contribution, publish a photo reply from your own Blygger client and paste its public permalink or item JSON link into **Add a published photo reply**. The source needs to permit browser cross-origin reads. The viewer compares the reply’s declared target to the displayed original. It shows the accepted contribution in the current session.

## Run locally

Requires Node 22 or newer. Tested with Node 26. All browser dependencies are included.

```sh
node tools/build.mjs http://127.0.0.1:8765/ /tmp/reverse-angle-demo
node tools/serve.mjs /tmp/reverse-angle-demo 8765
```

Open `http://127.0.0.1:8765/`. Use an empty output directory for each build. The build publishes actual static Blygger item documents, feeds and permalink pages for the two project-controlled demo origins. The viewer reads these over HTTP at runtime. To stage an edition from existing publishers, supply their two public item or permalink URLs in `scene.json`.

The public demo uses generated photos and fictional bylines. Both demo blogs are operated by the project. The local walkthrough also exercises a fresh reply served on a second HTTP origin. The gallery is a hand-built room study with authored viewpoints. A reconstructed room and automatic Webmention intake are future work. Publishing from inside Reverse Angle is handled in the contributor’s own Blygger client.

The original motion study took cues from Oriku’s [LOTUS poster](https://x.com/Oriku175/status/2065701075202806030) and Mia AI Lab’s [Landscapes in One Pen](https://github.com/MiaAI-Lab/Claude-Fable-5.2-HTML-Files/blob/main/018-pen-plotter-landscapes.txt). Three.js 0.180.0 is distributed under the included [MIT license](vendor/three.LICENSE.txt).

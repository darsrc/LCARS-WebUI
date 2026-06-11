# Media Widgets

Media widgets cover live logs, HLS video descriptors, and push-to-talk audio commands.

## `log`

`log` displays lines from an application stream. Use `append_log` to add lines from handlers.

```python
if lcars.button("Refresh Telemetry", id="refresh"):
    lcars.append_log("ops-log", "Telemetry refresh requested")

lcars.log("ops-log", title="Operations Log", max_lines=8)
```

## `video_hls`

`video_hls` renders an HLS video player. The source should be a `.m3u8` manifest URL that the app security policy allows.

```python
lcars.video_hls(
    "/media/demo/manifest.m3u8",
    title="Local HLS Descriptor",
    autoplay=True,
    muted=True,
)
```

## `mic_button`

`mic_button` records audio in the browser and posts it to the upload endpoint.

```python
lcars.mic_button("ks-mic-command", title="Mic Command")
```

## Example Context

The media widgets appear in the input panel of the kitchen sink app.

![Input widgets active state](images/input-widgets-active-states.png)


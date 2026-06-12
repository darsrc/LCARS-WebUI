# Media Widgets

Media widgets cover live logs, HLS video descriptors, and push-to-talk audio commands.

## `log`

`log` displays lines from an application stream. Use `append_log` to add lines from handlers.

```python
if lcars.button("Refresh Telemetry", id="refresh"):
    lcars.append_log("ops-log", "Telemetry refresh requested")

lcars.log("ops-log", title="Operations Log", max_lines=8)
```

The first argument is the stream id. It does not have to match the log widget id, but it
must match the first argument passed to `append_log`.

```python
lcars.log("ops-log", title="Operations Log", max_lines=8, id="ops-log-widget")
lcars.append_log("ops-log", "line routed by stream id")
```

`max_lines` limits the retained browser-side lines for that stream.

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

Prefer app-local media paths or explicitly allowed sources. If the HLS manifest cannot be
loaded by the browser, the widget still renders but playback cannot start.

## `mic_button`

`mic_button` records audio in the browser and posts it to the upload endpoint.

```python
lcars.mic_button("ks-mic-command", title="Mic Command")
```

The first argument is the audio action id. The widget posts to `/lcars/upload/audio` by
default. Use `upload_url=` when the app provides a custom upload endpoint.

## Example Context

The media widgets appear in the input panel of the kitchen sink app.

![Input widgets active state](images/input-widgets-active-states.png)

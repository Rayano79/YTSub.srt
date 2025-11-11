function parseSRT(data) {
  // Remove \r and split file into blocks (each block = subtitle entry)
  const srt = data.replace(/\r/g, "").trim().split(/\n\n+/);
  const result = [];

  for (let i = 0; i < srt.length; i++) {
    const lines = srt[i].split("\n");
    if (lines.length < 2) {
      // Invalid block, skip it
      continue;
    }

    // Second line usually contains timing
    const times = lines[1].split(" --> ");
    if (!times[0] || !times[1]) {
      continue;
    }

    const start = parseSrtTime(times[0]);
    const end = parseSrtTime(times[1]);

    // Rest of lines are subtitle text
    let text = lines.slice(2).join("\n");

    // Keep HTML tags like <font> (no removal)

    result.push({ start, end, text });
  }

  return result;
}

function parseSrtTime(time) {
  try {
    if (!time) return 0;

    const parts = time.trim().split(":");
    if (parts.length !== 3) return 0;

    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const sPart = parts[2];

    let sec = "0";
    let ms = "0";

    if (sPart.includes(",")) {
      const split = sPart.split(",");
      sec = split[0];
      ms = split[1] || "0";
    } else if (sPart.includes(".")) {
      const split = sPart.split(".");
      sec = split[0];
      ms = split[1] || "0";
    } else {
      sec = sPart;
      ms = "0";
    }

    const seconds = h * 3600 + m * 60 + parseInt(sec, 10) + parseInt(ms, 10) / 1000;
    return isNaN(seconds) ? 0 : seconds;
  } catch (e) {
    console.warn("Invalid SRT time format:", time, e);
    return 0;
  }
}
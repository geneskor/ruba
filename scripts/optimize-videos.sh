#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_FILE="$ROOT_DIR/src/data/videos.json"
VIDEOS_DIR="$ROOT_DIR/public/videos"
HD_DIR="$VIDEOS_DIR/optimized/hd"
SD_DIR="$VIDEOS_DIR/optimized/sd"

mkdir -p "$HD_DIR" "$SD_DIR"

if ! command -v avconvert >/dev/null 2>&1; then
  echo "Ошибка: avconvert не найден."
  exit 1
fi

if ! command -v cwebp >/dev/null 2>&1; then
  echo "Ошибка: cwebp не найден."
  exit 1
fi

echo "Чтение списка видео из $DATA_FILE"
while IFS=$'\t' read -r SRC_REL POSTER_REL SRC_HD_REL SRC_SD_REL; do
  if [[ -z "$SRC_REL" ]]; then
    continue
  fi

  STEM="$(basename "${SRC_REL%.*}")"
  TARGET_HD_REL="${SRC_HD_REL:-/videos/optimized/hd/$STEM.mp4}"
  TARGET_SD_REL="${SRC_SD_REL:-/videos/optimized/sd/$STEM.mp4}"

  SRC_FILE="$ROOT_DIR/public${SRC_REL}"
  HD_OUT="$ROOT_DIR/public${TARGET_HD_REL}"
  SD_OUT="$ROOT_DIR/public${TARGET_SD_REL}"

  mkdir -p "$(dirname "$HD_OUT")" "$(dirname "$SD_OUT")"

  IS_OPTIMIZED_SRC=false
  if [[ "$SRC_REL" == /videos/optimized/* ]]; then
    IS_OPTIMIZED_SRC=true
  fi

  NEED_HD=true
  NEED_SD=true

  if $IS_OPTIMIZED_SRC; then
    if [[ -f "$HD_OUT" ]]; then
      NEED_HD=false
    fi
    if [[ -f "$SD_OUT" ]]; then
      NEED_SD=false
    fi
  fi

  if [[ "$NEED_HD" == true || "$NEED_SD" == true ]]; then
    if [[ ! -f "$SRC_FILE" ]]; then
      echo "Пропуск: исходный файл не найден: $SRC_FILE"
      continue
    fi

    if [[ "$NEED_HD" == true ]]; then
      HD_TMP="${HD_OUT%.mp4}-hdtmp"
      echo "HD: $SRC_REL -> $TARGET_HD_REL"
      avconvert \
        --source "$SRC_FILE" \
        --preset PresetMediumQuality \
        --output "$HD_TMP" \
        --replace \
        --disableMetadataFilter \
        >/dev/null
      mv -f "$HD_TMP" "$HD_OUT"
    fi

    if [[ "$NEED_SD" == true ]]; then
      SD_TMP="${SD_OUT%.mp4}-sdtmp"
      echo "SD: $SRC_REL -> $TARGET_SD_REL"
      avconvert \
        --source "$SRC_FILE" \
        --preset PresetAppleM4VCellular \
        --output "$SD_TMP" \
        --replace \
        --disableMetadataFilter \
        >/dev/null
      mv -f "$SD_TMP" "$SD_OUT"
    fi
  else
    echo "SKIP: уже оптимизировано $SRC_REL"
  fi

  if [[ "$POSTER_REL" =~ \.[Pp][Nn][Gg]$ ]]; then
    POSTER_FILE="$ROOT_DIR/public${POSTER_REL}"
    if [[ -f "$POSTER_FILE" ]]; then
      POSTER_WEBP="${POSTER_FILE%.*}.webp"
      echo "POSTER: $POSTER_REL -> ${POSTER_REL%.*}.webp"
      cwebp -quiet -q 72 "$POSTER_FILE" -o "$POSTER_WEBP"
    else
      echo "Пропуск постера: файл не найден: $POSTER_FILE"
    fi
  fi
done < <(
  node --input-type=module -e '
    import fs from "node:fs";
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    for (const video of data.videos) {
      console.log(`${video.src}\t${video.poster ?? ""}\t${video.srcHd ?? ""}\t${video.srcSd ?? ""}`);
    }
  ' "$DATA_FILE"
)

echo "Обновление $DATA_FILE"
node --input-type=module -e '
  import fs from "node:fs";
  import path from "node:path";

  const dataFile = process.argv[1];
  const rootDir = process.argv[2];
  const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));

  for (const video of data.videos) {
    const currentSrc = typeof video.src === "string" ? video.src : "";
    const currentPoster = typeof video.poster === "string" ? video.poster : "";
    const stemSource = video.srcHd || currentSrc;
    const stem = path.basename(stemSource, path.extname(stemSource));

    video.srcHd = `/videos/optimized/hd/${stem}.mp4`;
    video.srcSd = `/videos/optimized/sd/${stem}.mp4`;
    video.src = video.srcHd;
    if (/\.png$/i.test(currentPoster)) {
      video.poster = currentPoster.replace(/\.png$/i, ".webp");
    }

    if (currentSrc && !currentSrc.startsWith("/videos/optimized/")) {
      const oldVideo = `${rootDir}/public${currentSrc}`;
      if (fs.existsSync(oldVideo)) {
        fs.unlinkSync(oldVideo);
      }
    }
    if (/\.png$/i.test(currentPoster)) {
      const oldPoster = `${rootDir}/public${currentPoster}`;
      if (fs.existsSync(oldPoster)) {
        fs.unlinkSync(oldPoster);
      }
    }
  }

  fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
' "$DATA_FILE" "$ROOT_DIR"

echo "Готово."

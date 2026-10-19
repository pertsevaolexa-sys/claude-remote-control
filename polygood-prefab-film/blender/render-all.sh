#!/bin/sh
# Render every 3D frame for both formats (resumable: finished frames are skipped).
#   OCIO=<bpy>/datafiles/colormanagement/config.ocio PYTHON=<venv python> sh blender/render-all.sh
set -e
cd "$(dirname "$0")/.."
PY=${PYTHON:-python}
for v in ${VARIANTS:-reels linkedin}; do
  "$PY" blender/render.py --variant "$v" --samples "${SAMPLES:-16}"
done

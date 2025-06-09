import base64, io, os, uuid, datetime, json
import cv2, numpy as np
from PIL import Image
import pytesseract
import easyocr
from google.cloud import storage, firestore
import firebase_admin
from firebase_admin import credentials

# ── Firebase init ───────────────────────────────
if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        "storageBucket": os.environ["STORAGE_BUCKET"]
    })
bucket = storage.Client().bucket(os.environ["STORAGE_BUCKET"])
db     = firestore.Client()

# ── constants ───────────────────────────────────
TEMPLATE      = cv2.imread("template/bp_display.png", cv2.IMREAD_GRAYSCALE)
ROI_W, ROI_H  = TEMPLATE.shape[::-1]
VAR_THRESHOLD = 10.0
OCR_READER    = easyocr.Reader(['en'], gpu=False)

# ── helpers ─────────────────────────────────────
def upload_blob(path, img_bgr):
    blob = bucket.blob(path)
    _, buf = cv2.imencode(".jpg", img_bgr)
    blob.upload_from_string(buf.tobytes(), content_type="image/jpeg")
    return blob.public_url

def lap_var(gray):
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def find_display(gray):
    res = cv2.matchTemplate(gray, TEMPLATE, cv2.TM_CCOEFF_NORMED)
    _, _, _, loc = cv2.minMaxLoc(res)
    x, y = loc
    return gray[y:y+ROI_H, x:x+ROI_W], (x, y)

def ocr_tess(img):
    cfg = "--psm 7 -c tessedit_char_whitelist=0123456789"
    return pytesseract.image_to_string(img, config=cfg).strip()

def ocr_easy(img):
    return ''.join(OCR_READER.readtext(img, detail=0)).strip()

# ── entrypoint ──────────────────────────────────
def process_bp(request):
    try:
        data = request.get_json(force=True)
        b64 = data["image_base64"].split(",")[-1]
        img = cv2.imdecode(np.frombuffer(base64.b64decode(b64), np.uint8),
                           cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        display, (dx, dy) = find_display(gray)
        variance         = lap_var(display)
        glare_detected   = variance < VAR_THRESHOLD

        # simple thirds for digits
        h = display.shape[0] // 3
        crops = [display[i*h:(i+1)*h, :] for i in range(3)]

        primary = [ocr_tess(c) for c in crops]
        second  = [ocr_easy(c) for c in crops]
        consensus = primary == second

        sys_s, dia_s, pul_s = primary
        ts  = datetime.datetime.utcnow().isoformat()
        uid = uuid.uuid4().hex

        # store images
        debug_img = img.copy()
        cv2.rectangle(debug_img, (dx, dy), (dx+ROI_W, dy+ROI_H), (0,255,0), 2)
        img_url  = upload_blob(f"bp/{uid}_orig.jpg", debug_img)
        heat_url = upload_blob(f"bp/{uid}_heat.jpg",
                               cv2.applyColorMap(display, cv2.COLORMAP_JET))

        doc = {
            "timestamp": ts,
            "glare_detected": glare_detected,
            "variance": round(variance,2),
            "image_url": img_url,
            "heatmap_url": heat_url,
            "ocr_raw": {"sys": sys_s, "dia": dia_s, "pul": pul_s},
            "consensus": consensus,
            "ocr_alternates": {
               "sys": [primary[0], second[0]],
               "dia": [primary[1], second[1]],
               "pul": [primary[2], second[2]],
            },
            "systolic": int(sys_s) if sys_s.isdigit() else None,
            "diastolic": int(dia_s) if dia_s.isdigit() else None,
            "pulse": int(pul_s) if pul_s.isdigit() else None
        }
        db.collection("readings").document(uid).set(doc)
        return (json.dumps(doc), 200, {"Content-Type":"application/json"})
    except Exception as e:
        return (json.dumps({"error": str(e)}), 500,
                {"Content-Type":"application/json"})

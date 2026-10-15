# المهاجم الأسطوري | Legendary Striker

لعبة مسيرة كروية عربية: Node.js (Express) + SQLite + واجهة Vanilla JS/SVG. تعمل على المنفذ **3005**.

## التشغيل على VPS
```bash
# Node 22.13+ مطلوب (node:sqlite)
node -v
cd legendary-striker
rm -rf data            # مرة واحدة فقط لو عندك قاعدة بيانات قديمة من النسخة المعطوبة
npm install --omit=dev
npm start              # http://IP:3005
```
تشغيل دائم بـ pm2:
```bash
npm i -g pm2
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```
افتح المنفذ: `ufw allow 3005/tcp` (أو من لوحة aaPanel → Security).

### خلف Nginx + HTTPS (موصى به)
```nginx
location / { proxy_pass http://127.0.0.1:3005; proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; }
```
ثم ضع `COOKIE_SECURE=1` في ecosystem.config.cjs (يعمل فقط مع HTTPS).

## متغيرات البيئة
`PORT` (3005) · `HOST` (0.0.0.0) · `SESSION_SECRET` (اختياري، وإلا يُولَّد تلقائياً في `data/.session_secret`) · `COOKIE_SECURE=1`

## ملاحظات
- لا توجد حسابات افتراضية: سجّل حساباً جديداً. كلمات المرور bcrypt فقط.
- البيانات في `data/legendary_striker.db` — خذ نسخة احتياطية منه.
- المباراة النشطة محفوظة في ذاكرة السيرفر (إعادة تشغيل السيرفر تلغي المباراة الجارية فقط).

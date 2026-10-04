# Critical Management 90 — โปรแกรมฝึกคิด 90 วัน

โปรแกรมฝึก **Critical Thinking → Decision-Making → Systems & Management Thinking** สำหรับ Senior Nurse Manager
(90 วัน · วันละ 30–60 นาที · ~40% Learn / 60% Apply · ประเมิน Day 1/30/60/90)

## ไฟล์ในรีโป

| ไฟล์/โฟลเดอร์ | คืออะไร |
|---|---|
| [90day-site/](90day-site/) | เว็บแอปตัวโปรแกรม (HTML/CSS/JS ล้วน ไม่ต้อง build — เปิดจากไฟล์ตรง ๆ ได้) |
| [server/](server/) | Backend เซิร์ฟเวอร์ sync ข้อมูลจริง (Node.js + Express + SQLite ในตัว `node:sqlite`) |
| [docs/90-day-critical-management-program.md](docs/90-day-critical-management-program.md) | ตัวโปรแกรมฉบับเต็ม: 13 สัปดาห์ · เทมเพลต · เคสฝึก W1–W13 · แบบประเมิน A1–A4 พร้อม rubric 12 ด้าน · แผน course/budget · แผนกันพัง |
| [docs/REVIEW-AND-RECOMMENDATIONS.md](docs/REVIEW-AND-RECOMMENDATIONS.md) | รีวิวเนื้อหา + จุดอ้างอิงหลักวิชาการทั้ง 13 สัปดาห์ + คำแนะนำการเติมเนื้อหาส่วนที่ขาด + เคสกลางคู่ทีละบท (หัวข้อ 6) + ทฤษฎีเชิงลึก/ตัวอย่างเหตุการณ์จริง (หัวข้อ 7) |
| [docs/improvement-handoff.md](docs/improvement-handoff.md) | สรุปการปรับปรุงทั้งหมด + งานที่รอ implement + กติกาการแก้ไขต่อ |
| `Dockerfile` · `docker-compose.yml` | รันทั้งระบบใน Docker (ข้อมูลถาวรบน volume `./data`) |

## เปิดเว็บแอปใช้งาน

### วิธีที่ 1 — Docker (แนะนำ: ข้อมูลจริงเก็บบนเซิร์ฟเวอร์)

```bash
docker compose up -d          # build + start
# เปิด http://localhost:3000
```

- ข้อมูลถูกบันทึกอัตโนมัติลง **SQLite บนเซิร์ฟเวอร์** (`./data/cm90.db` บนเครื่อง host ผ่าน volume) — restart container แล้วข้อมูลอยู่ครบ
- สถานะการซิงก์แสดงที่มุมซ้ายล่างของหน้าเว็บ ("☁️ บันทึกบนเซิร์ฟเวอร์แล้ว")
- **บน Linux server จริง:** ก่อน `docker compose up` ให้รัน `mkdir -p data && sudo chown 1000:1000 data` ก่อน (container รันด้วย user `node` uid 1000 — ถ้าโฟลเดอร์ `./data` ถูกสร้างเป็น root จะเขียน database ไม่ได้)

### วิธีที่ 2 — รัน server ตรง ๆ (ต้องมี Node ≥ 22.5)

```bash
cd server
npm install
npm start                     # PORT=3000 DATA_DIR=./data
# เปิด http://localhost:3000
npm test                      # ทดสอบ API (node --test)
```

### วิธีที่ 3 — เปิดไฟล์ตรง ๆ (โหมดออฟไลน์)

```bash
open 90day-site/index.html    # หรือ double-click
```

โหมดนี้บันทึกใน **localStorage ของเบราว์เซอร์เครื่องนี้เท่านั้น** (ควรสำรองผ่านหน้า "หลักสูตร · สำรองข้อมูล") — เหมาะกับการพกพา/GitHub Pages แต่ไม่มี database

## การทำงานของข้อมูล (sync แบบ offline-first)

- เว็บแอปเป็น static SPA — เมื่อเสิร์ฟผ่าน backend จะตรวจ `/api/health` แล้วเข้า **โหมดเซิร์ฟเวอร์**: ข้อมูล `cm90.*` ทั้งหมดถูกดันขึ้น SQLite อัตโนมัติ (debounce ~1.2 วิ) และดึงกลับตอนเปิดหน้าใหม่ เปิดจากเครื่องอื่นผ่าน URL เดียวกันก็เห็นข้อมูลชุดเดียวกัน
- เปิดจากไฟล์ตรง ๆ หรือเซิร์ฟเวอร์ไม่ตอบ → กลับเป็นโหมด localStorage เดิมทันที (ไม่พัง ไม่เสียข้อมูล)
- conflict (แก้จากสองเครื่อง): server เป็นของจริงด้วย version check — client ที่ stale จะโดน 409 แล้วโหลดเวอร์ชันล่าสุด; **ข้อมูลชุดเดิมของเครื่องนั้นถูกเก็บสำรองอัตโนมัติ** ไว้ที่ key `cm90.conflictBackup.<timestamp>` ใน localStorage ก่อนถูกแทนที่เสมอ (กู้คืนได้จากหน้า "นำเข้าไฟล์สำรอง" หลัง export ออกมา)
- ข้อจำกัด: การ flush ตอนปิดแท็บใช้ `sendBeacon` — บน browser เก่าบางตัวอาจโดนดรอปเงียบ ๆ (ข้อมูลยังอยู่ใน localStorage และจะถูก push ตอนเปิดครั้งถัดไป จึงไม่หาย)
- **หมายเหตุความปลอดภัย (อ่านก่อนใช้จริง):**
  - ระบบตั้งใจ **ไม่มี login** — ข้อมูลผูกกับ learner id (UUID 122-bit) ที่เก็บในเบราว์เซอร์ ใครรู้ id ของใคร จะ export/แก้ไข/**ลบ** ข้อมูลของบัญชีนั้นได้ทั้งหมด และ id จะตกค้างใน access log — อย่าส่ง learner id/ลิงก์รีวิวให้คนที่ไม่ไว้ใจ (หน้ารีวิวมีคำเตือนนี้แสดงให้ผู้ใช้ด้วย)
  - โดยปริยายเสิร์ฟ **HTTP ไม่มี TLS** — บน LAN ใครที่ดัก traffic ได้ (ARP spoofing ฯลฯ) จะเห็นข้อมูลและ learner id ขณะใช้งาน ถ้าข้อมูลอ่อนไหว ให้วางหลัง reverse proxy ที่มี TLS หรือจำกัดด้วย firewall/ACL
  - ไม่มี quota/rate limit — ใครในเครือข่ายจะเขียนข้อมูลขยะด้วย id สุ่มได้เรื่อย ๆ จนกินดิสก์; เหมาะกับการใช้ส่วนตัวหรือกลุ่มเล็กใน LAN ที่เชื่อถือได้ **อย่าเปิดสู่อินเทอร์เน็ตสาธารณะ**
  - สำรอง `./data/` เป็นระยะ (ไฟล์เดียว: `cm90.db` พร้อม -wal/-shm — สำรองตอน container หยุดทำงานจะสะอาดที่สุด) หรือใช้ปุ่มดาวน์โหลดสำรองจากเซิร์ฟเวอร์ในหน้าเว็บ

## ส่วนขยายที่เพิ่มตามคำแนะนำของเอกสารรีวิว

| ส่วน | ที่มา |
|---|---|
| โมดูล "อ่านระหว่างบรรทัด" (Incentive Audit · Framing/Omission · Power–Interest Map · กันสุดโต่ง) + ควิซจับ 6 เทคนิคชักจูง | หัวข้อ 5.1 + 5.2(3) |
| เคสเวอร์ชันกลาง (ข้ามสายงาน) คู่ทุกสัปดาห์ — ปุ่ม "ดูเวอร์ชันกลาง" ใต้เคสพยาบาล | หัวข้อ 6 |
| ส่วน "เจาะลึกทฤษฎี + ตัวอย่างเหตุการณ์จริง" ท้ายทุกบท (Mars Orbiter, Wald, Challenger, Deming, Shell 1973 ฯลฯ) | หัวข้อ 7 |
| Spaced retrieval quiz ท้ายสัปดาห์ (ย้อน framework สัปดาห์ก่อน) | หัวข้อ 5.2(4) |
| Rubric ประเมิน 10 → **12 หัว (/60)** — เพิ่ม Stakeholder & interest analysis + Framing & omission detection | หัวข้อ 5.2(2) |
| T10 Red Team card เพิ่ม 2 คำถาม + เทมเพลตใหม่ T13–T14 | หัวข้อ 5.2(1) + 5.1 |
| **External review**: ส่งลิงก์ให้เพื่อน/หัวหน้าวิเคราะห์เคสเดียวกัน (`/review.html`) แล้วเห็นคะแนนเทียบกันบนหน้าประเมิน (ทำงานในโหมดเซิร์ฟเวอร์) | หัวข้อ 2/5.2 |
| **บทเสริม 3 บท** (ไม่กินเวลาในตาราง 90 วัน): บทที่ 0 Hidden Agenda (Agency Theory · Grice · Berne TA · Argyris · Aristotle · Frankfurt + audit 4 ชุด) · บทที่ 14 การจับใจความ (Ladder of Inference · Active Listening · HURIER · Closed-loop/SBAR · Toulmin · SBI) · บทที่ 15 สื่อสารถูกที่ถูกเวลา (Media Richness · PMBOK comms matrix · grapevine · Kotter · Psychological Safety) — ทุกบทมี quiz + แบบฝึกหัดบันทึกได้ | คำขอเพิ่มเนื้อหา (หลักการที่ได้รับการยอมรับทั้งหมด) |

## API สรุป (ตัวอย่าง)

```
GET    /api/health                     สถานะ server + database
GET    /api/state?learner=<id>          โหลดสถานะของผู้เรียน (404 ถ้ายังไม่มี)
PUT    /api/state   {data, baseVersion} บันทึกสถานะ (409 ถ้า version ไม่ตรง — conflict)
POST   /api/state                       เหมือน PUT (สำหรับ sendBeacon)
DELETE /api/state?learner=<id>          ล้างข้อมูลผู้เรียน
POST   /api/reviews                     บันทึกความเห็นภายนอก (learnerId, checkpoint, reviewer, scores, notes)
GET    /api/reviews?learner=<id>        รายการความเห็นภายนอก
GET    /api/export?learner=<id>         ดาวน์โหลดสำรองทั้งหมด (state + reviews) เป็น JSON
```

## สรุปผลรีวิว (อ่านฉบับเต็มใน REVIEW-AND-RECOMMENDATIONS.md)

1. โปรแกรมฝึก critical thinking **ได้ผลจริง** ตามหลักฐาน meta-analysis (Abrami et al. 2008/2015) — โครง "ปัญหาจริง + ฝึกทุกวัน + วัดผล + reflection" เข้าเงื่อนไขที่งานวิจัยบอกว่าได้ผลเกือบครบ
2. **จุดอ่อนที่สุด**: การประเมินแบบให้คะแนนตัวเอง — จึงเพิ่ม external feedback ด้วยหน้า `/review.html` (ฟีเจอร์ "ขอความเห็นจากภายนอก")
3. **ช่องว่างที่เติมแล้ว**: การอ่านบริบท/ผลประโยชน์/สิ่งที่ไม่ถูกพูดตรง ๆ — โมดูล "อ่านระหว่างบรรทัด" (ห้ามฝึกเป็น "อ่านใจ/จับคนโกหก")
4. **ครอบคลุมงานอื่น**: เพิ่มเคสกลางคู่ทีละบท (เพิ่ม ไม่ตัด) — ปุ่ม "ดูเวอร์ชันกลาง" ใต้เคสพยาบาลทุกสัปดาห์

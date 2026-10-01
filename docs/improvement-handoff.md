# Improvement Handoff — Critical Management 90

> สรุปสถานะการปรับปรุงทั้งหมด + งานที่รอ implement + กติกาสำหรับผู้ทำต่อ (คนหรือ agent)
> วันที่: 1 ตุลาคม 2026

---

## 1. รีโปนี้คืออะไร

โปรแกรมฝึกคิด 90 วัน (Critical Thinking → Decision-Making → Systems & Management Thinking) สำหรับ senior nurse manager ประกอบด้วยเอกสารหลัก + เว็บแอป static (ไม่ต้อง build, เนื้อหาเป็นข้อมูลล้วนใน JS, ข้อมูลผู้เรียนอยู่ใน localStorage)

- Remote: `https://github.com/lazymarcus005-maker/critical-thinking.git` (branch `main`)
- เอกสารรีวิวหลัก (ที่มาของทุกข้อแนะนำ): [REVIEW-AND-RECOMMENDATIONS.md](REVIEW-AND-RECOMMENDATIONS.md)

## 2. ประวัติการปรับปรุง (เรียงตามลำดับ commit)

| Commit | สิ่งที่ทำ |
|---|---|
| `ec518f9` | Push ครั้งแรก: โปรแกรม md + เว็บแอป + README + เอกสารรีวิววิชาการ (ผังเทียบ 13 สัปดาห์ ↔ งานวิจัย, คำตอบ "ฝึกได้จริงไหม", ช่องว่าง hidden agenda) |
| `bee0819` | ย้ายเอกสาร markdown เข้า `docs/` (README คงที่ราก) |
| `067e1f2` | **หัวข้อ 6** ในเอกสารรีวิว: แพ็กเคส/แบบฝึกเวอร์ชันกลาง (ข้ามสายงาน) เพิ่มคู่เคสพยาบาลทีละบท W1–W13 — เพิ่ม ไม่ตัด + ตารางแปลงคำศัพท์ |
| (ล่าสุด) | **หัวข้อ 7** ในเอกสารรีวิว: เจาะลึกทฤษฎี + แผนภาพ ASCII + ตัวอย่างเหตุการณ์จริงลึกทีละบท (13 ตัวอย่าง: Mars Orbiter, นายหน้าอสังหาฯ, Wald's bombers, นักพยากรณ์อากาศ, หนูฮานอย, เครื่องจักรของโอโนะ, Challenger, ลูกปัดแดงของ Deming, framing ใน NEJM, Bay of Pigs→คิวบา, Shell 1973, Amazon memo, Franklin) + ไฟล์ handoff นี้ |

## 3. สรุปผลรีวิว (อ่านฉบับเต็มในเอกสารรีวิว)

1. โปรแกรมฝึกได้จริง — โครงตรงกับเงื่อนไขที่ meta-analysis (Abrami et al. 2008/2015) บอกว่าได้ผล
2. จุดอ่อน: ประเมินด้วยการให้คะแนนตัวเอง — ต้องเพิ่ม external feedback
3. ช่องว่าง: การอ่านผลประโยชน์/framing/สิ่งที่ไม่ถูกพูด (ฝึกได้ตามงานวิจัย ห้ามฝึกเป็น "อ่านใจ/จับโกหก")
4. เรื่องครอบคลุมงานอื่น: หลักการกลางทุกบท แต่เคสเฉพาะพยาบาล — ทางแก้คือแพ็กเคสกลางแบบ "เพิ่ม ไม่ตัด"

## 4. งานที่รอ implement (เรียงตามลำดับที่แนะนำ)

| # | งาน | ต้นทาง (ในเอกสารรีวิว) | หมายเหตุเทคนิค |
|---|---|---|---|
| 1 | โมดูล "อ่านระหว่างบรรทัด": Incentive Audit, Framing/Language Audit, Conspicuous Omission, Power–Interest Map, กันสุดโต่ง | หัวข้อ 5.1 | เทมเพลตใหม่ T13–T14 + เพิ่ม 2 คำถามใน T10 + rubric 10→12 หัว (เพิ่ม *Stakeholder & interest analysis*, *Framing & omission detection*) |
| 2 | นำเคสกลาง (W1–W13) ลงเว็บ | หัวข้อ 6 | ทำ `content-neutral.js` หรือปุ่ม "ดูเวอร์ชันกลาง" ใต้เคสเดิม — ไม่ต้องแก้ engine |
| 3 | นำทฤษฎีเชิงลึก + diagram + ตัวอย่างลึก (หัวข้อ 7) ลงหน้าสัปดาห์แต่ละสัปดาห์ | หัวข้อ 7 | เป็นส่วน "เจาะลึก" ที่ผู้เรียนเลือกอ่านได้ (ไม่บังคับ) |
| 4 | External feedback สำหรับ rubric A1–A4 | หัวข้อ 2/5.2 | ให้เพื่อน/หัวหน้า/ที่ปรึกษาตรวจเคสเดียวกัน หรือทำโหมดเทียบคำตอบ |
| 5 | Spaced retrieval quiz ท้ายสัปดาห์ (ย้อน framework สัปดาห์ก่อน 5 ข้อ) | หัวข้อ 2 | testing effect (Roediger & Karpicke 2006) |
| 6 | เติม Sources งานวิจัยต้นทางใน `90-day-critical-management-program.md` | หัวข้อ 5.3 + หัวข้อ 1 | รายชื่ออยู่ในตารางผังเทียบของเอกสารรีวิวแล้ว |
| 7 | เปิด GitHub Pages (branch `main` + โฟลเดอร์ `/90day-site`) | — | ทำให้เว็บใช้งานได้จากลิงก์ตรง ๆ |
| 8 | (ออปชัน) แพ็กเคสรายอุตสาหกรรม | หัวข้อ 6.2 | ใช้ตารางแปลงคำศัพท์สร้างแพ็ก IT/ผลิต/ค้าปลีกต่อได้ |

## 5. กติกาการแก้ไขต่อ (สำคัญสำหรับ agent/คนถัดไป)

- **ห้ามแก้ engine** (`core.js`, `pages.js`) เมื่อเพิ่มเนื้อหา — เนื้อหาทั้งหมดเป็นข้อมูลล้วนใน `content-1/2/3.js` ตามรูปแบบ `WEEKS.push({ n, phase, title, dates, startDay, endDay, goal, html(), case, ex(), days[], outputs[] })`
- helper ที่ใช้ได้ (ประกาศใน `core.js`): `H2, H3, P, TBL, UL, OL, CALL, NOTE, EX, FIELD, QUIZ, MATRIX, PRE` (pre/tpl block ใช้ `<pre class="tpl">`)
- **ห้ามเปลี่ยน id เก่าของ `FIELD`/`QUIZ`** — ข้อมูลผู้เรียนผูกกับ id ใน localStorage เปลี่ยน id = ข้อมูลหาย
- ภาษาเนื้อหา: ไทย + ศัพท์อังกฤษเท่าที่จำเป็น · เคสจริงของผู้เรียนเป็นลำดับ 1 เสมอ เคสใด ๆ เป็นเพียงตัวเลือกสำรอง
- หลักการที่โปรแกรมยึดและไม่ควรฝ่าฝืน: เคสจริง > เคสกลาง > เคสเฉพาะทาง · เพิ่มดีกว่าตัดเมื่อไม่แน่ใจ · ห้ามสอน "อ่านน้ำมือ/จับคนโกหก"
- Git: identity ตั้ง local ใน repo แล้ว (`lazymarcus005-maker` + noreply email) — push ตรงได้เลย

## 6. การตรวจสอบย้อนหลัง

- ทุกข้อแนะนำมีที่มาวิชาการอยู่ในหัวข้อ 1 และ 7 ของเอกสารรีวิว
- ตัวอย่างเหตุการณ์จริงทั้ง 13 เคสตรวจสอบได้: Northcraft & Neale (1987), Wald/Statistical Research Group (1943), Tetlock (2005), Vann (2003 — หนูฮานอย), Ohno (1988), Rogers Commission (1986), Deming (1986), McNeil et al. (1982, NEJM), Janis (1972), Wack (1985), Bezos shareholder letter (2018), Franklin (Autobiography)

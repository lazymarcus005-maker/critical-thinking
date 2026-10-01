# Critical Management 90 — โปรแกรมฝึกคิด 90 วัน

โปรแกรมฝึก **Critical Thinking → Decision-Making → Systems & Management Thinking** สำหรับ Senior Nurse Manager
(90 วัน · วันละ 30–60 นาที · ~40% Learn / 60% Apply · ประเมิน Day 1/30/60/90)

## ไฟล์ในรีโป

| ไฟล์/โฟลเดอร์ | คืออะไร |
|---|---|
| [90day-site/](90day-site/) | เว็บแอปตัวโปรแกรม (HTML/CSS/JS ล้วน ไม่ต้อง build — เปิดจากไฟล์ตรง ๆ ได้) |
| [docs/90-day-critical-management-program.md](docs/90-day-critical-management-program.md) | ตัวโปรแกรมฉบับเต็ม: 13 สัปดาห์ · เทมเพลต T1–T12 · เคสฝึก W1–W13 · แบบประเมิน A1–A4 พร้อม rubric · แผน course/budget · แผนกันพัง |
| [docs/REVIEW-AND-RECOMMENDATIONS.md](docs/REVIEW-AND-RECOMMENDATIONS.md) | รีวิวเนื้อหา + จุดอ้างอิงหลักวิชาการทั้ง 13 สัปดาห์ + คำแนะนำการเติมเนื้อหาส่วนที่ขาด (hidden agenda / framing / stakeholder analysis) + เคสกลางคู่ทีละบท (หัวข้อ 6) + ทฤษฎีเชิงลึก/diagram/ตัวอย่างเหตุการณ์จริง (หัวข้อ 7) |
| [docs/improvement-handoff.md](docs/improvement-handoff.md) | สรุปการปรับปรุงทั้งหมด + งานที่รอ implement + กติกาการแก้ไขต่อ (handoff สำหรับคน/agent ถัดไป) |

## เปิดเว็บแอปใช้งาน

```bash
# วิธีที่ 1 — เปิดไฟล์ตรง ๆ
open 90day-site/index.html

# วิธีที่ 2 — รัน local server
cd 90day-site && python3 -m http.server 8080
# แล้วเปิด http://localhost:8080
```

- ความคืบหน้า / journal / decision ทั้งหมดบันทึกใน **localStorage ของเบราว์เซอร์เครื่องนี้เท่านั้น** (ควรสำรองผ่านหน้า "แหล่งเรียนรู้ → สำรอง/กู้คืน" เป็นระยะ)
- มีหน้า: Roadmap 13 สัปดาห์ · เนื้อหา+แบบฝึกหัด interactive · Thinking Journal · Decision Journal · แบบประเมิน (rubric) · เทมเพลต

## สรุปผลรีวิว (อ่านฉบับเต็มใน REVIEW-AND-RECOMMENDATIONS.md)

1. โปรแกรมฝึก critical thinking **ได้ผลจริง** ตามหลักฐาน meta-analysis (Abrami et al. 2008/2015) — โครง "ปัญหาจริง + ฝึกทุกวัน + วัดผล + reflection" เข้าเงื่อนไขที่งานวิจัยบอกว่าได้ผลเกือบครบ
2. **จุดอ่อนที่สุด**: การประเมินแบบให้คะแนนตัวเอง — ควรเพิ่ม external feedback (deliberate practice ต้องมี feedback จากภายนอก)
3. **ช่องว่างที่ควรเติม**: การอ่านบริบท/ผลประโยชน์/สิ่งที่ไม่ถูกพูดตรง ๆ ของผู้อื่น (implicature, framing, interest analysis) — ฝึกได้จริงด้วย checklist + drill ตามงานวิจัย แต่**ห้าม**ฝึกเป็น "อ่านใจ/จับคนโกหก" ซึ่งไม่มีหลักฐานรองรับ
4. **ครอบคลุมงานอื่นไหม**: หลักการเป็นกลางทุกบท แต่ตัวอย่าง/เคสเฉพาะพยาบาล — จึงเพิ่ม **เคส/แบบฝึกเวอร์ชันกลาง (ข้ามสายงาน) คู่กันทีละบท** ในหัวข้อ 6 ของเอกสารรีวิว (เพิ่ม ไม่ตัด)

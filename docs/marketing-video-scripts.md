# Marketing video scripts

Two short videos to record and upload. Until you do, the homepage shows
a tasteful "click to play" placeholder card; the moment you drop the
file in `/public/demo/` (or wire `NEXT_PUBLIC_DEMO_VIDEO_URL` /
`NEXT_PUBLIC_TESTIMONIAL_VIDEO_URL`), the section auto-upgrades to the
real player.

Both scripts are self-paced — read at a normal conversational tempo,
60 seconds and 30 seconds respectively. Don't speed up; the rhythm
matters more than fitting the time.

---

## 1. 60-second product demo (homepage)

**File path target:** `/public/demo/odudoc-ai-emr-demo.mp4`
**Or env var:** `NEXT_PUBLIC_DEMO_VIDEO_URL` (YouTube/Vimeo embed URL)

### Setup before you record
- Pick a real but fictional patient on `/dashboard/doctor/emr/patients/[id]`.
  Make sure the chart has 2-3 prior visits + at least one allergy noted.
- Have the visit form scrolled into view.
- Use a quiet room. Wear a stethoscope on camera if possible — the visual cue matters.
- Use OBS or QuickTime → record the screen at 1920×1080 minimum.
- Record voiceover separately if you can — the screen capture audio is rarely clean enough.

### Script (60 seconds)

> **[0:00 – Patient summary]**
> "When I open a patient chart, the AI gives me a 30-second briefing.
> Active conditions, what's changed since last visit, red flags I should
> watch for. Every claim is cited to a specific visit, so I can verify
> in two clicks if I want."
> *(scroll the AI summary card into focus — let viewers read the chips)*
>
> **[0:12 – Start scribe]**
> "Now I start the consultation. I click 'Ambient note', confirm the
> patient consents, and start recording."
> *(click button → consent modal → start)*
>
> **[0:24 – Audio plays under voiceover]**
> "The patient describes their symptoms in Hindi mixed with English —
> exactly how Indian consultations actually sound. I focus on the
> patient. The scribe captures everything in the background."
> *(let 5-8 seconds of real consult audio play; can be a paid voice
> actor if you don't have a willing patient)*
>
> **[0:42 – Stop and auto-fill]**
> "Done. I click stop. SOAP fields auto-fill from the transcript —
> chief complaint, subjective, objective, assessment, plan. Vitals
> too if they were mentioned out loud."
> *(show the fields populating — this is the money shot, hold on it)*
>
> **[0:50 – ICD-10 + drug check + save]**
> "ICD-10 code suggested. The drug-interaction checker has already
> run in the background — clean. I review for ten seconds, then save.
> Total time: under a minute."
> *(click 'Suggest ICD-10' → accept → save)*
>
> **[0:58 – Tagline]**
> "OduDoc. The AI EMR that does your paperwork for you."
> *(homepage logo or CTA card)*

### Production notes
- The five chapter markers in the homepage section (0:00, 0:12, 0:24,
  0:42, 0:50) are pinned to these moments. If your edit shifts timing,
  update `HIGHLIGHTS` in `components/home/DemoVideoSection.tsx`.
- Pick a poster frame at 0:42 (the SOAP fields filling in). Save as
  `/public/demo/odudoc-ai-emr-poster.jpg`.
- Keep the doctor's face on camera at the start and end (intro + outro).
  The middle is screen-capture only.
- Subtitles are mandatory — most viewers watch muted on mobile. Use the
  voiceover script verbatim as the .srt file.

---

## 2. 30-second doctor testimonial

**File path target:** `/public/testimonials/dr-testimonial.mp4`
**Or env var:** `NEXT_PUBLIC_TESTIMONIAL_VIDEO_URL`

### Recruiting the doctor
- Wait until you have at least one paying doctor who has used the
  ambient scribe in real clinic for 2+ weeks. Three weeks is better.
- Offer them: a month of Practice tier free + a name credit on the
  homepage. Don't pay for testimonials — it shows.
- Brief them in advance with the prompt below; let them improvise the
  exact phrasing. Authentic > polished.

### Briefing for the doctor (send by email)

> Thanks for agreeing to record a quick testimonial. We're keeping it
> under 30 seconds — about 75-90 words.
>
> Cover three things in your own words:
>
> 1. **Specific time saving** — "Before OduDoc I spent X hours a day
>    on notes. Now it's Y minutes." Pick the number that's true for you.
>
> 2. **One concrete moment** the AI helped — "Last Tuesday a 60-year-old
>    came in with chest pain, the AI flagged a drug interaction I'd
>    have caught eventually but maybe ten minutes later" or similar.
>
> 3. **A line about your patients** — "My patients notice I'm actually
>    looking at them now instead of typing."
>
> Don't read from a script. Look at the camera, talk like you're
> telling a colleague over coffee. We'll record 3-4 takes and pick
> the best one.

### Production notes
- Vertical (9:16) crops to square (1:1) cleanly for LinkedIn / Instagram;
  record landscape (16:9) for the website embed and we'll re-cut.
- Lower-third overlay on the video: doctor name, specialty, clinic
  name + city ("Dr. Anita Sharma · Cardiology · Apollo Hyderabad").
- End frame: 1 second of the OduDoc logo + URL.
- The placeholder quote in `components/marketing/DoctorTestimonialVideo.tsx`
  ("The AI scribe gave me my evenings back") is the working draft of
  the headline. Once you have the real testimonial, swap that string
  with their actual hook line.

---

## When to record each

- **60-second demo:** record this week. You don't need a real patient
  — use a colleague or paid voice actor for the "consultation audio"
  segment. Ship it as soon as it exists; a rough demo beats no demo by
  10x.

- **30-second testimonial:** wait. Don't record one until a real
  doctor has been using the scribe daily for at least two weeks. A
  fake or staged testimonial is worse than no testimonial — sophisticated
  buyers can smell it instantly. Until then the placeholder card
  reads honestly: "We're running pilot deployments; real testimonials
  land here once they're recorded."

---

## Distribution checklist (after recording)

For each video:
- [ ] Upload to a CDN you control (Vercel Blob, Cloudflare R2, or just `/public/`)
- [ ] Generate WebM + MP4 versions for browser fallback
- [ ] Record `.srt` subtitles in English + at least Hindi
- [ ] Cut a 15-second LinkedIn/Twitter teaser version
- [ ] Update `components/home/DemoVideoSection.tsx` if you change file
      paths or add the embed URL env var
- [ ] Cross-post to YouTube (with timestamps), LinkedIn (native upload),
      and Twitter (native upload — never link to YouTube on Twitter)

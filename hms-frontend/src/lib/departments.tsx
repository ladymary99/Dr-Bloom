"use client";

/* Shared department data — used by the navbar dropdown, the mobile menu and the
   department pages. Save as: lib/departments.tsx */

import { useEffect, useState } from "react";
import { api as client } from "@/lib/api";

export type Dept = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  services?: string[];
  open24?: boolean;
  nurses?: number;     // number of nurses (from the API if it has it)
  photos?: string[];   // department photos (from the API if it has them)
  location?: string;   // where to find it in the hospital
  hours?: string;      // opening hours
  phone?: string;      // department phone
  conditions?: string[]; // common conditions treated
  tip?: string;        // "before your visit" tip
  during?: string;     // what happens during the visit
  after?: string;      // what happens after the visit
  urgent?: string;     // when to get urgent help
};

export const defaultServices = ["Consultations", "Diagnostics", "Follow-up care"];

export const norm = (s: string) => s.toLowerCase().trim();

/* "ENT (Ear, Nose & Throat)" -> "ent-ear-nose-and-throat" */
export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const fallbackDepts: Dept[] = [
  { id: 1, name: "Cardiology", code: "CAR", services: ["ECG & Echo", "Stress tests", "Heart clinic"], description: "Comprehensive heart and cardiovascular care — from routine ECGs and stress tests to long-term management of blood pressure, cholesterol and heart disease." },
  { id: 2, name: "Neurology", code: "NEU", services: ["Migraine care", "Epilepsy", "Stroke recovery"], description: "Expert diagnosis and treatment of neurological conditions, including migraines, epilepsy, stroke recovery and disorders of the brain, spine and nervous system." },
  { id: 3, name: "Pediatrics", code: "PED", services: ["Newborn care", "Vaccination", "Growth checks"], description: "Specialized healthcare for children and adolescents — newborn checks, vaccinations, growth tracking and treatment of childhood illnesses in a child-friendly setting." },
  { id: 4, name: "Orthopedics", code: "ORT", services: ["Fractures", "Joint care", "Sports injuries"], description: "Bone, joint, muscle and movement care — fracture treatment, arthritis management, sports injuries and post-surgery rehabilitation with modern physiotherapy." },
  { id: 5, name: "Emergency Medicine", code: "EMR", open24: true, services: ["Rapid triage", "Trauma care", "Resuscitation"], description: "24/7 urgent and emergency medical care with rapid triage, resuscitation, trauma response and a coordinated team ready around the clock, every day of the year." },
  { id: 6, name: "Radiology & Imaging", code: "RAD", services: ["X-ray", "Ultrasound", "CT scan"], description: "Advanced diagnostic imaging and medical scans — X-ray, ultrasound and CT, read by specialist radiologists with results delivered to your portal the same day." },
  { id: 7, name: "Internal Medicine", code: "INT", services: ["Adult checkups", "Chronic illness", "Second opinions"], description: "Whole-adult care for diagnosis and long-term management of conditions like hypertension, infections and chronic disease, coordinating other specialists when needed." },
  { id: 8, name: "General Surgery", code: "SUR", services: ["Day surgery", "Minimally invasive", "Pre & post-op care"], description: "Safe, modern surgical care — from day-case procedures to complex operations — with a full pre-operative assessment and a clear recovery plan after surgery." },
  { id: 9, name: "Obstetrics & Gynecology", code: "OBG", services: ["Antenatal care", "Delivery", "Women's health"], description: "Complete care for women at every stage — antenatal checks, safe delivery, postnatal support, family planning and treatment of gynecological conditions." },
  { id: 10, name: "Oncology", code: "ONC", services: ["Cancer screening", "Chemotherapy", "Support care"], description: "Compassionate cancer care from early screening and diagnosis to chemotherapy, treatment planning and supportive care, guided by a multidisciplinary team." },
  { id: 11, name: "Intensive Care (ICU)", code: "ICU", open24: true, services: ["Life support", "24/7 monitoring", "Critical care"], description: "Round-the-clock care for critically ill patients with advanced monitoring, life support and a dedicated team of intensive care specialists and nurses." },
  { id: 12, name: "Laboratory & Pathology", code: "LAB", services: ["Blood tests", "Same-day results", "Pathology"], description: "Accurate laboratory testing on modern analyzers — blood work, urine tests and pathology — with verified results sent straight to your patient portal." },
  { id: 13, name: "Gastroenterology", code: "GAS", services: ["Endoscopy", "Liver care", "Digestive health"], description: "Diagnosis and treatment of stomach, bowel and liver conditions, including endoscopy, acid reflux, gastritis, hepatitis and other digestive disorders." },
  { id: 14, name: "Pulmonology", code: "PUL", services: ["Asthma care", "Lung function tests", "Sleep apnea"], description: "Care for lung and breathing conditions such as asthma, COPD, chronic cough and infections, with lung function testing and ongoing treatment plans." },
  { id: 15, name: "Nephrology & Dialysis", code: "NEP", services: ["Kidney care", "Dialysis", "Transplant follow-up"], description: "Specialist kidney care — from early detection and treatment of kidney disease to dialysis sessions and follow-up after transplant." },
  { id: 16, name: "Urology", code: "URO", services: ["Kidney stones", "Prostate care", "Urinary health"], description: "Treatment of urinary tract and male reproductive conditions, including kidney stones, infections, prostate problems and minimally invasive procedures." },
  { id: 17, name: "Endocrinology & Diabetes", code: "END", services: ["Diabetes care", "Thyroid", "Hormone disorders"], description: "Management of diabetes, thyroid and hormone disorders with regular monitoring, nutrition guidance and personalized long-term treatment plans." },
  { id: 18, name: "Dermatology", code: "DER", services: ["Skin conditions", "Allergy care", "Skin checks"], description: "Care for skin, hair and nail conditions — acne, eczema, infections, allergies and skin checks — for children and adults." },
  { id: 19, name: "ENT (Ear, Nose & Throat)", code: "ENT", services: ["Hearing tests", "Sinus care", "Throat care"], description: "Diagnosis and treatment of ear, nose and throat problems, including hearing loss, sinus infections, tonsil issues and voice disorders." },
  { id: 20, name: "Ophthalmology", code: "OPH", services: ["Eye exams", "Cataract care", "Vision tests"], description: "Complete eye care — vision testing, eye exams, cataract assessment, glaucoma screening and treatment of eye infections and injuries." },
  { id: 21, name: "Psychiatry & Mental Health", code: "PSY", services: ["Counseling", "Therapy", "Medication review"], description: "Confidential support for anxiety, depression, stress and other mental health needs, with counseling, therapy and carefully monitored treatment." },
  { id: 22, name: "Dental Care", code: "DEN", services: ["Checkups", "Fillings", "Oral surgery"], description: "General and specialist dental care for the whole family — checkups, cleaning, fillings, extractions and treatment of gum disease." },
  { id: 23, name: "Physiotherapy & Rehabilitation", code: "PHY", services: ["Post-surgery rehab", "Pain relief", "Mobility training"], description: "Guided recovery after injury, surgery or illness with physiotherapy, pain management and exercise programs to restore movement and strength." },
  { id: 24, name: "Pharmacy", code: "PHR", services: ["Prescriptions", "Medication advice", "In-house dispensing"], description: "On-site pharmacy for prescriptions sent from your doctor through the portal, with medication advice from qualified pharmacists." },
];

/* One short line per service, shown on the service cards. Matched by service name. */
const serviceInfo: Record<string, string> = {
  "ECG & Echo": "Heart rhythm and ultrasound scans to check how your heart works.",
  "Stress tests": "Monitoring your heart during exercise to spot hidden problems.",
  "Heart clinic": "Ongoing care for blood pressure, cholesterol and heart disease.",
  "Migraine care": "Finding triggers and treating frequent or severe headaches.",
  "Epilepsy": "Diagnosis, medication and long-term seizure management.",
  "Stroke recovery": "Rehabilitation to regain movement, speech and independence.",
  "Newborn care": "Gentle checks and support for babies in their first weeks.",
  "Vaccination": "Routine childhood vaccines, kept on schedule.",
  "Growth checks": "Tracking height, weight and development at every age.",
  "Fractures": "Setting and healing broken bones, from casts to surgery.",
  "Joint care": "Relief for arthritis, joint pain and stiffness.",
  "Sports injuries": "Treatment and recovery plans to get you back in action.",
  "Rapid triage": "Fast assessment so the most urgent cases are seen first.",
  "Trauma care": "Immediate treatment for serious injuries and accidents.",
  "Resuscitation": "Life-saving care for patients in cardiac or respiratory arrest.",
  "X-ray": "Quick, clear images of bones, chest and more.",
  "Ultrasound": "Safe, radiation-free scans of organs and pregnancy.",
  "CT scan": "Detailed 3D images for accurate diagnosis.",
  "Adult checkups": "Regular health reviews to catch problems early.",
  "Chronic illness": "Long-term care for conditions like hypertension and diabetes.",
  "Second opinions": "An independent review of your diagnosis and treatment plan.",
  "Day surgery": "Planned procedures with no overnight stay.",
  "Minimally invasive": "Small incisions for less pain and faster recovery.",
  "Pre & post-op care": "Assessment before surgery and clear recovery support after.",
  "Antenatal care": "Regular checks to keep mother and baby healthy.",
  "Delivery": "Safe, supported birth with an experienced team.",
  "Women's health": "Screening, family planning and gynecological care.",
  "Cancer screening": "Early detection tests, when treatment works best.",
  "Chemotherapy": "Personalized drug treatment, given with close monitoring.",
  "Support care": "Comfort, nutrition and emotional support during treatment.",
  "Life support": "Machines and expert care for patients who can't breathe alone.",
  "24/7 monitoring": "Constant observation of vital signs, day and night.",
  "Critical care": "Intensive treatment for the most seriously ill patients.",
  "Blood tests": "Accurate results from a simple blood sample.",
  "Same-day results": "Most test results ready and verified within hours.",
  "Pathology": "Expert analysis of tissue samples to confirm a diagnosis.",
  "Endoscopy": "A camera exam to look inside the stomach and bowel.",
  "Liver care": "Testing and treatment for hepatitis and liver disease.",
  "Digestive health": "Help with reflux, bloating, ulcers and bowel problems.",
  "Asthma care": "Plans and inhalers to keep breathing easy.",
  "Lung function tests": "Simple breathing tests that measure how well lungs work.",
  "Sleep apnea": "Diagnosis and treatment for breathing pauses during sleep.",
  "Kidney care": "Early detection and treatment of kidney disease.",
  "Dialysis": "Safe, comfortable sessions when kidneys need support.",
  "Transplant follow-up": "Regular checks and medication after a kidney transplant.",
  "Kidney stones": "Pain relief and removal of stones, with prevention advice.",
  "Prostate care": "Screening and treatment for prostate conditions.",
  "Urinary health": "Treatment of infections, leaks and bladder problems.",
  "Diabetes care": "Monitoring, medication and diet guidance for blood sugar.",
  "Thyroid": "Testing and treatment for an overactive or underactive thyroid.",
  "Hormone disorders": "Balancing hormones that affect energy, weight and growth.",
  "Skin conditions": "Care for acne, eczema, rashes and infections.",
  "Allergy care": "Finding triggers and managing allergic reactions.",
  "Skin checks": "Looking over moles and marks for early warning signs.",
  "Hearing tests": "Quick tests to measure how well you hear.",
  "Sinus care": "Relief from blocked, painful or infected sinuses.",
  "Throat care": "Treatment for sore throats, tonsils and voice problems.",
  "Eye exams": "Full vision and eye-health checks.",
  "Cataract care": "Assessment and treatment for clouded vision.",
  "Vision tests": "Accurate prescriptions for glasses and contact lenses.",
  "Counseling": "A confidential space to talk through stress and worries.",
  "Therapy": "Structured sessions for anxiety, depression and more.",
  "Medication review": "Careful monitoring so treatment stays safe and effective.",
  "Checkups": "Regular dental exams and cleaning for healthy teeth.",
  "Fillings": "Repairing cavities to protect your teeth.",
  "Oral surgery": "Extractions and procedures with comfort and care.",
  "Post-surgery rehab": "Guided exercises to rebuild strength after an operation.",
  "Pain relief": "Hands-on and exercise-based treatment for ongoing pain.",
  "Mobility training": "Improving balance, movement and everyday independence.",
  "Prescriptions": "Medicines from your doctor, ready when you are.",
  "Medication advice": "Pharmacists explain how and when to take your medicines.",
  "In-house dispensing": "Collect your prescription right here at the hospital.",
};

/* Short "what's included" options shown as chips on each service card. Matched by service name. */
const serviceOptions: Record<string, string[]> = {
  "ECG & Echo": ["12-lead ECG", "Echocardiogram", "Holter monitor"],
  "Stress tests": ["Treadmill test", "Stress echo", "Heart rate review"],
  "Heart clinic": ["Blood pressure", "Cholesterol", "Medication plan"],
  "Migraine care": ["Trigger review", "Preventive treatment", "Headache diary"],
  "Epilepsy": ["EEG", "Seizure plan", "Medication review"],
  "Stroke recovery": ["Physiotherapy", "Speech therapy", "Daily-living support"],
  "Newborn care": ["First checks", "Feeding advice", "Jaundice screening"],
  "Vaccination": ["Routine schedule", "Travel vaccines", "Catch-up doses"],
  "Growth checks": ["Height & weight", "Development review", "Nutrition advice"],
  "Fractures": ["X-ray", "Casts & splints", "Surgical repair"],
  "Joint care": ["Injections", "Physiotherapy", "Pain management"],
  "Sports injuries": ["Sprains & strains", "Ligament injuries", "Return-to-play plan"],
  "Rapid triage": ["Vitals check", "Priority assessment", "Fast-track care"],
  "Trauma care": ["Wound care", "Fracture care", "Emergency surgery"],
  "Resuscitation": ["Cardiac arrest", "Airway support", "Defibrillation"],
  "X-ray": ["Chest", "Bones & joints", "Spine"],
  "Ultrasound": ["Abdomen", "Pregnancy", "Heart & vessels"],
  "CT scan": ["Head", "Chest", "Abdomen"],
  "Adult checkups": ["Full health review", "Screening tests", "Vaccinations"],
  "Chronic illness": ["Blood pressure", "Diabetes", "Asthma"],
  "Second opinions": ["Report review", "Treatment options", "Specialist input"],
  "Day surgery": ["Hernia repair", "Minor procedures", "Same-day discharge"],
  "Minimally invasive": ["Keyhole surgery", "Less scarring", "Faster recovery"],
  "Pre & post-op care": ["Pre-op tests", "Wound checks", "Recovery plan"],
  "Antenatal care": ["Scans", "Blood tests", "Birth planning"],
  "Delivery": ["Natural birth", "Cesarean", "Postnatal care"],
  "Women's health": ["Screening", "Family planning", "Menopause care"],
  "Cancer screening": ["Breast", "Cervical", "Colon"],
  "Chemotherapy": ["Treatment plan", "Infusion care", "Side-effect support"],
  "Support care": ["Nutrition", "Pain control", "Counseling"],
  "Life support": ["Ventilation", "Circulation support", "Organ support"],
  "24/7 monitoring": ["Heart & oxygen", "Blood pressure", "Nurse at the bedside"],
  "Critical care": ["Severe infection", "Respiratory failure", "Post-surgery care"],
  "Blood tests": ["Full blood count", "Cholesterol", "Blood sugar"],
  "Same-day results": ["Routine panels", "Urgent samples", "Portal delivery"],
  "Pathology": ["Tissue samples", "Biopsy reports", "Cultures"],
  "Endoscopy": ["Gastroscopy", "Colonoscopy", "Biopsies"],
  "Liver care": ["Hepatitis tests", "Fatty liver", "Follow-up"],
  "Digestive health": ["Reflux", "Ulcers", "Bowel problems"],
  "Asthma care": ["Action plan", "Inhaler training", "Allergy review"],
  "Lung function tests": ["Spirometry", "Oxygen levels", "Peak flow"],
  "Sleep apnea": ["Sleep study", "Mask therapy", "Lifestyle advice"],
  "Kidney care": ["Kidney tests", "Diet advice", "Blood pressure"],
  "Dialysis": ["Hemodialysis", "Peritoneal dialysis", "Vascular access"],
  "Transplant follow-up": ["Anti-rejection medicine", "Blood tests", "Regular reviews"],
  "Kidney stones": ["Imaging", "Pain relief", "Stone removal"],
  "Prostate care": ["PSA test", "Examination", "Treatment options"],
  "Urinary health": ["Infections", "Bladder control", "Flow tests"],
  "Diabetes care": ["Blood sugar", "Insulin plans", "Diet guidance"],
  "Thyroid": ["Blood tests", "Ultrasound", "Medication"],
  "Hormone disorders": ["Hormone tests", "Growth issues", "Treatment plan"],
  "Skin conditions": ["Acne", "Eczema", "Infections"],
  "Allergy care": ["Skin tests", "Trigger advice", "Treatment"],
  "Skin checks": ["Mole review", "Early detection", "Follow-up"],
  "Hearing tests": ["Audiometry", "Ear checks", "Hearing aid advice"],
  "Sinus care": ["Infections", "Allergies", "Minor procedures"],
  "Throat care": ["Tonsils", "Voice problems", "Swallowing"],
  "Eye exams": ["Vision test", "Eye pressure", "Retina check"],
  "Cataract care": ["Assessment", "Surgery planning", "Aftercare"],
  "Vision tests": ["Glasses", "Contact lenses", "Children's vision"],
  "Counseling": ["Stress", "Grief", "Relationships"],
  "Therapy": ["Anxiety", "Depression", "Trauma"],
  "Medication review": ["Dose checks", "Side effects", "Regular follow-up"],
  "Checkups": ["Exam", "Cleaning", "X-rays"],
  "Fillings": ["White fillings", "Cavity repair", "Pain relief"],
  "Oral surgery": ["Extractions", "Wisdom teeth", "Gum surgery"],
  "Post-surgery rehab": ["Knee & hip", "Spine", "Shoulder"],
  "Pain relief": ["Manual therapy", "Exercise plans", "Heat & cold"],
  "Mobility training": ["Balance", "Walking", "Strength"],
  "Prescriptions": ["New prescriptions", "Refills", "Portal prescriptions"],
  "Medication advice": ["Dosage", "Interactions", "Side effects"],
  "In-house dispensing": ["Ready on site", "Clearly labeled", "Refill reminders"],
};

export const serviceChips = (service: string): string[] => serviceOptions[service] ?? [];

export const serviceText = (service: string, dept: string) =>
  serviceInfo[service] ?? `Available through our ${dept} team — book a visit to learn more.`;

/* ---------------------------------------------------------------------------
   PLACEHOLDER DATA — replace with your real numbers / photos.
   If your API returns `nurses` and `photos` for a department, those win.
   --------------------------------------------------------------------------- */
const nurseCounts: Record<string, number> = {
  CAR: 14, NEU: 10, PED: 16, ORT: 12, EMR: 28, RAD: 8, INT: 18, SUR: 22,
  OBG: 20, ONC: 15, ICU: 30, LAB: 9, GAS: 8, PUL: 7, NEP: 12, URO: 7,
  END: 6, DER: 5, ENT: 6, OPH: 6, PSY: 8, DEN: 6, PHY: 9, PHR: 4,
};

/* More PLACEHOLDER details — edit freely. Any of these coming from your API win. */
export const HOSPITAL_PHONE = "+93 700 000 000";

const floors: Record<string, string> = {
  EMR: "Main building · Ground floor", RAD: "Main building · Ground floor", LAB: "Main building · Ground floor", PHR: "Main building · Ground floor",
  INT: "Main building · Floor 1", PED: "Main building · Floor 1", DER: "Main building · Floor 1", ENT: "Main building · Floor 1", OPH: "Main building · Floor 1", DEN: "Main building · Floor 1",
  CAR: "Main building · Floor 2", NEU: "Main building · Floor 2", GAS: "Main building · Floor 2", PUL: "Main building · Floor 2", END: "Main building · Floor 2", NEP: "Main building · Floor 2", URO: "Main building · Floor 2", PSY: "Main building · Floor 2",
  SUR: "Main building · Floor 3", ORT: "Main building · Floor 3", OBG: "Main building · Floor 3", ONC: "Main building · Floor 3", PHY: "Main building · Floor 3", ICU: "Main building · Floor 3",
};

const conditionTable: Record<string, string[]> = {
  CAR: ["High blood pressure", "Chest pain", "Heart rhythm problems", "High cholesterol", "Heart failure"],
  NEU: ["Migraines", "Epilepsy", "Stroke", "Numbness or tingling", "Memory problems"],
  PED: ["Newborn checkups", "Fevers and infections", "Childhood allergies", "Growth concerns", "Vaccinations"],
  ORT: ["Broken bones", "Arthritis", "Back and neck pain", "Sports injuries", "Joint replacement"],
  EMR: ["Injuries and accidents", "Chest pain", "Difficulty breathing", "Severe bleeding", "Poisoning"],
  RAD: ["X-rays", "Ultrasound scans", "CT scans", "Imaging after injury", "Pregnancy scans"],
  INT: ["High blood pressure", "Diabetes follow-up", "Infections", "Ongoing tiredness", "Annual health reviews"],
  SUR: ["Hernia", "Gallbladder problems", "Appendicitis", "Lumps and masses", "Wound care"],
  OBG: ["Pregnancy care", "Safe delivery", "Family planning", "Menstrual problems", "Menopause"],
  ONC: ["Cancer screening", "Breast cancer", "Colon cancer", "Lung cancer", "Blood disorders"],
  ICU: ["Severe infections", "Respiratory failure", "Critical care after surgery", "Organ support", "Major trauma"],
  LAB: ["Blood counts", "Cholesterol and sugar", "Infection tests", "Hormone tests", "Pathology reports"],
  GAS: ["Acid reflux", "Gastritis and ulcers", "Hepatitis", "Irritable bowel", "Gallstones"],
  PUL: ["Asthma", "COPD", "Chronic cough", "Pneumonia", "Sleep apnea"],
  NEP: ["Chronic kidney disease", "Kidney stones", "High blood pressure", "Dialysis", "Transplant follow-up"],
  URO: ["Kidney stones", "Urinary infections", "Prostate problems", "Bladder issues", "Men's health"],
  END: ["Diabetes", "Thyroid disease", "Hormone imbalance", "Weight concerns", "Osteoporosis"],
  DER: ["Acne", "Eczema", "Fungal infections", "Allergic rashes", "Hair loss"],
  ENT: ["Hearing loss", "Sinusitis", "Tonsillitis", "Ear infections", "Voice problems"],
  OPH: ["Blurry vision", "Cataracts", "Glaucoma", "Eye infections", "Eye injuries"],
  PSY: ["Anxiety", "Depression", "Stress", "Sleep problems", "Trauma"],
  DEN: ["Tooth decay", "Gum disease", "Toothache", "Missing teeth", "Wisdom teeth"],
  PHY: ["Back pain", "Recovery after surgery", "Sports injuries", "Stroke rehabilitation", "Joint stiffness"],
  PHR: ["New prescriptions", "Long-term medication", "Drug interactions", "Dosage questions", "Over-the-counter advice"],
};

const tipTable: Record<string, string> = {
  CAR: "Bring a list of your medicines and any recent ECG or blood pressure readings. Wear loose clothing for tests.",
  NEU: "Note when your symptoms start and how long they last — a short diary really helps your doctor.",
  PED: "Bring your child's vaccination card and growth records, and a favorite toy to keep them calm.",
  ORT: "Bring earlier X-rays or scans, and wear clothing that makes the injured area easy to examine.",
  EMR: "Bring your ID and any medicines you take. If you can, bring someone who knows your medical history.",
  RAD: "Bring your doctor's request and earlier scans. Some scans need fasting — we'll tell you when you book.",
  INT: "Bring a list of your medicines and any recent test results.",
  SUR: "Bring previous test results and tell us about any allergies. Follow fasting instructions before a procedure.",
  OBG: "Bring your antenatal card and earlier scan reports, and note the date of your last period.",
  ONC: "Bring all earlier reports and scans, and consider bringing a family member for support.",
  ICU: "Family can visit during set hours — our nurses will explain visiting times and give regular updates.",
  LAB: "Some tests need fasting for 8–12 hours — check when you book. Bring your doctor's request.",
  GAS: "Note which foods trigger your symptoms. Some tests need an empty stomach.",
  PUL: "Bring your inhalers and any earlier chest X-rays or lung test results.",
  NEP: "Bring recent blood and urine test results, and your medicine list.",
  URO: "Bring recent urine or imaging results, and note any pain or changes you've noticed.",
  END: "Bring recent blood sugar readings or lab results, and your medicine list.",
  DER: "Avoid heavy makeup or creams on the affected area, and bring the products you use.",
  ENT: "Bring any earlier hearing tests and a list of your symptoms.",
  OPH: "Bring your current glasses or lenses. Dilating drops can blur vision for a few hours, so arrange a ride.",
  PSY: "Come as you are. Everything you share is confidential, and there's nothing you need to prepare.",
  DEN: "Bring earlier dental X-rays if you have them, and brush your teeth before you come.",
  PHY: "Wear comfortable clothes and bring reports from your doctor or surgeon.",
  PHR: "Bring your prescription or open it in your patient portal, and tell us about any allergies.",
};

/* What happens during / after a visit, and when to get urgent help — PLACEHOLDER wording, edit freely. */
const visitTable: Record<string, { during: string; after: string }> = {
  CAR: { during: "A nurse checks your blood pressure and pulse, then your cardiologist reviews your history and runs an ECG or echo if needed.", after: "Results and your treatment plan appear in your patient portal, and follow-ups are booked before you leave." },
  NEU: { during: "Your neurologist talks through your symptoms, tests reflexes, balance and memory, and may order a scan or EEG.", after: "You leave with a clear plan — medication, therapy or further tests — and a date for your next review." },
  PED: { during: "A nurse measures weight and height, then the pediatrician examines your child gently and answers all your questions.", after: "Vaccines and growth are recorded in your child's file, and we tell you exactly when to come back." },
  ORT: { during: "Your orthopedic doctor examines the joint or limb, reviews any X-rays and explains your options in plain language.", after: "A cast, brace, medication or physiotherapy plan is arranged on the spot, with a follow-up visit booked." },
  EMR: { during: "Triage nurses assess you within minutes, the most urgent patients are treated first, and a doctor sees you promptly.", after: "You're treated, admitted or sent home with clear instructions, and your record goes to your usual specialist." },
  RAD: { during: "A radiographer positions you and explains each step. Most scans take only a few minutes and are painless.", after: "A specialist radiologist reads your images, and the report goes to your doctor and your portal, usually the same day." },
  INT: { during: "Your doctor reviews your full history, examines you and orders any blood tests or scans in one go.", after: "Results are explained in your portal, and if you need a specialist, we arrange the referral for you." },
  SUR: { during: "Your surgeon examines you, explains the procedure, risks and recovery, and answers every question before anything is decided.", after: "You get a written recovery plan, wound-care advice and a follow-up visit to check your healing." },
  OBG: { during: "A midwife or doctor checks your blood pressure and weight, listens to your baby's heartbeat and talks through how you feel.", after: "Your next scan or checkup is booked, and you get a number to call if you have any worries in between." },
  ONC: { during: "Your oncologist reviews your reports, explains your diagnosis calmly and sets out your options with you, step by step.", after: "A care coordinator arranges treatment dates and support services, and your whole team shares one plan." },
  ICU: { during: "Your loved one is monitored around the clock by a dedicated intensive care team, with the family kept informed.", after: "Doctors update the family daily and agree each next step together, from recovery to moving to a ward." },
  LAB: { during: "A trained phlebotomist takes your sample — usually a quick finger prick or blood draw — and labels it in front of you.", after: "Samples are analyzed on modern equipment, verified by a specialist and sent to your portal, often the same day." },
  GAS: { during: "Your doctor asks about your diet and symptoms, examines you and, if needed, books an endoscopy or ultrasound.", after: "You get diet advice and a treatment plan, and your results are explained at follow-up." },
  PUL: { during: "A nurse measures your oxygen level, then a simple breathing test shows how well your lungs work.", after: "Your inhaler or treatment plan is set up and demonstrated, with a follow-up to check your progress." },
  NEP: { during: "Blood and urine tests show how well your kidneys work, and your nephrologist explains the results clearly.", after: "You get a kidney-friendly care plan, and dialysis or follow-up sessions are scheduled if you need them." },
  URO: { during: "Your urologist asks about your symptoms, examines you and may order a urine test or ultrasound the same visit.", after: "Treatment or a procedure is planned discreetly, with clear advice on recovery and prevention." },
  END: { during: "Your blood sugar and hormone levels are checked, and your endocrinologist goes through your diet, weight and medicines.", after: "You leave with a personal plan and a monitoring schedule, with your results tracked in your portal." },
  DER: { during: "Your dermatologist examines your skin closely, sometimes with a magnifier, and asks about products and allergies.", after: "You get a treatment plan and skincare advice, with a check-in to see how your skin is responding." },
  ENT: { during: "Your specialist looks into your ears, nose and throat, and a hearing or sinus test is done if needed.", after: "Treatment starts right away — medicine, a minor procedure or a plan — and a follow-up is booked." },
  OPH: { during: "Your vision is tested first, then your eye doctor checks eye health and pressure, sometimes with dilating drops.", after: "A glasses prescription or treatment plan is given, and any further checks are scheduled." },
  PSY: { during: "You talk privately with a psychiatrist or counselor at your own pace. Nothing is rushed and everything stays confidential.", after: "Together you agree on a plan — therapy, medication or both — with regular check-ins to see how you are." },
  DEN: { during: "Your dentist checks your teeth and gums, takes X-rays if needed and explains what they find before treating anything.", after: "Treatment is done with comfort in mind, and you get simple aftercare advice and your next checkup date." },
  PHY: { during: "Your physiotherapist assesses your movement and strength, then starts gentle, guided exercises.", after: "You get a home exercise plan and a set of follow-up sessions to build strength safely." },
  PHR: { during: "A pharmacist checks your prescription against your record and your allergies before preparing your medicines.", after: "They explain how and when to take each medicine, and your refill dates are kept in your portal." },
};

/* Shown after "Go to Emergency or call us straight away if ..." — except 24-hour departments, which show the sentence as is. */
const urgentTable: Record<string, string> = {
  CAR: "you have chest pain or pressure, pain spreading to your arm or jaw, or sudden shortness of breath.",
  NEU: "you have sudden weakness on one side, trouble speaking, a sudden severe headache, or a seizure that won't stop.",
  PED: "your child has trouble breathing, a very high fever with drowsiness, a seizure, or can't be woken.",
  ORT: "a bone looks out of place, bleeding won't stop, or you can't move or feel a limb after an injury.",
  EMR: "You're in the right place — walk in at any time, day or night, or call us now.",
  RAD: "you feel very unwell, faint or short of breath after a scan or contrast injection.",
  INT: "you have severe chest pain, difficulty breathing, confusion or fainting.",
  SUR: "after an operation you have heavy bleeding, a high fever, or severe pain that keeps getting worse.",
  OBG: "you have heavy bleeding, severe abdominal pain, reduced baby movements, or your waters break early.",
  ONC: "during treatment you have a high fever, bleeding that won't stop, or severe vomiting.",
  ICU: "Our team is at the bedside around the clock — family can call at any time for an update.",
  LAB: "you feel faint, dizzy or very unwell after giving a sample.",
  GAS: "you vomit blood, pass black stools, or have severe, constant abdominal pain.",
  PUL: "you struggle to breathe, your lips turn blue, or your reliever inhaler isn't helping.",
  NEP: "you pass almost no urine, have severe back pain with fever, or sudden swelling and breathlessness.",
  URO: "you can't pass urine, see heavy blood in your urine, or have severe pain with fever.",
  END: "you feel very confused or drowsy, are extremely thirsty, or a very low blood sugar doesn't improve.",
  DER: "your face or throat swells and you have trouble breathing, or a rash spreads fast with fever or blistering.",
  ENT: "you have trouble breathing or swallowing, a nosebleed that won't stop, or sudden hearing loss.",
  OPH: "you lose vision suddenly, have severe eye pain, or a chemical or object injures your eye.",
  PSY: "you are thinking of harming yourself or someone else.",
  DEN: "swelling makes it hard to breathe or swallow, or bleeding won't stop after an extraction.",
  PHY: "you have sudden severe pain, numbness or weakness during or after exercises.",
  PHR: "you think you've taken too much of a medicine, or have swelling or trouble breathing after taking one.",
};

/* Photos per department, keyed by slug. Put images in /public and list them here, e.g.
   "cardiology": ["/departments/cardiology-1.webp", "/departments/cardiology-2.webp"] */
export const deptPhotos: Record<string, string[]> = {};

/* used when a department has no photos yet — your existing site images */
const sitePhotos = ["/6.webp", "/1.webp", "/5.webp", "/4.webp", "/7.webp", "/about.webp"];

export function photosFor(d: Dept, index = 0): string[] {
  if (d.photos && d.photos.length) return d.photos;
  const own = deptPhotos[slugify(d.name)];
  if (own && own.length) return own;
  /* rotate the site images so neighbouring departments don't look identical */
  return sitePhotos.map((_, i) => sitePhotos[(i + index) % sitePhotos.length]);
}

const iconProps = {
  className: "h-7 w-7",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const deptIcons: [string[], React.ReactNode][] = [
  [["cardio"], <svg key="cardio" {...iconProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/><path d="M7 12h3l1.5-3 2 5L15 12h2"/></svg>],
  [["neuro"], <svg key="neuro" {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>],
  [["pediat", "paediat", "child"], <svg key="ped" {...iconProps}><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/></svg>],
  [["ortho"], <svg key="ortho" {...iconProps}><path d="M17 10c.7-.7 1.7-1 2.5-.5a2.5 2.5 0 1 0-3-3c-.5-.8-.2-1.8.5-2.5a2.5 2.5 0 1 0-3 3L7 14c-.7.7-1.7 1-2.5.5a2.5 2.5 0 1 0 3 3c.5.8.2 1.8-.5 2.5a2.5 2.5 0 1 0 3-3z"/></svg>],
  [["intensive", "icu"], <svg key="icu" {...iconProps}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M5 10h3l2-3 3 6 2-3h4"/></svg>],
  [["emer"], <svg key="emer" {...iconProps}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>],
  [["radio", "imaging"], <svg key="radio" {...iconProps}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg>],
  [["lab", "patholog"], <svg key="lab" {...iconProps}><path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2M8.5 2h7M7 16h10"/></svg>],
  [["onco", "cancer"], <svg key="onco" {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>],
  [["women", "obstet", "gyn"], <svg key="women" {...iconProps}><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>],
  [["surg"], <svg key="surg" {...iconProps}><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/></svg>],
  [["internal", "general med"], <svg key="internal" {...iconProps}><path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>],
  [["gastro", "nutri"], <svg key="gastro" {...iconProps}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>],
  [["pulmo", "respir", "chest"], <svg key="pulmo" {...iconProps}><path d="M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"/></svg>],
  [["nephro", "dialysis", "urolog", "kidney"], <svg key="nephro" {...iconProps}><path d="M12 2.7s7 6.3 7 11.3a7 7 0 0 1-14 0c0-5 7-11.3 7-11.3z"/></svg>],
  [["endocrin", "diabet"], <svg key="endo" {...iconProps}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></svg>],
  [["dermat", "skin"], <svg key="derm" {...iconProps}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>],
  [["ear, nose", "ent", "otolaryn"], <svg key="ent" {...iconProps}><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/></svg>],
  [["ophthal", "eye"], <svg key="eye" {...iconProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>],
  [["psych", "mental"], <svg key="psych" {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>],
  [["dental", "dentist"], <svg key="dental" {...iconProps}><path d="M12 5.5c-1.5-1.3-4-1.8-5.5-.3C5 6.7 5 9 5.8 11c.7 1.8 1 4 1.4 6 .3 1.5 1.3 2.5 2.3 2.5 1.2 0 1.3-2 2.5-2s1.3 2 2.5 2c1 0 2-1 2.3-2.5.4-2 .7-4.2 1.4-6 .8-2 .8-4.3-.7-5.8-1.5-1.5-4-1-5.5.3z"/></svg>],
  [["physio", "rehab"], <svg key="physio" {...iconProps}><circle cx="12" cy="5" r="2"/><path d="M5 9l7 2 7-2M12 11v5l-3 5M12 16l3 5"/></svg>],
  [["pharmac"], <svg key="pharm" {...iconProps}><path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/></svg>],
];

export function iconFor(name: string) {
  const n = name.toLowerCase();
  for (const [keys, icon] of deptIcons) {
    if (keys.some((k) => n.includes(k))) return icon;
  }
  return deptIcons[0][1];
}

/* fill a department with services / description / 24-7 flag from the full list */
export function withMeta(d: Dept): Dept {
  const meta = fallbackDepts.find((f) => norm(f.code) === norm(d.code) || norm(f.name) === norm(d.name));
  const code = d.code.toUpperCase();
  const open24 = d.open24 ?? meta?.open24 ?? false;
  const visit = visitTable[code];
  return {
    ...d,
    services: d.services ?? meta?.services ?? defaultServices,
    open24,
    nurses: d.nurses ?? nurseCounts[code] ?? 8,
    description:
      d.description || meta?.description || "Consultations, diagnostics and treatment from our specialist team.",
    location: d.location || floors[code] || "Main building",
    hours: d.hours || (open24 ? "Open 24 hours, every day" : "Sat – Thu · 8:00 – 17:00"),
    phone: d.phone || HOSPITAL_PHONE,
    conditions: d.conditions ?? conditionTable[code] ?? [],
    tip: d.tip || tipTable[code] || "Bring your ID, your medicine list and any previous reports or scans.",
    during: d.during || visit?.during || "A nurse checks your vitals, then your specialist reviews your history, examines you and explains what they find.",
    after: d.after || visit?.after || "Your results and next steps appear in your patient portal, and any follow-up is booked before you leave.",
    urgent: d.urgent || urgentTable[code] || "you have severe pain, difficulty breathing, heavy bleeding or sudden confusion.",
  };
}

/* API departments first, then any department from the full list the API doesn't have */
export function useDepartments() {
  const [fromApi, setFromApi] = useState<Dept[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    client
      .get("/departments")
      .then((r) => setFromApi(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const list: Dept[] = [
    ...fromApi,
    ...fallbackDepts.filter(
      (f) => !fromApi.some((d) => norm(d.code) === norm(f.code) || norm(d.name) === norm(f.name))
    ),
  ].map(withMeta);

  return { list, loaded };
}
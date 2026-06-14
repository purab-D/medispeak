"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

type AnalysisStatus = "idle" | "loading" | "success" | "error";
type DetailSectionKey =
  | "executiveSummary"
  | "keyMeasurements"
  | "importantFindings"
  | "medicalTermsExplained"
  | "questionsToAskYourDoctor";
type ExplanationMode = "child" | "adult" | "senior";
type ReportLanguage = "english" | "kannada";
type ReportType =
  | "Eye Report"
  | "Blood Test"
  | "MRI"
  | "CT Scan"
  | "X-Ray"
  | "Ultrasound"
  | "ECG"
  | "Other";
type RiskLevel = "normal" | "attention" | "followUp";

type ExplainResponse = {
  result?: string;
  error?: string;
};

type SampleReport = {
  title: string;
  label: string;
  report: string;
};

type ReportSections = {
  executiveSummary?: string;
  importantFindings?: string;
  keyMeasurements?: string;
  medicalTermsExplained?: string;
  questionsToAskYourDoctor?: string;
  kannadaTranslation?: string;
};

type FindingCard = {
  explanation: string;
  name: string;
  status: RiskLevel;
};

type MeasurementCard = {
  explanation: string;
  name: string;
  status: RiskLevel;
  unit: string;
  value: string;
};

type MedicalTermCard = {
  explanation: string;
  term: string;
};

type PrescriptionDetail = {
  axis?: string;
  cylinder?: string;
  eye: string;
  power?: string;
};

const sampleReports: SampleReport[] = [
  {
    title: "CBC Anemia",
    label: "Blood test",
    report: `Complete Blood Count
Hemoglobin: 10.8 g/dL
WBC: 7,600 cells/mcL
Platelets: 245,000/mcL
MCV: 72 fL
Ferritin: 9 ng/mL
Notes: Fatigue for 3 months. Mild shortness of breath on stairs.`,
  },
  {
    title: "Metabolic Risk",
    label: "Lab panel",
    report: `Comprehensive Metabolic and Lipid Panel
Fasting glucose: 128 mg/dL
HbA1c: 6.7%
Total cholesterol: 238 mg/dL
LDL: 162 mg/dL
HDL: 38 mg/dL
Triglycerides: 210 mg/dL
Notes: Family history of type 2 diabetes and high cholesterol.`,
  },
  {
    title: "Knee MRI",
    label: "Imaging",
    report: `MRI Right Knee Without Contrast
Findings: Complex tear of posterior horn of medial meniscus. Mild joint effusion. Grade 2 chondral thinning in medial compartment. No fracture or bone marrow edema.
Impression: Medial meniscus tear with mild degenerative cartilage change.`,
  },
];

const loadingSteps: Record<ReportLanguage, string[]> = {
  english: [
    "Reading report structure",
    "Identifying important findings",
    "Explaining medical terms",
    "Preparing patient questions",
  ],
  kannada: [
    "ವರದಿ ರಚನೆಯನ್ನು ಓದುತ್ತಿದೆ",
    "ಪ್ರಮುಖ ಕಂಡುಬಂದ ಅಂಶಗಳನ್ನು ಗುರುತಿಸುತ್ತಿದೆ",
    "ವೈದ್ಯಕೀಯ ಪದಗಳನ್ನು ವಿವರಿಸುತ್ತಿದೆ",
    "ವೈದ್ಯರನ್ನು ಕೇಳಬೇಕಾದ ಪ್ರಶ್ನೆಗಳನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತಿದೆ",
  ],
};

const sectionHeadingMap: Record<string, keyof ReportSections> = {
  "executive summary": "executiveSummary",
  "plain english summary": "executiveSummary",
  "important findings": "importantFindings",
  "key measurements": "keyMeasurements",
  "medical terms explained": "medicalTermsExplained",
  "questions to ask your doctor": "questionsToAskYourDoctor",
  "kannada translation": "kannadaTranslation",
};

const explanationModeOptions: ExplanationMode[] = ["child", "adult", "senior"];

const knownMedicalTerms: MedicalTermCard[] = [
  {
    term: "Myopia",
    explanation: "Nearsightedness, where distant objects may look blurry.",
  },
  {
    term: "Hyperopia",
    explanation: "Farsightedness, where nearby objects may look blurry.",
  },
  {
    term: "Astigmatism",
    explanation: "An uneven curve of the eye that can blur or distort vision.",
  },
  {
    term: "Visual Acuity",
    explanation: "A measure of how clearly a person can see.",
  },
  {
    term: "Sphere (SPH)",
    explanation: "The main lens power used to correct nearsightedness or farsightedness.",
  },
  {
    term: "Cylinder (CYL)",
    explanation: "Lens power used to correct astigmatism.",
  },
  {
    term: "Axis",
    explanation: "The angle used to position cylinder correction for astigmatism.",
  },
  {
    term: "OD",
    explanation: "Right eye.",
  },
  {
    term: "OS",
    explanation: "Left eye.",
  },
  {
    term: "Fundus",
    explanation: "The back inner part of the eye examined by a clinician.",
  },
  {
    term: "Retina",
    explanation: "The light-sensitive layer at the back of the eye.",
  },
  {
    term: "Intraocular Pressure",
    explanation: "Pressure inside the eye.",
  },
  {
    term: "Hemoglobin",
    explanation: "The oxygen-carrying protein in red blood cells.",
  },
  {
    term: "Ferritin",
    explanation: "A blood marker that reflects stored iron in the body.",
  },
  {
    term: "LDL",
    explanation: "A blood fat marker that can raise heart risk when high.",
  },
  {
    term: "HDL",
    explanation: "A protective blood fat marker that helps carry excess fats away.",
  },
  {
    term: "HbA1c",
    explanation: "A blood sugar average over about two to three months.",
  },
  {
    term: "Triglycerides",
    explanation: "A type of fat measured in the blood.",
  },
  {
    term: "WBC",
    explanation: "White blood cells that help the body fight infection.",
  },
  {
    term: "Platelets",
    explanation: "Blood cells that help with clotting.",
  },
];

const medicalTermAliases: Record<string, string[]> = {
  Astigmatism: ["astigmatic"],
  "Cylinder (CYL)": ["cylinder", "cyl"],
  Ferritin: ["serum ferritin"],
  "HbA1c": ["hba1c", "a1c"],
  HDL: ["hdl cholesterol", "high-density lipoprotein"],
  Hemoglobin: ["haemoglobin", "hb"],
  Hyperopia: ["farsighted", "farsightedness"],
  "Intraocular Pressure": ["intraocular pressure", "iop"],
  LDL: ["ldl cholesterol", "low-density lipoprotein"],
  Myopia: ["nearsighted", "nearsightedness"],
  OD: ["right eye", "re"],
  OS: ["left eye", "le"],
  Platelets: ["platelet count"],
  "Sphere (SPH)": ["sphere", "sph"],
  Triglycerides: ["tg"],
  "Visual Acuity": ["visual acuity", "6/6", "6/9", "20/20"],
  WBC: ["white blood cells", "white blood cell count"],
};

const uiCopy = {
  english: {
    activeSampleLoaded: "loaded",
    analyze: "Analyze",
    analyzeReport: "Analyze report",
    analyzing: "Analyzing",
    analyzingReport: "Analyzing report",
    attention: "Attention Needed",
    careAi: "AI explains",
    careAiHelp: "Jargon becomes clear",
    carePaste: "Paste report",
    carePasteHelp: "Labs, scans, notes",
    careVisit: "Prepare visit",
    careVisitHelp: "Better questions",
    characters: "characters",
    childMode: "🧒 Child (10 Years Old)",
    copied: "Copied",
    copy: "Copy",
    doctorDisclaimer:
      "Educational explanation only. Always consult a clinician.",
    educationFooter:
      "Educational information only. Consult a qualified healthcare professional for diagnosis and treatment.",
    emptyTitle: "Your patient-ready explanation will appear here.",
    executiveSummary: "Executive Summary",
    generated: "Generated",
    inputFallback: "Paste a report or choose a sample",
    inputLabel: "Medical report input",
    inputPlaceholder:
      "Paste lab values, imaging findings, or clinical notes here...",
    keyFindings: "Top 3 key findings",
    language: "Language",
    languageNames: {
      english: "English",
      kannada: "Kannada",
    },
    loadedReport: "Report loaded",
    mode: "Mode",
    modeHelp:
      "Choose how MediSpeak should explain this report. Changing mode regenerates the answer.",
    modeLabel: "Explanation mode",
    modeNames: {
      adult: "Adult",
      child: "Child",
      senior: "Senior Citizen",
    },
    normal: "Normal",
    outputEyebrow: "Patient explanation",
    outputTitle: "Care-ready summary",
    overallSummary: "Overall Report Summary",
    pasteHelper: "Paste any report and get a structured summary, key findings, doctor questions, and Kannada support.",
    patientReadyTitle: "Patient-ready report explanations.",
    pasteBeforeAnalyze: "Paste or choose a medical report before analyzing.",
    preparingKannada: "Preparing Kannada translation for the full report...",
    preparingReport: "Preparing patient explanation",
    preparingReportHelp:
      "MediSpeak is organizing the report into care-friendly sections.",
    readyStatus: "Ready to analyze",
    reportReadyEyebrow: "Structured patient report",
    reportReadyTitle: "Your explanation is ready",
    reportType: "Report Type",
    reportTypeNames: {
      "Blood Test": "Blood Test",
      "CT Scan": "CT Scan",
      ECG: "ECG",
      "Eye Report": "Eye Report",
      MRI: "MRI",
      Other: "Other",
      Ultrasound: "Ultrasound",
      "X-Ray": "X-Ray",
    },
    riskLevel: "Risk Level",
    sampleLabels: {
      "Blood test": "Blood test",
      Imaging: "Imaging",
      "Lab panel": "Lab panel",
    },
    secureWorkspace: "Secure AI workspace",
    seniorMode: "👴 Senior Citizen",
    statusReady: "Explanation ready",
    statusAttention: "Needs attention",
    trustedExplainer: "Trusted medical report explainer",
    translationError:
      "Kannada translation could not be generated. English report is still available.",
    adultMode: "👨 Adult",
    fallbackFinding: "Finding",
    fallbackSummary:
      "MediSpeak has prepared a patient-friendly explanation for this report.",
    followUp: "Follow Up Recommended",
    noMedicalTerms: "No complex medical terms were identified in this report.",
    noSection:
      "This section was not separated by the model, but the executive summary remains available.",
    words: "words",
    sections: {
      executiveSummary: {
        description: "Always open with the clearest takeaways from the report.",
        icon: "+",
        title: "Executive Summary",
      },
      importantFindings: {
        description: "Reviewed findings with status and a short explanation.",
        icon: "!",
        title: "Important Findings",
      },
      keyMeasurements: {
        description: "Highlighted values, units, and status badges.",
        icon: "123",
        title: "Key Measurements",
      },
      medicalTermsExplained: {
        description: "Medical words translated into everyday language.",
        icon: "Rx",
        title: "Medical Terms Explained",
      },
      questionsToAskYourDoctor: {
        description: "Tap any question to copy it for your visit.",
        icon: "?",
        title: "Questions To Ask Your Doctor",
      },
    },
  },
  kannada: {
    activeSampleLoaded: "ಲೋಡ್ ಆಗಿದೆ",
    analyze: "ವಿಶ್ಲೇಷಿಸಿ",
    analyzeReport: "ವರದಿಯನ್ನು ವಿಶ್ಲೇಷಿಸಿ",
    analyzing: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ",
    analyzingReport: "ವರದಿ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ",
    attention: "ಗಮನ ಅಗತ್ಯ",
    careAi: "AI ವಿವರಿಸುತ್ತದೆ",
    careAiHelp: "ಕಠಿಣ ಪದಗಳು ಸ್ಪಷ್ಟವಾಗುತ್ತವೆ",
    carePaste: "ವರದಿ ಅಂಟಿಸಿ",
    carePasteHelp: "ಲ್ಯಾಬ್, ಸ್ಕ್ಯಾನ್, ಟಿಪ್ಪಣಿಗಳು",
    careVisit: "ಭೇಟಿಗೆ ಸಿದ್ಧರಾಗಿ",
    careVisitHelp: "ಉತ್ತಮ ಪ್ರಶ್ನೆಗಳು",
    characters: "ಅಕ್ಷರಗಳು",
    childMode: "🧒 ಮಗು (10 ವರ್ಷ)",
    copied: "ನಕಲಿಸಲಾಗಿದೆ",
    copy: "ನಕಲಿಸಿ",
    doctorDisclaimer:
      "ಇದು ಶೈಕ್ಷಣಿಕ ವಿವರಣೆ ಮಾತ್ರ. ಯಾವಾಗಲೂ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    educationFooter:
      "ಇದು ಶೈಕ್ಷಣಿಕ ಮಾಹಿತಿ ಮಾತ್ರ. ರೋಗನಿರ್ಣಯ ಮತ್ತು ಚಿಕಿತ್ಸೆಗೆ ಅರ್ಹ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    emptyTitle: "ನಿಮ್ಮ ರೋಗಿ ಸ್ನೇಹಿ ವಿವರಣೆ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
    executiveSummary: "ಕಾರ್ಯಕಾರಿ ಸಾರಾಂಶ",
    generated: "ರಚಿಸಲಾಗಿದೆ",
    inputFallback: "ವರದಿಯನ್ನು ಅಂಟಿಸಿ ಅಥವಾ ಮಾದರಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    inputLabel: "ವೈದ್ಯಕೀಯ ವರದಿ ನಮೂದು",
    inputPlaceholder:
      "ಲ್ಯಾಬ್ ಮೌಲ್ಯಗಳು, ಇಮೇಜಿಂಗ್ ಕಂಡುಬಂದ ಅಂಶಗಳು ಅಥವಾ ಕ್ಲಿನಿಕಲ್ ಟಿಪ್ಪಣಿಗಳನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ...",
    keyFindings: "ಮುಖ್ಯ 3 ಕಂಡುಬಂದ ಅಂಶಗಳು",
    language: "ಭಾಷೆ",
    languageNames: {
      english: "ಇಂಗ್ಲಿಷ್",
      kannada: "ಕನ್ನಡ",
    },
    loadedReport: "ವರದಿ ಲೋಡ್ ಆಗಿದೆ",
    mode: "ಮೋಡ್",
    modeHelp:
      "ಈ ವರದಿಯನ್ನು MediSpeak ಹೇಗೆ ವಿವರಿಸಬೇಕು ಎಂಬುದನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಮೋಡ್ ಬದಲಿಸಿದರೆ ಉತ್ತರ ಮತ್ತೆ ರಚಿಸಲಾಗುತ್ತದೆ.",
    modeLabel: "ವಿವರಣೆ ಮೋಡ್",
    modeNames: {
      adult: "ವಯಸ್ಕ",
      child: "ಮಗು",
      senior: "ಹಿರಿಯ ನಾಗರಿಕ",
    },
    normal: "ಸಾಮಾನ್ಯ",
    outputEyebrow: "ರೋಗಿ ವಿವರಣೆ",
    outputTitle: "ಆರೈಕೆಗಾಗಿ ಸಿದ್ಧ ಸಾರಾಂಶ",
    overallSummary: "ಒಟ್ಟಾರೆ ವರದಿ ಸಾರಾಂಶ",
    pasteHelper: "ಯಾವುದೇ ವರದಿಯನ್ನು ಅಂಟಿಸಿ ಮತ್ತು ರಚನಾತ್ಮಕ ಸಾರಾಂಶ, ಮುಖ್ಯ ಅಂಶಗಳು, ವೈದ್ಯರ ಪ್ರಶ್ನೆಗಳು ಮತ್ತು ಕನ್ನಡ ಬೆಂಬಲ ಪಡೆಯಿರಿ.",
    patientReadyTitle: "ರೋಗಿಗೆ ಅರ್ಥವಾಗುವ ವರದಿ ವಿವರಣೆಗಳು.",
    pasteBeforeAnalyze: "ವಿಶ್ಲೇಷಿಸುವ ಮೊದಲು ವೈದ್ಯಕೀಯ ವರದಿಯನ್ನು ಅಂಟಿಸಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ.",
    preparingKannada: "ಪೂರ್ಣ ವರದಿಯ ಕನ್ನಡ ಅನುವಾದವನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...",
    preparingReport: "ರೋಗಿ ವಿವರಣೆ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ",
    preparingReportHelp:
      "MediSpeak ವರದಿಯನ್ನು ಆರೈಕೆ ಸ್ನೇಹಿ ವಿಭಾಗಗಳಾಗಿ ವ್ಯವಸ್ಥೆಗೊಳಿಸುತ್ತಿದೆ.",
    readyStatus: "ವಿಶ್ಲೇಷಣೆಗೆ ಸಿದ್ಧ",
    reportReadyEyebrow: "ರಚನಾತ್ಮಕ ರೋಗಿ ವರದಿ",
    reportReadyTitle: "ನಿಮ್ಮ ವಿವರಣೆ ಸಿದ್ಧವಾಗಿದೆ",
    reportType: "ವರದಿ ಪ್ರಕಾರ",
    reportTypeNames: {
      "Blood Test": "ರಕ್ತ ಪರೀಕ್ಷೆ",
      "CT Scan": "ಸಿ.ಟಿ. ಸ್ಕ್ಯಾನ್",
      ECG: "ಇಸಿಜಿ",
      "Eye Report": "ಕಣ್ಣು ವರದಿ",
      MRI: "ಎಂ.ಆರ್.ಐ",
      Other: "ಇತರೆ",
      Ultrasound: "ಅಲ್ಟ್ರಾಸೌಂಡ್",
      "X-Ray": "ಎಕ್ಸ್-ರೇ",
    },
    riskLevel: "ಅಪಾಯದ ಮಟ್ಟ",
    sampleLabels: {
      "Blood test": "ರಕ್ತ ಪರೀಕ್ಷೆ",
      Imaging: "ಇಮೇಜಿಂಗ್",
      "Lab panel": "ಲ್ಯಾಬ್ ಪ್ಯಾನೆಲ್",
    },
    secureWorkspace: "ಸುರಕ್ಷಿತ AI ಕಾರ್ಯಸ್ಥಳ",
    seniorMode: "👴 ಹಿರಿಯ ನಾಗರಿಕ",
    statusReady: "ವಿವರಣೆ ಸಿದ್ಧವಾಗಿದೆ",
    statusAttention: "ಗಮನ ಅಗತ್ಯ",
    trustedExplainer: "ವಿಶ್ವಾಸಾರ್ಹ ವೈದ್ಯಕೀಯ ವರದಿ ವಿವರಣೆಗಾರ",
    translationError:
      "ಕನ್ನಡ ಅನುವಾದವನ್ನು ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಇಂಗ್ಲಿಷ್ ವರದಿ ಲಭ್ಯವಿದೆ.",
    adultMode: "👨 ವಯಸ್ಕ",
    fallbackFinding: "ಕಂಡುಬಂದ ಅಂಶ",
    fallbackSummary:
      "MediSpeak ಈ ವರದಿಗೆ ರೋಗಿಗೆ ಅರ್ಥವಾಗುವ ವಿವರಣೆಯನ್ನು ಸಿದ್ಧಪಡಿಸಿದೆ.",
    followUp: "ಮುಂದಿನ ಪರಿಶೀಲನೆ ಶಿಫಾರಸು",
    noMedicalTerms: "ಈ ವರದಿಯಲ್ಲಿ ಸಂಕೀರ್ಣ ವೈದ್ಯಕೀಯ ಪದಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    noSection:
      "ಈ ವಿಭಾಗವನ್ನು ಮಾದರಿ ಪ್ರತ್ಯೇಕವಾಗಿ ನೀಡಿಲ್ಲ, ಆದರೆ ಸಾರಾಂಶ ಲಭ್ಯವಿದೆ.",
    words: "ಪದಗಳು",
    sections: {
      executiveSummary: {
        description: "ವರದಿಯ ಅತ್ಯಂತ ಮುಖ್ಯ ಅಂಶಗಳ ಯಾವಾಗಲೂ ತೆರೆದ ಸಾರಾಂಶ.",
        icon: "+",
        title: "ಕಾರ್ಯಕಾರಿ ಸಾರಾಂಶ",
      },
      importantFindings: {
        description: "ಸ್ಥಿತಿ ಮತ್ತು ಚಿಕ್ಕ ವಿವರಣೆಯೊಂದಿಗೆ ಪ್ರಮುಖ ಅಂಶಗಳು.",
        icon: "!",
        title: "ಪ್ರಮುಖ ಕಂಡುಬಂದ ಅಂಶಗಳು",
      },
      keyMeasurements: {
        description: "ಮುಖ್ಯ ಮೌಲ್ಯಗಳು, ಘಟಕಗಳು ಮತ್ತು ಸ್ಥಿತಿ ಗುರುತುಗಳು.",
        icon: "123",
        title: "ಮುಖ್ಯ ಅಳತೆಗಳು",
      },
      medicalTermsExplained: {
        description: "ವೈದ್ಯಕೀಯ ಪದಗಳನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸಲಾಗಿದೆ.",
        icon: "Rx",
        title: "ವೈದ್ಯಕೀಯ ಪದಗಳ ವಿವರಣೆ",
      },
      questionsToAskYourDoctor: {
        description: "ನಿಮ್ಮ ಭೇಟಿಗೆ ಪ್ರಶ್ನೆಯನ್ನು ನಕಲಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ.",
        icon: "?",
        title: "ವೈದ್ಯರನ್ನು ಕೇಳಬೇಕಾದ ಪ್ರಶ್ನೆಗಳು",
      },
    },
  },
} satisfies Record<
  ReportLanguage,
  {
    attention: string;
    activeSampleLoaded: string;
    adultMode: string;
    analyze: string;
    analyzeReport: string;
    analyzing: string;
    analyzingReport: string;
    careAi: string;
    careAiHelp: string;
    carePaste: string;
    carePasteHelp: string;
    careVisit: string;
    careVisitHelp: string;
    characters: string;
    childMode: string;
    copied: string;
    copy: string;
    doctorDisclaimer: string;
    educationFooter: string;
    emptyTitle: string;
    executiveSummary: string;
    fallbackFinding: string;
    fallbackSummary: string;
    followUp: string;
    generated: string;
    inputFallback: string;
    inputLabel: string;
    inputPlaceholder: string;
    keyFindings: string;
    language: string;
    languageNames: Record<ReportLanguage, string>;
    loadedReport: string;
    mode: string;
    modeHelp: string;
    modeLabel: string;
    modeNames: Record<ExplanationMode, string>;
    noSection: string;
    noMedicalTerms: string;
    normal: string;
    outputEyebrow: string;
    outputTitle: string;
    overallSummary: string;
    pasteHelper: string;
    patientReadyTitle: string;
    pasteBeforeAnalyze: string;
    preparingKannada: string;
    preparingReport: string;
    preparingReportHelp: string;
    readyStatus: string;
    reportReadyEyebrow: string;
    reportReadyTitle: string;
    reportType: string;
    reportTypeNames: Record<ReportType, string>;
    riskLevel: string;
    sampleLabels: Record<string, string>;
    secureWorkspace: string;
    seniorMode: string;
    statusAttention: string;
    statusReady: string;
    trustedExplainer: string;
    translationError: string;
    words: string;
    sections: Record<
      DetailSectionKey,
      {
        description: string;
        icon: string;
        title: string;
      }
    >;
  }
>;

function splitSentences(value: string) {
  return value
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getImportantFindings(report: string, result: string) {
  const lineFindings = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line))
    .filter(isClinicalFinding);

  if (lineFindings.length > 0) {
    return lineFindings.slice(0, 4);
  }

  const sentenceFindings = splitSentences(result).filter(isClinicalFinding);

  if (sentenceFindings.length > 0) {
    return sentenceFindings.slice(0, 4);
  }

  return report
    .split("\n")
    .map((line) => line.trim())
    .filter(isClinicalFinding)
    .slice(0, 4);
}

function getDoctorQuestions(result: string) {
  const questions = splitSentences(result).filter((sentence) =>
    sentence.endsWith("?")
  );

  return questions.slice(0, 4);
}

function getPlainEnglishSummary(result: string) {
  const sentences = splitSentences(result);
  const summary = sentences.slice(0, 3).join(" ");

  return summary || result;
}

function normalizeHeading(value: string) {
  return value
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getReportSections(markdown: string) {
  const sections: ReportSections = {};
  const headings = Array.from(markdown.matchAll(/^#{1,3}\s+(.+)$/gm));

  headings.forEach((heading, index) => {
    const key = sectionHeadingMap[normalizeHeading(heading[1])];

    if (!key) {
      return;
    }

    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? markdown.length;
    const content = markdown.slice(start, end).trim();

    if (content) {
      sections[key] = content;
    }
  });

  return sections;
}

function getMarkdownListItems(markdown: string) {
  const items: string[] = [];
  let currentItem: string[] = [];

  markdown.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line || /^#{1,6}\s+/.test(line)) {
      return;
    }

    const listMatch = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);

    if (listMatch) {
      if (currentItem.length > 0) {
        items.push(currentItem.join("\n").trim());
      }

      currentItem = [listMatch[1]];
      return;
    }

    if (currentItem.length > 0) {
      currentItem.push(line);
    }
  });

  if (currentItem.length > 0) {
    items.push(currentItem.join("\n").trim());
  }

  return items.filter(Boolean).slice(0, 6);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkdown(value: string) {
  return value
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceContainsTerm(source: string, term: string) {
  const aliases = [term, ...(medicalTermAliases[term] ?? [])];

  return aliases.some((alias) => {
    const normalizedAlias = alias.toLowerCase();
    const escapedAlias = escapeRegex(normalizedAlias);
    const expression =
      normalizedAlias.length <= 3
        ? new RegExp(`(?:^|[^a-z0-9])${escapedAlias}(?:$|[^a-z0-9])`, "i")
        : new RegExp(`\\b${escapedAlias}\\b`, "i");

    return expression.test(source);
  });
}

function parseMedicalTermItem(item: string) {
  const clean = stripMarkdown(item);

  if (
    !clean ||
    /\b(no|none|not)\b.*\b(complex|difficult|medical terms?|identified|found)\b/i.test(
      clean
    )
  ) {
    return null;
  }

  const match = clean.match(/^(.{2,60}?)(?:\s*[:–—-]\s+|\s+-\s+)(.+)$/);

  if (!match) {
    return null;
  }

  const term = match[1].replace(/^\d+[.)]\s*/, "").trim();
  const explanation = match[2].trim();

  if (!term || !explanation || isMetadataLine(term) || isAdviceOrQuestion(clean)) {
    return null;
  }

  return {
    explanation,
    term,
  };
}

function getMedicalTermCards({
  report,
  result,
  sectionContent,
}: {
  report: string;
  result: string;
  sectionContent?: string;
}) {
  const source = `${report}\n${result}`.toLowerCase();
  const cards: MedicalTermCard[] = [];
  const seen = new Set<string>();

  getMarkdownListItems(sectionContent ?? "").forEach((item) => {
    const parsed = parseMedicalTermItem(item);

    if (!parsed) {
      return;
    }

    const normalizedTerm = parsed.term.toLowerCase();

    if (!sourceContainsTerm(source, parsed.term) || seen.has(normalizedTerm)) {
      return;
    }

    cards.push(parsed);
    seen.add(normalizedTerm);
  });

  knownMedicalTerms.forEach((term) => {
    const normalizedTerm = term.term.toLowerCase();

    if (!seen.has(normalizedTerm) && sourceContainsTerm(source, term.term)) {
      cards.push(term);
      seen.add(normalizedTerm);
    }
  });

  return cards.slice(0, 10);
}

function getShortSummary(value: string, fallback: string) {
  const sentences = splitSentences(stripMarkdown(value));
  const summary = sentences.slice(0, 2).join(" ");

  return summary || stripMarkdown(value) || fallback;
}

function formatGeneratedAt(value: Date | null, language: ReportLanguage) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat(language === "kannada" ? "kn-IN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function inferRiskLevel(value: string): RiskLevel {
  const normalized = stripMarkdown(value).toLowerCase();

  if (
    /follow up|follow-up|review|repeat|monitor|consult|refer|recommended|recheck|urgent|severe|critical|fracture|marked|emergency|ತುರ್ತು|ಗಂಭೀರ|ಮುಂದಿನ ಪರಿಶೀಲನೆ/.test(
      normalized
    )
  ) {
    return "followUp";
  }

  if (
    /attention needed|slightly abnormal|abnormal|elevated|low|high|risk|tear|deficiency|diabetes|cholesterol|anemia|effusion|myopia|hyperopia|astigmatism|ಗಮನ|ಅಸಾಮಾನ್ಯ|ಕಡಿಮೆ|ಹೆಚ್ಚು|ಅಪಾಯ/.test(
      normalized
    )
  ) {
    return "attention";
  }

  return "normal";
}

function getRiskPriority(level: RiskLevel) {
  return {
    normal: 0,
    attention: 1,
    followUp: 2,
  }[level];
}

function getHighestRisk(findings: FindingCard[], fallbackText: string) {
  return findings.reduce<RiskLevel>(
    (highest, finding) =>
      getRiskPriority(finding.status) > getRiskPriority(highest)
        ? finding.status
        : highest,
    inferRiskLevel(fallbackText)
  );
}

function getStatusLabel(level: RiskLevel, language: ReportLanguage) {
  return uiCopy[language][level];
}

function getStatusClasses(level: RiskLevel) {
  return {
    attention: "border-yellow-200 bg-yellow-50 text-yellow-800",
    followUp: "border-blue-200 bg-blue-50 text-blue-700",
    normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[level];
}

function isMetadataLine(value: string) {
  return /^(patient\s*name|name|age|gender|sex|date|doctor|doctor\s*name|doctor\s*notes?|clinical\s*notes?|notes?|dr\.?|physician|license|licence|registration|reg\.?\s*no|report\s*(id|no|number|date|metadata)|metadata|uhid|mrn|hospital|clinic|address|phone|mobile|email|ref(?:erred)?\s*by|sample\s*(id|date|time)|collected|received|printed)\b/i.test(
    stripMarkdown(value)
  );
}

function isAdviceOrQuestion(value: string) {
  const normalized = stripMarkdown(value).toLowerCase();

  if (/^follow[-\s]?up recommended\s*[:\-–—]/.test(normalized)) {
    return false;
  }

  return (
    normalized.endsWith("?") ||
    /^(ask|question|consult|discuss|follow up|follow-up|repeat|recheck|monitor|recommend|advice|advise|please|should|consider|talk to|visit|seek)\b/.test(
      normalized
    ) ||
    /\b(ask your doctor|questions? to ask|consult your doctor|medical advice|treatment|lifestyle|dietary changes)\b/.test(
      normalized
    )
  );
}

function isClinicalFinding(value: string) {
  const normalized = stripMarkdown(value).toLowerCase();

  if (!normalized || isMetadataLine(normalized) || isAdviceOrQuestion(normalized)) {
    return false;
  }

  return /(?:\b(low|high|elevated|reduced|mild|moderate|severe|abnormal|normal|positive|negative|tear|effusion|deficiency|anemia|myopia|hyperopia|astigmatism|acuity|pressure|improves?|correction|fracture|lesion|opacity|infection|inflammation|diabetes|cholesterol|ferritin|hemoglobin|platelets|wbc|ldl|hdl|hba1c|triglycerides)\b|\d+(?:\.\d+)?\s*(?:g\/dl|ng\/ml|mg\/dl|%|mmhg|d|diopters?|cells|\/?mcL|fL)|6\/\d+|20\/\d+)/i.test(
    normalized
  );
}

function cleanFindingExplanation(value: string, name: string) {
  return stripMarkdown(value)
    .replace(name, "")
    .replace(/^[:\-–—\s]+/, "")
    .replace(
      /^(normal|slightly abnormal|significantly abnormal|attention needed|follow[-\s]?up recommended|ಸಾಮಾನ್ಯ|ಗಮನ ಅಗತ್ಯ|ಮುಂದಿನ ಪರಿಶೀಲನೆ ಶಿಫಾರಸು)\s*[:\-–—]?\s*/i,
      ""
    )
    .trim();
}

function cleanFindingText(value: string) {
  return stripMarkdown(value)
    .replace(
      /^(normal|attention needed|follow[-\s]?up recommended|slightly abnormal|significantly abnormal|ಸಾಮಾನ್ಯ|ಗಮನ ಅಗತ್ಯ|ಮುಂದಿನ ಪರಿಶೀಲನೆ ಶಿಫಾರಸು)\s*[:\-–—]\s*/i,
      ""
    )
    .replace(/^(finding|finding name|clinical finding)\s*[:\-–—]\s*/i, "")
    .trim();
}

function getFindingCards(items: string[], language: ReportLanguage) {
  return items.filter(isClinicalFinding).slice(0, 6).map<FindingCard>((item, index) => {
    const clean = cleanFindingText(item);
    const split = clean.split(/[:–—-]/);
    const nameCandidate = split[0]?.trim();
    const hasReadableName =
      !!nameCandidate && nameCandidate.length >= 3 && nameCandidate.length <= 64;
    const name = hasReadableName
      ? nameCandidate
      : clean || `${uiCopy[language].fallbackFinding} ${index + 1}`;
    const explanation =
      cleanFindingExplanation(clean, name) || clean;

    return {
      explanation,
      name,
      status: inferRiskLevel(item),
    };
  });
}

function getQuestionItems(markdownItems: string[], fallback: string[]) {
  return (markdownItems.length > 0 ? markdownItems : fallback)
    .map((question) => stripMarkdown(question))
    .filter(Boolean)
    .slice(0, 6);
}

function parseMeasurementValue(value: string) {
  const trimmed = stripMarkdown(value).replace(/^[:\-–—\s]+/, "");
  const numericMatch = trimmed.match(
    /^([<>]?\d[\d,]*(?:\.\d+)?(?:\s*(?:-|\/|to)\s*[<>]?\d[\d,]*(?:\.\d+)?)?)\s*([^,;()–—-]*)(.*)$/i
  );

  if (!numericMatch) {
    return {
      explanation: trimmed,
      unit: "",
      value: trimmed,
    };
  }

  return {
    explanation: numericMatch[3]
      .replace(/^[-–—,;()\s]+/, "")
      .replace(/[()]/g, "")
      .trim(),
    unit: numericMatch[2].trim(),
    value: numericMatch[1].trim(),
  };
}

function getMeasurementCards({
  language,
  report,
  result,
  sectionContent,
}: {
  language: ReportLanguage;
  report: string;
  result: string;
  sectionContent?: string;
}) {
  const skippedNames = new Set([
    "age",
    "date",
    "doctor",
    "doctor name",
    "findings",
    "gender",
    "impression",
    "license number",
    "medical report",
    "patient name",
    "notes",
    "report",
    "report date",
  ]);
  const sourceLines = sectionContent
    ? getMarkdownListItems(sectionContent)
    : report.split(/\r?\n/);
  const cards: MeasurementCard[] = [];
  const seen = new Set<string>();

  sourceLines.forEach((sourceLine) => {
    const clean = stripMarkdown(sourceLine);
    const match = clean.match(/^([^:–—-]{2,72})[:–—-]\s*(.+)$/);

    if (!match) {
      return;
    }

    const name = match[1].replace(/\s+/g, " ").trim();
    const normalizedName = name.toLowerCase();
    const rawValue = match[2].trim();

    if (
      skippedNames.has(normalizedName) ||
      isMetadataLine(name) ||
      (!sectionContent && !/\d/.test(rawValue))
    ) {
      return;
    }

    if (seen.has(normalizedName)) {
      return;
    }

    const parsed = parseMeasurementValue(rawValue);
    const explanation =
      parsed.explanation ||
      getShortSummary(`${name}: ${rawValue}`, uiCopy[language].noSection);

    cards.push({
      explanation,
      name,
      status: inferRiskLevel(`${name}: ${rawValue}\n${result}`),
      unit: parsed.unit,
      value: parsed.value,
    });
    seen.add(normalizedName);
  });

  return cards.slice(0, 8);
}

function getReportType(report: string, result: string): ReportType {
  const combined = `${report}\n${result}`.toLowerCase();

  if (/\b(eye|vision|optometry|ophthalmology|glasses|spectacle|sphere|sph|cylinder|cyl|axis|od|os)\b/.test(combined)) {
    return "Eye Report";
  }

  if (/\b(cbc|hemoglobin|haemoglobin|platelets|wbc|rbc|blood|glucose|hba1c|cholesterol|triglycerides|ferritin)\b/.test(combined)) {
    return "Blood Test";
  }

  if (/\bmri\b|magnetic resonance/.test(combined)) {
    return "MRI";
  }

  if (/\bct\b|computed tomography/.test(combined)) {
    return "CT Scan";
  }

  if (/\bx[-\s]?ray\b|radiograph/.test(combined)) {
    return "X-Ray";
  }

  if (/\bultrasound\b|sonography|usg\b/.test(combined)) {
    return "Ultrasound";
  }

  if (/\becg\b|\bekg\b|electrocardiogram/.test(combined)) {
    return "ECG";
  }

  return "Other";
}

function getEyeLine(lines: string[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line.toLowerCase())) ?? "";
}

function extractOpticalValue(line: string, labels: string[]) {
  for (const label of labels) {
    const match = line.match(
      new RegExp(`\\b${label}\\b\\s*(?:power)?\\s*[:=]?\\s*([+-]?\\d+(?:\\.\\d+)?)`, "i")
    );

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function formatOpticalValue(value?: string) {
  if (!value) {
    return "";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return value;
  }

  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}`;
}

function getPrescriptionDetails(report: string, result: string) {
  if (getReportType(report, result) !== "Eye Report") {
    return [];
  }

  const lines = `${report}\n${result}`
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line))
    .filter(Boolean);
  const rightLine = getEyeLine(lines, /\b(right eye|re|od)\b/);
  const leftLine = getEyeLine(lines, /\b(left eye|le|os)\b/);
  const details: PrescriptionDetail[] = [
    {
      axis: extractOpticalValue(rightLine, ["axis", "ax"]),
      cylinder: formatOpticalValue(extractOpticalValue(rightLine, ["cylinder", "cyl"])),
      eye: "Right Eye",
      power: formatOpticalValue(
        extractOpticalValue(rightLine, ["sphere", "sph", "power"])
      ),
    },
    {
      axis: extractOpticalValue(leftLine, ["axis", "ax"]),
      cylinder: formatOpticalValue(extractOpticalValue(leftLine, ["cylinder", "cyl"])),
      eye: "Left Eye",
      power: formatOpticalValue(
        extractOpticalValue(leftLine, ["sphere", "sph", "power"])
      ),
    },
  ];

  return details.filter(
    (detail) => detail.power || detail.cylinder || detail.axis
  );
}

function getModeInstruction(mode: ExplanationMode) {
  return {
    adult:
      "Adult mode: Use the current MediSpeak behavior. Keep the explanation balanced, clear, and patient-friendly with enough detail for an adult reader.",
    child:
      "Child mode for a 10-year-old: Use very simple language, very short sentences, no medical jargon, and simple examples when helpful.",
    senior:
      "Senior citizen mode: Use simple, patient language. Explain medical terms clearly, avoid abbreviations where possible, focus on practical everyday meaning, and make the explanation easy to read and reassuring.",
  }[mode];
}

function buildReportRequestText(report: string, mode: ExplanationMode) {
  return `${getModeInstruction(mode)}

Please adapt the entire explanation for this selected audience while preserving medical accuracy and educational-only framing.

Medical report:
${report}`;
}

function buildKannadaRequestText({
  englishReport,
  mode,
  report,
}: {
  englishReport: string;
  mode: ExplanationMode;
  report: string;
}) {
  return `Translate and re-explain the following MediSpeak patient report entirely in Kannada for a Kannada-speaking patient.

${getModeInstruction(mode)}

Requirements:
- Write every section body in natural Kannada.
- Keep the same medical meaning.
- Keep it concise and patient-friendly.
- Preserve the same machine-readable Markdown headings exactly as English headings so the UI can organize sections:
  ## Executive Summary
  ## Key Measurements
  ## Important Findings
  ## Medical Terms Explained
  ## Questions To Ask Your Doctor
- Do not add any extra sections beyond the listed headings.
- Do not leave English explanatory labels inside the report content unless they are part of the original medical value or abbreviation.

Original medical report:
${report}

English patient report:
${englishReport}`;
}

function MarkdownContent({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h4
            className={`font-semibold tracking-tight text-slate-950 ${
              compact ? "mb-2 mt-1 text-base" : "mb-3 mt-7 text-2xl first:mt-0"
            }`}
          >
            {children}
          </h4>
        ),
        h2: ({ children }) => (
          <h4
            className={`font-semibold tracking-tight text-slate-950 ${
              compact ? "mb-2 mt-1 text-base" : "mb-3 mt-6 text-xl first:mt-0"
            }`}
          >
            {children}
          </h4>
        ),
        h3: ({ children }) => (
          <h5
            className={`font-semibold tracking-tight text-slate-950 ${
              compact ? "mb-2 mt-1 text-sm" : "mb-2 mt-5 text-lg first:mt-0"
            }`}
          >
            {children}
          </h5>
        ),
        p: ({ children }) => (
          <p
            className={
              compact
                ? "text-sm leading-6 text-slate-700"
                : "my-3 text-[15px] leading-8 text-slate-700 first:mt-0 last:mb-0"
            }
          >
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-950">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="font-medium text-slate-800">{children}</em>
        ),
        ul: ({ children }) => (
          <ul
            className={
              compact
                ? "ml-5 list-disc space-y-1 marker:text-blue-500"
                : "my-4 ml-5 list-disc space-y-2 marker:text-blue-500"
            }
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={
              compact
                ? "ml-5 list-decimal space-y-1 marker:font-semibold marker:text-blue-600"
                : "my-4 ml-5 list-decimal space-y-2 marker:font-semibold marker:text-blue-600"
            }
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 text-sm leading-7 text-slate-700 sm:text-[15px]">
            {children}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 rounded-lg border-l-4 border-teal-400 bg-teal-50 px-4 py-3 text-slate-700">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[0.9em] font-semibold text-blue-700">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a
            className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-blue-900"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function LanguageToggle({
  isLoading,
  language,
  onChange,
}: {
  isLoading: boolean;
  language: ReportLanguage;
  onChange: (nextLanguage: ReportLanguage) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-blue-100 bg-white p-1 shadow-sm shadow-slate-950/5">
      {(["english", "kannada"] as const).map((option) => {
        const isActive = language === option;

        return (
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/15"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
            disabled={isLoading && option === "kannada"}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {uiCopy[language].languageNames[option]}
          </button>
        );
      })}
    </div>
  );
}

function ExplanationModePicker({
  currentMode,
  disabled,
  language,
  onChange,
}: {
  currentMode: ExplanationMode;
  disabled: boolean;
  language: ReportLanguage;
  onChange: (mode: ExplanationMode) => void;
}) {
  const copy = uiCopy[language];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {copy.modeLabel}
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            {copy.modeHelp}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {explanationModeOptions.map((mode) => {
            const isActive = currentMode === mode;

            return (
              <button
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/15"
                    : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
                disabled={disabled}
                key={mode}
                onClick={() => onChange(mode)}
                type="button"
              >
                {
                  {
                    adult: copy.adultMode,
                    child: copy.childMode,
                    senior: copy.seniorMode,
                  }[mode]
                }
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExecutiveSummaryPanel({
  generatedAt,
  isTranslating,
  language,
  onLanguageChange,
  mode,
  reportType,
  riskLevel,
  summary,
  topFindings,
  translationError,
}: {
  generatedAt: Date | null;
  isTranslating: boolean;
  language: ReportLanguage;
  mode: ExplanationMode;
  onLanguageChange: (nextLanguage: ReportLanguage) => void;
  reportType: ReportType;
  riskLevel: RiskLevel;
  summary: string;
  topFindings: FindingCard[];
  translationError: string;
}) {
  const copy = uiCopy[language];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            {copy.overallSummary}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {copy.keyFindings}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 sm:justify-end">
            <span className="rounded-full border border-blue-100 bg-white px-3 py-1">
              {copy.reportType}: {copy.reportTypeNames[reportType]}
            </span>
            <span className="rounded-full border border-blue-100 bg-white px-3 py-1">
              {copy.language}: {copy.languageNames[language]}
            </span>
            <span className="rounded-full border border-blue-100 bg-white px-3 py-1">
              {copy.mode}: {copy.modeNames[mode]}
            </span>
          </div>
          <LanguageToggle
            isLoading={isTranslating}
            language={language}
            onChange={onLanguageChange}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <p className="rounded-lg border border-white/80 bg-white/85 p-4 text-[15px] leading-7 text-slate-700 shadow-sm shadow-slate-950/5">
          {summary}
        </p>
        <div className="grid gap-2 sm:min-w-[190px]">
          <div className="rounded-lg border border-white/80 bg-white/85 p-3 shadow-sm shadow-slate-950/5">
            <p className="text-xs font-semibold text-slate-500">
              {copy.riskLevel}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusClasses(
                riskLevel
              )}`}
            >
              {getStatusLabel(riskLevel, language)}
            </span>
          </div>
          <div className="rounded-lg border border-white/80 bg-white/85 p-3 shadow-sm shadow-slate-950/5">
            <p className="text-xs font-semibold text-slate-500">
              {copy.generated}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatGeneratedAt(generatedAt, language)}
            </p>
          </div>
        </div>
      </div>

      {topFindings.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {copy.keyFindings}
          </p>
          <div className="mt-2 grid gap-2">
            {topFindings.map((finding, index) => (
              <div
                className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm shadow-slate-950/5"
                key={`${finding.name}-${index}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-950">
                    {finding.name}
                  </p>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      finding.status
                    )}`}
                  >
                    {getStatusLabel(finding.status, language)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {finding.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isTranslating ? (
        <p className="mt-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-2 text-sm font-semibold text-blue-700">
          {copy.preparingKannada}
        </p>
      ) : null}

      {translationError ? (
        <p className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-800">
          {copy.translationError}
        </p>
      ) : null}
    </div>
  );
}

function AccordionSection({
  action,
  children,
  isAlwaysOpen = false,
  isOpen,
  language,
  onToggle,
  sectionKey,
}: {
  action?: ReactNode;
  children: ReactNode;
  isAlwaysOpen?: boolean;
  isOpen: boolean;
  language: ReportLanguage;
  onToggle?: () => void;
  sectionKey: DetailSectionKey;
}) {
  const meta = uiCopy[language].sections[sectionKey];
  const panelIsOpen = isAlwaysOpen || isOpen;
  const headerContent = (
    <>
      <span className="flex min-w-0 items-start gap-3">
        <span className="section-icon bg-blue-600 text-white shadow-sm shadow-blue-600/15">
          {meta.icon}
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight text-slate-950">
            {meta.title}
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-500">
            {meta.description}
          </span>
        </span>
      </span>
      {action ? (
        <span className="shrink-0">{action}</span>
      ) : (
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-blue-700 transition-transform duration-300 ${
            panelIsOpen ? "rotate-45" : ""
          }`}
          aria-hidden="true"
        >
          +
        </span>
      )}
    </>
  );

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      {isAlwaysOpen ? (
        <div
          aria-expanded="true"
          className="flex w-full flex-col gap-3 px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
        >
          {headerContent}
        </div>
      ) : (
        <button
          aria-expanded={panelIsOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-blue-50/45 focus:outline-none focus:ring-4 focus:ring-blue-100"
          onClick={onToggle}
          type="button"
        >
          {headerContent}
        </button>
      )}
      <div className="accordion-panel" data-open={panelIsOpen}>
        <div>
          <div className="border-t border-slate-100 px-4 py-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function FindingRows({
  findings,
  language,
}: {
  findings: FindingCard[];
  language: ReportLanguage;
}) {
  return (
    <div className="grid gap-3">
      {findings.map((finding, index) => (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          key={`${finding.name}-${index}`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-semibold text-slate-950">
              {finding.name}
            </p>
            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                finding.status
              )}`}
            >
              {getStatusLabel(finding.status, language)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {finding.explanation}
          </p>
        </div>
      ))}
    </div>
  );
}

function MarkdownPanel({ content }: { content: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <MarkdownContent content={content} />
    </div>
  );
}

function MeasurementCards({
  fallbackContent,
  language,
  measurements,
}: {
  fallbackContent: string;
  language: ReportLanguage;
  measurements: MeasurementCard[];
}) {
  if (measurements.length === 0) {
    return <MarkdownPanel content={fallbackContent || uiCopy[language].noSection} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {measurements.map((measurement, index) => (
        <div
          className="rounded-lg border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-teal-50/60 p-4 shadow-sm shadow-blue-950/5"
          key={`${measurement.name}-${index}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">
              {measurement.name}
            </p>
            <span
              className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                measurement.status
              )}`}
            >
              {getStatusLabel(measurement.status, language)}
            </span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {measurement.value}
            </p>
            {measurement.unit ? (
              <p className="pb-1 text-sm font-semibold text-slate-500">
                {measurement.unit}
              </p>
            ) : null}
          </div>
          {measurement.explanation ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {measurement.explanation}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PrescriptionSection({ details }: { details: PrescriptionDetail[] }) {
  if (details.length === 0) {
    return null;
  }

  const rightEye = details.find((detail) => detail.eye === "Right Eye");
  const leftEye = details.find((detail) => detail.eye === "Left Eye");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <p className="text-sm font-semibold text-blue-700">
        👓 Glasses Prescription
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {rightEye?.power ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Right Eye Power
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {rightEye.power}
            </p>
          </div>
        ) : null}
        {leftEye?.power ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Left Eye Power
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {leftEye.power}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {details.map((detail) => (
          <div
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
            key={detail.eye}
          >
            <p className="text-sm font-semibold text-slate-950">{detail.eye}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              {detail.cylinder ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium text-slate-500">Cylinder</dt>
                  <dd className="font-semibold text-slate-900">
                    {detail.cylinder}
                  </dd>
                </div>
              ) : null}
              {detail.axis ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium text-slate-500">Axis</dt>
                  <dd className="font-semibold text-slate-900">
                    {detail.axis}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function TermCards({
  language,
  terms,
}: {
  language: ReportLanguage;
  terms: MedicalTermCard[];
}) {
  if (terms.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-sm font-semibold text-slate-700">
          {uiCopy[language].noMedicalTerms}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {terms.map((item) => (
        <div
          className="rounded-lg border border-teal-100 bg-teal-50/55 p-4"
          key={item.term}
        >
          <p className="text-sm font-semibold text-slate-950">{item.term}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {item.explanation}
          </p>
        </div>
      ))}
    </div>
  );
}

function QuestionCards({
  copiedQuestion,
  language,
  onCopy,
  questions,
}: {
  copiedQuestion: string;
  language: ReportLanguage;
  onCopy: (question: string) => void;
  questions: string[];
}) {
  const copy = uiCopy[language];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {questions.map((question, index) => {
        const isCopied = copiedQuestion === question;

        return (
          <div
            className="group flex rounded-lg border border-sky-100 bg-sky-50/55 p-2 transition hover:border-sky-200 hover:bg-white hover:shadow-sm hover:shadow-slate-950/5"
            key={`${question}-${index}`}
          >
            <button
              className="flex min-h-[88px] flex-1 items-start rounded-md px-3 py-2 text-left text-sm font-semibold leading-6 text-slate-800 transition focus:outline-none focus:ring-4 focus:ring-sky-100"
              onClick={() => onCopy(question)}
              type="button"
            >
              <span>
                {question}
              </span>
            </button>
            <button
              aria-label={`${copy.copy}: ${question}`}
              className="m-2 h-fit shrink-0 rounded-md border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
              onClick={() => onCopy(question)}
              type="button"
            >
              {isCopied ? copy.copied : copy.copy}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [copiedQuestion, setCopiedQuestion] = useState("");
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [kannadaError, setKannadaError] = useState("");
  const [kannadaResult, setKannadaResult] = useState("");
  const [kannadaStatus, setKannadaStatus] =
    useState<AnalysisStatus>("idle");
  const [language, setLanguage] = useState<ReportLanguage>("english");
  const [explanationMode, setExplanationMode] =
    useState<ExplanationMode>("adult");
  const [openSections, setOpenSections] = useState<
    Partial<Record<DetailSectionKey, boolean>>
  >({});

  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const isLoading = status === "loading";
  const activeSample = sampleReports.find((sample) => sample.report === text);
  const activeResult = language === "kannada" ? kannadaResult : result;
  const wordCount = useMemo(
    () => (trimmedText ? trimmedText.split(/\s+/).length : 0),
    [trimmedText]
  );
  const resultWordCount = useMemo(
    () => (activeResult.trim() ? activeResult.trim().split(/\s+/).length : 0),
    [activeResult]
  );
  const englishReportSections = useMemo(
    () => getReportSections(result),
    [result]
  );
  const reportSections = useMemo(
    () => getReportSections(activeResult),
    [activeResult]
  );
  const reportType = useMemo(
    () => getReportType(text, activeResult || result),
    [activeResult, result, text]
  );
  const prescriptionDetails = useMemo(
    () => getPrescriptionDetails(text, activeResult || result),
    [activeResult, result, text]
  );
  const fallbackImportantFindings = useMemo(
    () => (activeResult ? getImportantFindings(text, activeResult) : []),
    [text, activeResult]
  );
  const plainEnglishSummary = useMemo(
    () => getPlainEnglishSummary(activeResult),
    [activeResult]
  );
  const summaryContent =
    language === "kannada" &&
    !kannadaResult &&
    englishReportSections.kannadaTranslation
      ? englishReportSections.kannadaTranslation
      : reportSections.executiveSummary ?? plainEnglishSummary;
  const executiveSummary = useMemo(
    () => getShortSummary(summaryContent, uiCopy[language].fallbackSummary),
    [language, summaryContent]
  );
  const importantFindingItems = useMemo(
    () =>
      reportSections.importantFindings
        ? getMarkdownListItems(reportSections.importantFindings)
        : fallbackImportantFindings,
    [fallbackImportantFindings, reportSections.importantFindings]
  );
  const findingCards = useMemo(
    () => getFindingCards(importantFindingItems, language),
    [importantFindingItems, language]
  );
  const topFindings = useMemo(() => {
    return findingCards.slice(0, 3);
  }, [findingCards]);
  const overallRisk = useMemo(
    () => getHighestRisk(findingCards, `${activeResult}\n${summaryContent}`),
    [activeResult, findingCards, summaryContent]
  );
  const measurementCards = useMemo(
    () =>
      getMeasurementCards({
        language,
        report: activeResult ? text : "",
        result: activeResult,
        sectionContent: reportSections.keyMeasurements,
      }),
    [activeResult, language, reportSections.keyMeasurements, text]
  );
  const shouldShowKeyMeasurements = measurementCards.length > 0;
  const shouldShowImportantFindings = findingCards.length > 0;
  const medicalTermCards = useMemo(
    () =>
      getMedicalTermCards({
        report: text,
        result: activeResult || result,
        sectionContent: reportSections.medicalTermsExplained,
      }),
    [activeResult, reportSections.medicalTermsExplained, result, text]
  );
  const doctorQuestions = useMemo(
    () => (activeResult ? getDoctorQuestions(activeResult) : []),
    [activeResult]
  );
  const doctorQuestionItems = useMemo(
    () =>
      getQuestionItems(
        reportSections.questionsToAskYourDoctor
          ? getMarkdownListItems(reportSections.questionsToAskYourDoctor)
          : [],
        doctorQuestions
      ),
    [doctorQuestions, reportSections.questionsToAskYourDoctor]
  );
  const shouldShowDoctorQuestions = doctorQuestionItems.length > 0;

  const statusLabel =
    status === "success"
      ? uiCopy[language].statusReady
      : status === "loading"
        ? uiCopy[language].analyzingReport
        : status === "error"
          ? uiCopy[language].statusAttention
          : uiCopy[language].readyStatus;

  const resetReportViewer = (nextLanguage: ReportLanguage = language) => {
    setCopiedQuestion("");
    setGeneratedAt(null);
    setKannadaError("");
    setKannadaResult("");
    setKannadaStatus("idle");
    setLanguage(nextLanguage);
    setOpenSections({});
  };

  const loadSample = (sample: SampleReport) => {
    setText(sample.report);
    setResult("");
    setError("");
    setStatus("idle");
    resetReportViewer("english");
  };

  const toggleSection = (sectionKey: DetailSectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  const copyQuestion = async (question: string) => {
    const copyWithFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = question;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error("Clipboard copy failed.");
      }
    };

    try {
      let didCopy = false;

      try {
        copyWithFallback();
        didCopy = true;
      } catch {
        didCopy = false;
      }

      if (!didCopy) {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard copy failed.");
        }

        await navigator.clipboard.writeText(question);
      }

      setCopiedQuestion(question);
      window.setTimeout(() => {
        setCopiedQuestion((current) => (current === question ? "" : current));
      }, 1600);
    } catch {
      setCopiedQuestion("");
    }
  };

  const translateReportToKannada = async (
    baseResult = result,
    mode = explanationMode
  ) => {
    if (
      !baseResult ||
      kannadaStatus === "loading" ||
      (baseResult === result && Boolean(kannadaResult))
    ) {
      return;
    }

    setKannadaStatus("loading");
    setKannadaError("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: buildKannadaRequestText({
            englishReport: baseResult,
            mode,
            report: text,
          }),
        }),
      });

      const data = (await response.json()) as ExplainResponse;

      if (!response.ok) {
        throw new Error(data.error || "Kannada translation failed.");
      }

      if (!data.result) {
        throw new Error("No Kannada translation was returned.");
      }

      setKannadaResult(data.result);
      setKannadaStatus("success");
    } catch (caughtError) {
      setKannadaError(
        caughtError instanceof Error
          ? caughtError.message
          : "Kannada translation failed."
      );
      setKannadaStatus("error");
    }
  };

  const changeLanguage = (nextLanguage: ReportLanguage) => {
    setLanguage(nextLanguage);

    if (nextLanguage === "kannada") {
      void translateReportToKannada(result, explanationMode);
    }
  };

  const explainReport = async (
    event?: FormEvent<HTMLFormElement>,
    mode = explanationMode,
    targetLanguage = language
  ) => {
    event?.preventDefault();

    if (!hasText) {
      setError(uiCopy[language].pasteBeforeAnalyze);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setResult("");
    resetReportViewer(targetLanguage);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: buildReportRequestText(trimmedText, mode),
        }),
      });

      const data = (await response.json()) as ExplainResponse;

      if (!response.ok) {
        throw new Error(data.error || "MediSpeak could not analyze this report.");
      }

      if (!data.result) {
        throw new Error("No explanation was returned. Please try again.");
      }

      setResult(data.result);
      setGeneratedAt(new Date());

      if (targetLanguage === "kannada") {
        await translateReportToKannada(data.result, mode);
      }

      setStatus("success");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while analyzing this report."
      );
      setStatus("error");
    }
  };

  const changeExplanationMode = (nextMode: ExplanationMode) => {
    if (nextMode === explanationMode) {
      return;
    }

    setExplanationMode(nextMode);

    if (result && hasText && status !== "loading") {
      void explainReport(undefined, nextMode, language);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6fbff] text-slate-950">
      <div className="medical-backdrop pointer-events-none fixed inset-0" />
      <div className="medical-mesh pointer-events-none fixed inset-0 opacity-45" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1360px] flex-col gap-3 px-4 py-4 sm:px-5 lg:px-6">
        <header className="health-glass flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="medical-logo relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-600/15">
              <span className="absolute h-6 w-2 rounded-full bg-white" />
              <span className="absolute h-2 w-6 rounded-full bg-white" />
              <span className="sr-only">MediSpeak</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-slate-950">
                MediSpeak
              </p>
              <p className="truncate text-sm font-medium text-slate-500">
                {uiCopy[language].outputEyebrow}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            {uiCopy[language].secureWorkspace}
          </div>
        </header>

        <section className="health-glass relative overflow-hidden px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)] lg:items-center">
            <div className="relative">
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm shadow-blue-950/5">
                <span className="medical-pulse-dot" />
                {uiCopy[language].trustedExplainer}
              </div>
              <h1 className="max-w-3xl text-balance text-2xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                {uiCopy[language].patientReadyTitle}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {uiCopy[language].pasteHelper}
              </p>
            </div>

            <div className="relative hidden gap-2 sm:grid sm:grid-cols-3">
              <div className="care-step border-blue-100 bg-blue-50/80">
                <span className="care-icon bg-blue-600 text-white">+</span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {uiCopy[language].carePaste}
                  </p>
                  <p className="text-xs text-slate-600">
                    {uiCopy[language].carePasteHelp}
                  </p>
                </div>
              </div>
              <div className="care-step border-teal-100 bg-teal-50/80">
                <span className="care-icon bg-teal-600 text-white">ECG</span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {uiCopy[language].careAi}
                  </p>
                  <p className="text-xs text-slate-600">
                    {uiCopy[language].careAiHelp}
                  </p>
                </div>
              </div>
              <div className="care-step border-emerald-100 bg-emerald-50/80">
                <span className="care-icon bg-emerald-600 text-white">✓</span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {uiCopy[language].careVisit}
                  </p>
                  <p className="text-xs text-slate-600">
                    {uiCopy[language].careVisitHelp}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <form
          className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]"
          onSubmit={explainReport}
        >
          <section className="health-card flex min-h-[560px] flex-col p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <label
                  className="text-sm font-semibold text-blue-700"
                  htmlFor="medical-report"
                >
                  {uiCopy[language].inputLabel}
                </label>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {activeSample
                    ? `${activeSample.title} ${uiCopy[language].activeSampleLoaded}`
                    : uiCopy[language].inputFallback}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm shadow-slate-950/5">
                  <p className="text-lg font-semibold text-slate-950">
                    {wordCount}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {uiCopy[language].words}
                  </p>
                </div>
                <button
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1463d8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(20,99,216,0.18)] transition duration-200 hover:bg-[#0f56bf] hover:shadow-[0_12px_26px_rgba(20,99,216,0.22)] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
                  disabled={!hasText || isLoading}
                  type="submit"
                >
                  {isLoading ? uiCopy[language].analyzing : uiCopy[language].analyze}
                  {!isLoading ? <span aria-hidden="true">-&gt;</span> : null}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {sampleReports.map((sample) => {
                const isActive = activeSample?.title === sample.title;

                return (
                  <button
                    className={`min-h-[76px] rounded-lg border px-3.5 py-3 text-left transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isActive
                        ? "border-blue-300 bg-blue-50 shadow-[0_8px_18px_rgba(37,99,235,0.1)]"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm hover:shadow-blue-950/5"
                    }`}
                    disabled={isLoading}
                    key={sample.title}
                    onClick={() => loadSample(sample)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-slate-950">
                      {sample.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                      {(uiCopy[language].sampleLabels as Record<string, string>)[
                        sample.label
                      ] ?? sample.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <textarea
              aria-describedby="report-helper"
              className="mt-4 min-h-[340px] flex-1 resize-none rounded-lg border border-slate-200 bg-white p-4 text-[15px] leading-7 text-slate-800 shadow-inner shadow-slate-100 outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:min-h-[420px]"
              id="medical-report"
              placeholder={uiCopy[language].inputPlaceholder}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) {
                  setError("");
                  setStatus(result ? "success" : "idle");
                }
              }}
            />

            <div
              className="mt-3 flex flex-col gap-2 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"
              id="report-helper"
            >
              <span>
                {text.length} {uiCopy[language].characters}
              </span>
              <span>{uiCopy[language].doctorDisclaimer}</span>
            </div>

            {error ? (
              <p
                aria-live="polite"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            ) : null}

            <button
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-[#1463d8] px-5 py-4 text-base font-semibold text-white shadow-[0_12px_26px_rgba(20,99,216,0.2)] transition duration-200 hover:bg-[#0f56bf] hover:shadow-[0_14px_30px_rgba(20,99,216,0.24)] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              disabled={!hasText || isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  {uiCopy[language].analyzingReport}
                </>
              ) : (
                <>
                  {uiCopy[language].analyzeReport}
                  <span aria-hidden="true">-&gt;</span>
                </>
              )}
            </button>
          </section>

          <section className="health-card flex min-h-[560px] flex-col overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-700">
                  {uiCopy[language].outputEyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {uiCopy[language].outputTitle}
                </h2>
              </div>
              <div
                className={`rounded-lg border px-3 py-2 text-right text-xs font-medium ${
                  status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : status === "loading"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : status === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {statusLabel}
              </div>
            </div>

            <div className="mt-4">
              <ExplanationModePicker
                currentMode={explanationMode}
                disabled={isLoading || kannadaStatus === "loading"}
                language={language}
                onChange={changeExplanationMode}
              />
            </div>

            <div
              aria-live="polite"
              className="mt-4 flex min-h-[430px] flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner shadow-blue-50 lg:min-h-[520px]"
            >
              {isLoading ? (
                <div className="w-full p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="relative flex size-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/15">
                      <span className="absolute h-7 w-2 rounded-full bg-white" />
                      <span className="absolute h-2 w-7 rounded-full bg-white" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-slate-950">
                        {uiCopy[language].preparingReport}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {uiCopy[language].preparingReportHelp}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {loadingSteps[language].map((step, index) => (
                      <div
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-950/5"
                        key={step}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">
                            {step}
                          </span>
                          <span className="text-xs font-semibold text-blue-600">
                            0{index + 1}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="loading-bar h-full rounded-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400"
                            style={{ animationDelay: `${index * 130}ms` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : result ? (
                <div className="custom-scroll w-full overflow-auto bg-slate-50/60">
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">
                          {uiCopy[language].reportReadyEyebrow}
                        </p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {uiCopy[language].reportReadyTitle}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-950/5">
                        {resultWordCount} {uiCopy[language].words}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <AccordionSection
                        isAlwaysOpen
                        isOpen
                        language={language}
                        sectionKey="executiveSummary"
                      >
                        <ExecutiveSummaryPanel
                          generatedAt={generatedAt}
                          isTranslating={
                            language === "kannada" && kannadaStatus === "loading"
                          }
                          language={language}
                          mode={explanationMode}
                          onLanguageChange={changeLanguage}
                          reportType={reportType}
                          riskLevel={overallRisk}
                          summary={executiveSummary}
                          topFindings={topFindings}
                          translationError={
                            language === "kannada" ? kannadaError : ""
                          }
                        />
                      </AccordionSection>

                      {shouldShowKeyMeasurements ? (
                        <AccordionSection
                          isOpen={!!openSections.keyMeasurements}
                          language={language}
                          onToggle={() => toggleSection("keyMeasurements")}
                          sectionKey="keyMeasurements"
                        >
                          <MeasurementCards
                            fallbackContent={reportSections.keyMeasurements ?? ""}
                            language={language}
                            measurements={measurementCards}
                          />
                        </AccordionSection>
                      ) : null}

                      <PrescriptionSection details={prescriptionDetails} />

                      {shouldShowImportantFindings ? (
                        <AccordionSection
                          isOpen={!!openSections.importantFindings}
                          language={language}
                          onToggle={() => toggleSection("importantFindings")}
                          sectionKey="importantFindings"
                        >
                          <FindingRows
                            findings={findingCards}
                            language={language}
                          />
                        </AccordionSection>
                      ) : null}

                      <AccordionSection
                        isOpen={!!openSections.medicalTermsExplained}
                        language={language}
                        onToggle={() => toggleSection("medicalTermsExplained")}
                        sectionKey="medicalTermsExplained"
                      >
                        <TermCards
                          language={language}
                          terms={medicalTermCards}
                        />
                      </AccordionSection>

                      {shouldShowDoctorQuestions ? (
                        <AccordionSection
                          isOpen={!!openSections.questionsToAskYourDoctor}
                          language={language}
                          onToggle={() =>
                            toggleSection("questionsToAskYourDoctor")
                          }
                          sectionKey="questionsToAskYourDoctor"
                        >
                          <QuestionCards
                            copiedQuestion={copiedQuestion}
                            language={language}
                            onCopy={(question) => {
                              void copyQuestion(question);
                            }}
                            questions={doctorQuestionItems}
                          />
                        </AccordionSection>
                      ) : null}

                      <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-600 shadow-sm shadow-slate-950/5">
                        {uiCopy[language].educationFooter}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center p-6 text-center">
                  <div className="mb-5 grid size-20 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 shadow-inner shadow-blue-100/80">
                    <div className="relative size-10">
                      <span className="absolute left-1/2 top-0 h-10 w-3 -translate-x-1/2 rounded-full bg-blue-600" />
                      <span className="absolute left-0 top-1/2 h-3 w-10 -translate-y-1/2 rounded-full bg-blue-600" />
                    </div>
                  </div>
                  <p className="max-w-lg text-3xl font-semibold tracking-tight text-slate-950">
                    {uiCopy[language].emptyTitle}
                  </p>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-500">
                    {uiCopy[language].modeHelp}
                  </p>
                </div>
              )}
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}

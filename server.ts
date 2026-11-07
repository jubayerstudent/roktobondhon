import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "node:crypto";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import {
  AiIdempotencyRecord,
  QuotaLedgerState,
  computePayloadFingerprint,
  finalizeAiQuotaSlot,
  getDhakaQuotaDateKey,
  getPacificQuotaDateKey,
  isValidUuidV4IdempotencyKey,
  markAiDispatching,
  reserveAiQuotaSlot,
} from "./src/utils/stage3ArchitectureLogic";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isLiveGeminiAllowed(req: Request): boolean {
  if (req.headers["x-test-dry-run"] === "true") {
    return false;
  }
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0 && key !== "MY_GEMINI_API_KEY");
}

const SYSTEM_INSTRUCTION = `You are the official AI Medical & Blood Coordination Assistant for RoktoBondhon (রক্তবন্ধন — "এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ"), a district-based digital blood donation and emergency blood assistance platform launched in Barguna District, Bangladesh (covering Barguna Sadar, Amtali, Betagi, Bamna, Patharghata, and Taltali upazilas, architected to scale to all 64 districts).

Guidelines:
1. Respond in clear, empathetic Bengali (বাংলা) by default, or in English if the user writes in English.
2. Provide accurate ABO/Rh blood group compatibility advice, donor eligibility criteria (18-60 years old, >= 48-50kg weight, >= 90 days since last donation, hemoglobin >= 12.5 g/dL), and pre/post-donation care.
3. For emergency blood requests in Barguna District, guide requesters on cross-matching at a certified hospital blood bank, preparing requisition forms, and contacting compatible donors across Barguna Sadar, Amtali, Betagi, Bamna, Patharghata, and Taltali.
4. Always remind users that RoktoBondhon connects voluntary donors and never charges money for blood, and that clinical cross-matching by a qualified medical technologist is mandatory before transfusion.`;

// In-memory rate-limiting & Stage 3 quota/idempotency state store
const ipWindowMap = new Map<string, { count: number; resetAtMs: number }>();
const activeInFlightActors = new Set<string>();
const globalLedgersByDate = new Map<string, QuotaLedgerState>();
const userLedgersByKey = new Map<string, QuotaLedgerState>();
const idempotencyRecords = new Map<string, AiIdempotencyRecord>();

function getGlobalLedger(dateKey: string): QuotaLedgerState {
  let ledger = globalLedgersByDate.get(dateKey);
  if (!ledger) {
    ledger = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 100 };
    globalLedgersByDate.set(dateKey, ledger);
  }
  return ledger;
}

function getUserLedger(actorId: string, dateKey: string): QuotaLedgerState {
  const key = `${actorId}_${dateKey}`;
  let ledger = userLedgersByKey.get(key);
  if (!ledger) {
    ledger = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 5 };
    userLedgersByKey.set(key, ledger);
  }
  return ledger;
}

function resolveActorId(req: Request): string {
  const headerActor = req.headers["x-actor-uid"];
  if (typeof headerActor === "string" && /^[a-zA-Z0-9_-]{3,128}$/.test(headerActor)) {
    return headerActor;
  }
  return req.ip || "anonymous_ip";
}

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60_000;
  const maxPerMinute = 30;

  const entry = ipWindowMap.get(ip);
  if (!entry || now >= entry.resetAtMs) {
    ipWindowMap.set(ip, { count: 1, resetAtMs: now + windowMs });
    next();
    return;
  }

  if (entry.count >= maxPerMinute) {
    res.status(429).json({
      error: "Too many requests from this IP. Please wait a moment and try again.",
    });
    return;
  }

  entry.count += 1;
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy (Cloud Run / load balancer) for accurate client IP
  app.set("trust proxy", 1);

  // Route-specific JSON body size limits (50kb for text endpoints, 4mb for image poster studio)
  const textJsonParser = express.json({ limit: "50kb" });
  const posterJsonParser = express.json({ limit: "4mb" });

  // REST API v1 Architecture (Web + Future Native Android App Ready)
  app.get("/api/v1/health", (_req, res) => {
    const dhakaDateKey = getDhakaQuotaDateKey();
    const pacificDateKey = getPacificQuotaDateKey();
    const globalLedger = getGlobalLedger(dhakaDateKey);
    res.json({
      status: "ok",
      platform: "RoktoBondhon (রক্তবন্ধন)",
      stage: "Stage 1 Foundation + Stage 3 Security Hardened",
      activeDistrict: "Barguna",
      upazilas: [
        "Barguna Sadar",
        "Amtali",
        "Betagi",
        "Bamna",
        "Patharghata",
        "Taltali",
      ],
      quotaWindow: {
        applicationQuotaTimezone: "Asia/Dhaka",
        dhakaDateKey,
        firestoreSparkResetTimezone: "America/Los_Angeles",
        pacificDateKey,
        dailyGlobalLimit: globalLedger.limit,
        dailyGlobalConsumed:
          globalLedger.reserved + globalLedger.completed + globalLedger.uncertain,
      },
      androidApiReady: true,
    });
  });

  // 1. Low-Latency Emergency Triage & Instant Guidance (gemini-3.1-flash-lite)
  app.post(
    "/api/ai/fast-triage",
    rateLimitMiddleware,
    textJsonParser,
    async (req, res) => {
      try {
        const {
          bloodGroup,
          upazila,
          bags,
          condition,
          lang = "bn",
        } = (req.body ?? {}) as {
          bloodGroup?: string;
          upazila?: string;
          bags?: number;
          condition?: string;
          lang?: "bn" | "en";
        };

        const validGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
        if (!bloodGroup || !validGroups.includes(bloodGroup)) {
          res.status(400).json({ error: "Valid blood group is required." });
          return;
        }

        const safeUpazila = String(upazila || "Barguna Sadar").slice(0, 80);
        const safeCondition = String(condition || "Urgent").slice(0, 240);
        const safeBags = Math.min(Math.max(Number(bags) || 1, 1), 10);

        const fallbackGuidance =
          lang === "en"
            ? "1. Verify blood requisition slip from the attending physician at your Barguna hospital.\n2. Contact available donors in the same Upazila first and arrange 2-3 backup donors.\n3. Ensure mandatory clinical screening and cross-matching at the hospital pathology lab before transfusion."
            : "১. হাসপাতালের কর্তব্যরত চিকিৎসকের নিকট থেকে রক্তের রিকুইজিশন স্লিপ সংগ্রহ করুন।\n২. আপনার উপজেলার নিকটবর্তী ডোনারদের সাথে প্রথমে যোগাযোগ করুন এবং অন্তত ২ জন বিকল্প ডোনার প্রস্তুত রাখুন।\n৩. রক্ত গ্রহণের পূর্বে অবশ্যই হাসপাতালের ল্যাবে স্ক্রিনিং ও ক্রস-ম্যাচিং সম্পন্ন করুন।";

        if (!isLiveGeminiAllowed(req)) {
          res.json({
            model: "gemini-3.1-flash-lite",
            guidance: fallbackGuidance,
            dryRunOrFallback: true,
          });
          return;
        }

        const ai = getGenAIClient();
        const prompt =
          lang === "bn"
            ? `জরুরি রক্তের অনুরোধ: রক্তের গ্রুপ ${bloodGroup}, পরিমাণ ${safeBags} ব্যাগ, উপজেলা: ${safeUpazila}, রোগীর অবস্থা: ${safeCondition}। বরগুনা জেলার জন্য ৩টি সংক্ষিপ্ত ও তাৎক্ষণিক পদক্ষেপ (বিকল্প সামঞ্জস্যপূর্ণ রক্তের গ্রুপ, ক্রস-ম্যাচিং প্রস্তুতি এবং ডোনার যোগাযোগের পরামর্শ) বাংলায় দিন।`
            : `Emergency blood request: Blood Group ${bloodGroup}, Quantity ${safeBags} bag(s), Upazila: ${safeUpazila}, Condition: ${safeCondition}. Provide 3 concise immediate action steps (compatible blood groups, hospital cross-matching prep, and donor coordination tips for Barguna District) in English.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });

        res.json({
          model: "gemini-3.1-flash-lite",
          guidance: response.text ?? fallbackGuidance,
        });
      } catch (_error: unknown) {
        const fallbackGuidance =
          req.body?.lang === "en"
            ? "1. Verify blood requisition slip from the attending physician at your Barguna hospital.\n2. Contact available donors in the same Upazila first and arrange 2-3 backup donors.\n3. Ensure mandatory clinical screening and cross-matching at the hospital pathology lab before transfusion."
            : "১. হাসপাতালের কর্তব্যরত চিকিৎসকের নিকট থেকে রক্তের রিকুইজিশন স্লিপ সংগ্রহ করুন।\n২. আপনার উপজেলার নিকটবর্তী ডোনারদের সাথে প্রথমে যোগাযোগ করুন এবং অন্তত ২ জন বিকল্প ডোনার প্রস্তুত রাখুন।\n৩. রক্ত গ্রহণের পূর্বে অবশ্যই হাসপাতালের ল্যাবে স্ক্রিনিং ও ক্রস-ম্যাচিং সম্পন্ন করুন।";
        res.json({
          model: "gemini-3.1-flash-lite",
          guidance: fallbackGuidance,
          dryRunOrFallback: true,
        });
      }
    }
  );

  // 2. Multi-Turn Chatbot Endpoint (gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite)
  app.post(
    "/api/ai/chat",
    rateLimitMiddleware,
    textJsonParser,
    async (req, res) => {
      const {
        messages = [],
        mode = "general",
        lang = "bn",
      } = (req.body ?? {}) as {
        messages?: Array<{ role: "user" | "model"; text: string }>;
        mode?: "fast" | "general" | "complex";
        lang?: "bn" | "en";
      };

      if (!Array.isArray(messages)) {
        res.status(400).json({ error: "Messages must be an array." });
        return;
      }

      const validMessages = messages
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "model") &&
            typeof m.text === "string" &&
            m.text.trim().length > 0
        )
        .slice(-20)
        .map((m) => ({
          role: m.role,
          text: m.text.trim().slice(0, 2000),
        }));

      if (validMessages.length === 0) {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      const modelMap: Record<string, string> = {
        fast: "gemini-3.1-flash-lite",
        general: "gemini-3.8-flash",
        complex: "gemini-4-argon",
      };
      const selectedModel = modelMap[mode] || "gemini-3.8-flash";

      const buildClinicalFallbackReply = (userQuestion: string): string => {
        const q = userQuestion.toLowerCase();
        if (q.includes("o-") || q.includes("সার্বজনীন দাতা") || q.includes("universal donor")) {
          return lang === "en"
            ? "O- (O Negative) red blood cells lack A, B, and Rh(D) antigens on their surface, making O- the Universal Red Cell Donor for emergency transfusions when a patient's blood group is unknown. However, hospital laboratory cross-matching is still mandatory before transfusion."
            : "O- (ও নেগেটিভ) লোহিত রক্তকণিকায় A, B বা Rh(D) অ্যান্টিজেন না থাকায় জরুরি মুহূর্তে যেকোনো গ্রুপের রোগীকে O- লোহিত কণিকা দেওয়া যায়। এ কারণেই O- গ্রুপকে সার্বজনীন রক্তদাতা (Universal Red Cell Donor) বলা হয়। তবে রক্ত সঞ্চালনের পূর্বে হাসপাতালের ল্যাবে ক্রস-ম্যাচিং করা বাধ্যতামূলক।";
        }
        if (q.includes("ab+") || q.includes("সার্বজনীন গ্রহীতা") || q.includes("universal recipient")) {
          return lang === "en"
            ? "AB+ (AB Positive) patients have A, B, and Rh(D) antigens, allowing them to receive red blood cells from all 8 blood groups (O-, O+, A-, A+, B-, B+, AB-, AB+). Always complete hospital cross-matching before transfusion."
            : "AB+ (এবি পজিটিভ) গ্রুপের রক্তে A, B এবং Rh(D) অ্যান্টিজেন উপস্থিত থাকায় জরুরি প্রয়োজনে এই গ্রুপের রোগীরা ৮টি রক্তের গ্রুপ থেকেই লোহিত রক্তকণিকা গ্রহণ করতে পারেন। তাই AB+ গ্রুপকে সার্বজনীন গ্রহীতা বলা হয়।";
        }
        if (q.includes("পরীক্ষা") || q.includes("test") || q.includes("screening") || q.includes("ল্যাব") || q.includes("ক্রস")) {
          return lang === "en"
            ? "Before blood transfusion at Barguna 250-Bed General Hospital or any certified Upazila Health Complex, 5 mandatory screening tests are performed alongside ABO/Rh grouping and cross-matching: 1. HIV, 2. Hepatitis B (HBsAg), 3. Hepatitis C (Anti-HCV), 4. Syphilis (VDRL), and 5. Malaria."
            : "বরগুনা ২৫০ শয্যা জেনারেল হাসপাতাল বা যেকোনো অনুমোদিত ব্লাড ব্যাংকে রক্ত সঞ্চালনের পূর্বে ABO/Rh গ্রুপিং ও ক্রস-ম্যাচিংয়ের পাশাপাশি ৫টি বাধ্যতামূলক স্ক্রিনিং পরীক্ষা করা হয়: ১. এইচআইভি (HIV), ২. হেপাটাইটিস-বি (HBsAg), ৩. হেপাটাইটিস-সি (Anti-HCV), ৪. সিফিলিস (VDRL) এবং ৫. ম্যালেরিয়া।";
        }
        if (q.includes("হাসপাতাল") || q.includes("hospital") || q.includes("বরগুনা") || q.includes("barguna")) {
          return lang === "en"
            ? "In Barguna District, emergency blood cross-matching and transfusion services are coordinated through Barguna 250-Bed General Hospital (Barguna Sadar) and the Upazila Health Complexes in Amtali, Patharghata, Betagi, Bamna, and Taltali. For national emergency support, dial 999 or Health Call Center 16263."
            : "বরগুনা জেলায় জরুরি রক্তের প্রয়োজনে বরগুনা ২৫০ শয্যা জেনারেল হাসপাতাল (বরগুনা সদর) এবং আমতলী, পাথরঘাটা, বেতাগী, বামনা ও তালতলী উপজেলা স্বাস্থ্য কমপ্লেক্সে যোগাযোগ করুন। জাতীয় জরুরি সেবার জন্য ৯৯৯ বা স্বাস্থ্য বাতায়ন ১৬২৬৩ নম্বরে কল করতে পারেন।";
        }
        return lang === "en"
          ? "RoktoBondhon Clinical Guidance: Voluntary donors must be 18–60 years old, weigh at least 48 kg, have hemoglobin >= 12.5 g/dL, and wait at least 90 days between whole blood donations. Drink plenty of water and eat a light meal before donating, and always complete hospital lab cross-matching before transfusion."
          : "রক্তবন্ধন স্বাস্থ্য নির্দেশিকা: স্বেচ্ছায় রক্তদাতার বয়স ১৮–৬০ বছর, ওজন কমপক্ষে ৪৮ কেজি, হিমোগ্লোবিন কমপক্ষে ১২.৫ g/dL এবং সর্বশেষ রক্তদানের পর অন্তত ৯০ দিন বিরতি থাকা আবশ্যক। রক্তদানের আগে পর্যাপ্ত পানি ও হালকা খাবার গ্রহণ করুন এবং রক্ত সঞ্চালনের পূর্বে অবশ্যই হাসপাতালের ল্যাবে ক্রস-ম্যাচিং সম্পন্ন করুন।";
      };

      const latestMessage = validMessages[validMessages.length - 1].text;

      if (!isLiveGeminiAllowed(req)) {
        res.json({
          model: selectedModel,
          reply: buildClinicalFallbackReply(latestMessage),
          dryRunOrFallback: true,
        });
        return;
      }

      const ai = getGenAIClient();
      const history = validMessages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      // Prioritize Free-Tier friendly models (gemini-3.8-flash and gemini-3.1-flash-lite)
      // when quota on paid-tier models (gemini-4-argon) is unavailable.
      const candidateModels =
        selectedModel === "gemini-3.1-flash-lite"
          ? ["gemini-3.1-flash-lite", "gemini-3.8-flash"]
          : ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

      for (const candidateModel of candidateModels) {
        try {
          const chat = ai.chats.create({
            model: candidateModel,
            history,
            config: {
              systemInstruction:
                SYSTEM_INSTRUCTION +
                (lang === "en"
                  ? "\nPrefer responding in clear English unless asked for Bengali."
                  : "\nPrefer responding in clear Bengali (বাংলা) unless asked for English."),
            },
          });

          const response: GenerateContentResponse = await chat.sendMessage({
            message: latestMessage,
          });

          res.json({
            model: candidateModel,
            reply: response.text ?? buildClinicalFallbackReply(latestMessage),
          });
          return;
        } catch (_err: unknown) {
          // Try next fallback model tier if quota/rate-limit is hit
          continue;
        }
      }

      // If all live models are rate-limited on the current key, serve clinical fallback seamlessly
      res.json({
        model: selectedModel,
        reply: buildClinicalFallbackReply(latestMessage),
        dryRunOrFallback: true,
      });
    }
  );

  // 3. Create & Edit High-Quality Campaign Images (gemini-nano-banana-2.1 with 1K, 2K, 4K size option)
  // Enforces UUIDv4 X-Idempotency-Key, SHA-256 payload fingerprint, Asia/Dhaka daily quota, and concurrency lock.
  app.post(
    "/api/ai/generate-poster",
    rateLimitMiddleware,
    posterJsonParser,
    async (req, res) => {
      const {
        prompt,
        editPrompt,
        base64ImageData,
        mimeType = "image/png",
        imageSize = "1K",
        aspectRatio = "16:9",
      } = (req.body ?? {}) as {
        prompt?: string;
        editPrompt?: string;
        base64ImageData?: string;
        mimeType?: string;
        imageSize?: "1K" | "2K" | "4K";
        aspectRatio?: "1:1" | "16:9" | "4:3" | "3:4";
      };

      const effectivePrompt = (editPrompt || prompt || "").trim().slice(0, 1000);
      if (!effectivePrompt) {
        res.status(400).json({
          error: "Prompt is required for image generation or editing.",
        });
        return;
      }

      const validSizes = ["1K", "2K", "4K"] as const;
      const normalizedSize = validSizes.includes(imageSize as "1K" | "2K" | "4K")
        ? imageSize
        : "1K";

      const validRatios = ["1:1", "16:9", "4:3", "3:4"] as const;
      const normalizedRatio = validRatios.includes(
        aspectRatio as "1:1" | "16:9" | "4:3" | "3:4"
      )
        ? aspectRatio
        : "16:9";

      const actorId = resolveActorId(req);
      const rawIdempotencyHeader = req.headers["x-idempotency-key"];
      const idempotencyKey =
        typeof rawIdempotencyHeader === "string" && rawIdempotencyHeader.trim()
          ? rawIdempotencyHeader.trim()
          : crypto.randomUUID();

      if (!isValidUuidV4IdempotencyKey(idempotencyKey)) {
        res.status(400).json({
          error: "X-Idempotency-Key must be a valid UUIDv4 string.",
        });
        return;
      }

      const dhakaDateKey = getDhakaQuotaDateKey();
      const payloadHash = computePayloadFingerprint({
        uid: actorId,
        endpoint: "/api/ai/generate-poster",
        prompt: effectivePrompt,
        imageSize: normalizedSize,
        aspectRatio: normalizedRatio,
        mode: editPrompt ? "edit" : "create",
      });

      const existingRecord = idempotencyRecords.get(idempotencyKey) ?? null;
      const globalLedger = getGlobalLedger(dhakaDateKey);
      const userLedger = getUserLedger(actorId, dhakaDateKey);

      const reservation = reserveAiQuotaSlot({
        idempotencyKey,
        uid: actorId,
        dateKey: dhakaDateKey,
        payloadHash,
        nowMs: Date.now(),
        existingRecord,
        globalLedger,
        userLedger,
      });

      if (reservation.status === "REJECT_PAYLOAD_MISMATCH_422") {
        res.status(422).json({
          error:
            "Idempotency key cannot be reused with different request parameters.",
          code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
        });
        return;
      }

      if (
        reservation.status === "REJECT_IN_FLIGHT_409" ||
        reservation.status === "REJECT_UNCERTAIN_OUTCOME_409"
      ) {
        res.status(409).json({
          error:
            reservation.status === "REJECT_IN_FLIGHT_409"
              ? "A generation request with this idempotency key is already in progress."
              : "Previous generation with this idempotency key had an uncertain network outcome; automatic duplicate retry is blocked.",
          code: reservation.status,
        });
        return;
      }

      if (reservation.status === "REPLAY_COMPLETED" && reservation.record) {
        res.json({
          model: reservation.record.cachedResponseMeta?.model ?? "gemini-nano-banana-2.1",
          imageSize: reservation.record.cachedResponseMeta?.imageSize ?? normalizedSize,
          aspectRatio:
            reservation.record.cachedResponseMeta?.aspectRatio ?? normalizedRatio,
          fallbackStudioRender:
            reservation.record.cachedResponseMeta?.fallbackStudioRender ?? true,
          idempotentReplay: true,
          idempotencyKey,
        });
        return;
      }

      if (
        reservation.status === "REJECT_GLOBAL_QUOTA_429" ||
        reservation.status === "REJECT_USER_QUOTA_429"
      ) {
        res.status(429).json({
          error:
            reservation.status === "REJECT_GLOBAL_QUOTA_429"
              ? "Daily global AI generation quota (100/day Asia/Dhaka) reached."
              : "Daily per-user AI generation quota (5/day Asia/Dhaka) reached.",
          code: reservation.status,
          dhakaDateKey,
        });
        return;
      }

      // Per-actor concurrent in-flight guard
      if (activeInFlightActors.has(actorId)) {
        // Release the newly reserved slot cleanly before dispatching
        const aborted = finalizeAiQuotaSlot({
          record: reservation.record!,
          fencingToken: reservation.fencingToken!,
          outcome: { type: "PRE_DISPATCH_ABORT" },
          globalLedger: reservation.globalLedger,
          userLedger: reservation.userLedger,
        });
        globalLedgersByDate.set(dhakaDateKey, aborted.globalLedger);
        userLedgersByKey.set(`${actorId}_${dhakaDateKey}`, aborted.userLedger);
        idempotencyRecords.set(idempotencyKey, aborted.record);

        res.status(429).json({
          error: "Another AI generation request is currently active for your account.",
          code: "CONCURRENT_ACTOR_LIMIT",
        });
        return;
      }

      // Persist reservation state before dispatch
      let activeRecord = reservation.record!;
      const fencingToken = reservation.fencingToken!;
      globalLedgersByDate.set(dhakaDateKey, reservation.globalLedger);
      userLedgersByKey.set(`${actorId}_${dhakaDateKey}`, reservation.userLedger);
      idempotencyRecords.set(idempotencyKey, activeRecord);
      activeInFlightActors.add(actorId);

      try {
        if (!isLiveGeminiAllowed(req)) {
          const finalized = finalizeAiQuotaSlot({
            record: activeRecord,
            fencingToken,
            outcome: {
              type: "SUCCESS",
              meta: {
                model: "gemini-nano-banana-2.1",
                imageSize: normalizedSize,
                aspectRatio: normalizedRatio,
                fallbackStudioRender: true,
              },
            },
            globalLedger: getGlobalLedger(dhakaDateKey),
            userLedger: getUserLedger(actorId, dhakaDateKey),
          });
          globalLedgersByDate.set(dhakaDateKey, finalized.globalLedger);
          userLedgersByKey.set(`${actorId}_${dhakaDateKey}`, finalized.userLedger);
          idempotencyRecords.set(idempotencyKey, finalized.record);

          res.json({
            model: "gemini-nano-banana-2.1",
            imageSize: normalizedSize,
            aspectRatio: normalizedRatio,
            fallbackStudioRender: true,
            idempotencyKey,
            dhakaDateKey,
          });
          return;
        }

        // Transition to DISPATCHING immediately prior to invoking Gemini API
        activeRecord = markAiDispatching(activeRecord, fencingToken);
        idempotencyRecords.set(idempotencyKey, activeRecord);

        const ai = getGenAIClient();
        const parts: Array<
          | { text: string }
          | { inlineData: { data: string; mimeType: string } }
        > = [];

        if (base64ImageData && typeof base64ImageData === "string") {
          const cleanedBase64 = base64ImageData.replace(
            /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
            ""
          );
          parts.push({
            inlineData: {
              data: cleanedBase64,
              mimeType: mimeType || "image/png",
            },
          });
          parts.push({
            text: `Edit this RoktoBondhon blood donation campaign visual according to these instructions while maintaining a clean red-and-white healthcare aesthetic: ${effectivePrompt}`,
          });
        } else {
          parts.push({
            text: `Professional healthcare blood donation awareness campaign banner for RoktoBondhon in Barguna, Bangladesh. Clean medical aesthetic, red and white palette, uplifting community spirit, photorealistic editorial quality: ${effectivePrompt}`,
          });
        }

        const response = await ai.models.generateContent({
          model: "gemini-nano-banana-2.1",
          contents: {
            parts,
          },
          config: {
            imageConfig: {
              aspectRatio: normalizedRatio,
              imageSize: normalizedSize,
            },
          },
        });

        let imageUrl: string | null = null;
        let textOutput = "";

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType ?? "image/png";
            imageUrl = `data:${outMime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            textOutput += part.text;
          }
        }

        const checksumSha256 = imageUrl
          ? crypto.createHash("sha256").update(imageUrl).digest("hex")
          : undefined;

        const finalized = finalizeAiQuotaSlot({
          record: activeRecord,
          fencingToken,
          outcome: {
            type: "SUCCESS",
            meta: {
              model: "gemini-nano-banana-2.1",
              imageSize: normalizedSize,
              aspectRatio: normalizedRatio,
              checksumSha256,
              fallbackStudioRender: !imageUrl,
            },
          },
          globalLedger: getGlobalLedger(dhakaDateKey),
          userLedger: getUserLedger(actorId, dhakaDateKey),
        });
        globalLedgersByDate.set(dhakaDateKey, finalized.globalLedger);
        userLedgersByKey.set(`${actorId}_${dhakaDateKey}`, finalized.userLedger);
        idempotencyRecords.set(idempotencyKey, finalized.record);

        if (!imageUrl) {
          res.json({
            model: "gemini-nano-banana-2.1",
            imageSize: normalizedSize,
            aspectRatio: normalizedRatio,
            fallbackStudioRender: true,
            caption: textOutput,
            idempotencyKey,
          });
          return;
        }

        res.json({
          model: "gemini-nano-banana-2.1",
          imageSize: normalizedSize,
          aspectRatio: normalizedRatio,
          imageUrl,
          caption: textOutput,
          idempotencyKey,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Using built-in high-resolution campaign renderer.";

        // Check if deterministic pre-execution 4xx rejection vs post-dispatch uncertain outcome
        const isDeterministic4xx =
          /400|401|403|429|API_KEY_INVALID|PERMISSION_DENIED/i.test(message);

        const finalized = finalizeAiQuotaSlot({
          record: activeRecord,
          fencingToken,
          outcome: isDeterministic4xx
            ? { type: "DETERMINISTIC_GATEWAY_REJECT", httpStatus: 400 }
            : { type: "POST_DISPATCH_TIMEOUT_OR_5XX" },
          globalLedger: getGlobalLedger(dhakaDateKey),
          userLedger: getUserLedger(actorId, dhakaDateKey),
        });
        globalLedgersByDate.set(dhakaDateKey, finalized.globalLedger);
        userLedgersByKey.set(`${actorId}_${dhakaDateKey}`, finalized.userLedger);
        idempotencyRecords.set(idempotencyKey, finalized.record);

        res.json({
          model: "gemini-nano-banana-2.1",
          imageSize: normalizedSize,
          aspectRatio: normalizedRatio,
          fallbackStudioRender: true,
          notice: message,
          idempotencyKey,
        });
      } finally {
        activeInFlightActors.delete(actorId);
      }
    }
  );

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RoktoBondhon Server running on http://localhost:${PORT}`);
  });
}

startServer();

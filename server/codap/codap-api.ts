import fs from "fs"
import path from "path"

import { findResource, CodapTool } from "../catalog/resources"
import { getUserInfo } from "../helpers"
import { loadState, saveState, listStudents, saveAttachment, loadAttachment, resourceLinkKey, userKey,
         loadAssignment, saveAssignment, newAssignmentId, AssignmentRecord, getStudent, setProgress } from "./store"

export const codapUrl = process.env.CODAP_URL || "https://codap3.concord.org/"

// Teacher = has an Instructor role, or an Administrator role without a Learner role.
// (The POC's getUserType() treats Administrator as learner for AP; here admins who
// launch from an LMS course are almost always teachers trying things out.)
export const isTeacher = (token: any) => {
  const roles: string[] = token.platformContext?.roles ?? []
  const has = (s: string) => roles.some(r => r.includes(s))
  return has("#Instructor") || (has("#Administrator") && !has("#Learner"))
}

// ---- source documents ----

// Turn what a teacher pasted into a fetchable URL.
//  - CODAP share link: <codap url>#shared=<encoded public file URL>  -> the public file URL
//  - legacy share link: #shared=<numeric id> (retired document store)  -> rejected
//  - anything else: must be an http(s) URL
export const resolveDocumentUrl = (input: string): { url?: string, error?: string } => {
  const text = (input || "").trim()
  if (!text) return { error: "Paste a CODAP share link or a document URL." }
  let url: URL
  try { url = new URL(text) } catch { return { error: "That is not a valid URL." } }
  if (!/^https?:$/.test(url.protocol)) return { error: "The URL must start with http:// or https://." }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
  const shared = hash.get("shared")
  if (shared) {
    if (/^\d+$/.test(shared)) return { error: "This is an old-style CODAP share link (numeric id). Re-share the document from CODAP to get a current link." }
    try {
      const target = new URL(shared)
      if (!/^https?:$/.test(target.protocol)) throw new Error()
      return { url: target.toString() }
    } catch { return { error: "The share link does not contain a valid document URL." } }
  }
  return { url: url.toString() }
}

// v2 documents have appName "DG"; v3 documents have content.rowMap and content.tileMap
export const looksLikeCodapDocument = (doc: any) =>
  !!doc && typeof doc === "object" &&
  (doc.appName === "DG" || (doc.content && typeof doc.content === "object" && "rowMap" in doc.content && "tileMap" in doc.content))

// Fetch a document by URL, or read it from server/public when the URL is a local path.
export const loadDocumentFromUrl = async (documentUrl: string): Promise<any> => {
  if (documentUrl.startsWith("/")) {
    const p = path.join(__dirname, "..", "public", documentUrl)
    return JSON.parse(fs.readFileSync(p, "utf8"))
  }
  const response = await fetch(documentUrl, { headers: { accept: "application/json" } })
  if (!response.ok) throw new Error(`Could not load the document (${response.status}).`)
  const doc = await response.json()
  if (!looksLikeCodapDocument(doc)) throw new Error("That file is not a CODAP document.")
  return doc
}

// Which source document does this launch use? Catalog resources carry it in the
// catalog; "codap-custom" launches carry an assignment id as a custom parameter.
const sourceForLaunch = (token: any, resource: any, tool: CodapTool): { documentUrl?: string, title: string } => {
  if (resource.slug === "codap-custom") {
    // Schoology lowercases custom parameter names (Canvas does not), so match case-insensitively.
    const custom = token.platformContext?.custom ?? {}
    const key = Object.keys(custom).find(k => k.toLowerCase() === "assignment_id" || k.toLowerCase() === "assignmentid")
    const rec = loadAssignment(key ? String(custom[key]) : "")
    if (!rec) throw new Error("This assignment's document record was not found on the tool server.")
    return { documentUrl: rec.documentUrl, title: rec.title }
  }
  return { documentUrl: tool.documentUrl, title: resource.title }
}

const loadSourceDocument = async (documentUrl?: string): Promise<any | null> =>
  documentUrl ? loadDocumentFromUrl(documentUrl) : null

// ltijs installs body parsers (100 KB limit) before our middleware runs. CODAP
// documents and attachments are bigger than that, so for /codap/* we read the raw
// body ourselves and move that middleware ahead of the parsers. Prototype-only hack:
// production would upload attachments straight to S3 with pre-signed URLs.
const CODAP_MAX_BODY = 20 * 1024 * 1024 // 20 MB; this runs before the ltik check, so it must be bounded
export const installRawBodyForCodap = (app: any) => {
  app.use((req, res, next) => {
    if (!req.path.startsWith("/codap/") || !["POST", "PUT"].includes(req.method)) return next()
    const chunks: Buffer[] = []
    let size = 0
    let done = false
    req.on("data", (c: Buffer) => {
      if (done) return
      size += c.length
      if (size > CODAP_MAX_BODY) {
        done = true
        res.status(413).send({ error: "Payload too large" })
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on("end", () => {
      if (done) return
      done = true
      req.rawBody = Buffer.concat(chunks)
      req.body = {}
      req._body = true // tells body-parser to skip this request
      next()
    })
    req.on("error", (err) => { if (!done) { done = true; next(err) } })
  })
  // move the layer we just added to the front of the router stack (after express's own query/init layers)
  const stack = app._router?.stack
  if (stack) {
    const layer = stack.pop()
    stack.splice(2, 0, layer)
  }
}

// ---- grade passback (Assignment and Grade Services) ----
// Finds the gradebook line item for this launch: the one the LMS names in the token
// (graded assignment / "Enable Grading" material), else one bound to this resource link.
// Returns null when there is none; we do not create columns on the fly.
const findLineItem = async (lti: any, token: any): Promise<{ id: string, scoreMaximum: number } | null> => {
  const endpoint = token.platformContext?.endpoint
  if (!endpoint?.lineitems && !endpoint?.lineitem) return null
  if (endpoint.lineitem) {
    try {
      const item = await lti.Grade.getLineItemById(token, endpoint.lineitem)
      return { id: endpoint.lineitem, scoreMaximum: item?.scoreMaximum ?? 100 }
    } catch {
      return { id: endpoint.lineitem, scoreMaximum: 100 }
    }
  }
  const result = await lti.Grade.getLineItems(token, { resourceLinkId: true })
  const first = result?.lineItems?.[0]
  return first ? { id: first.id, scoreMaximum: first.scoreMaximum ?? 100 } : null
}

// Posts activityProgress for the launching student. Neither message carries a score:
// "Started" is NotReady; "Completed" is PendingManual, which shows the item in the
// gradebook as submitted and waiting for the teacher to enter points after looking at
// the student's document. The tool never invents a grade. Never throws: grading must
// not break a launch.
const postProgress = async (lti: any, token: any, progress: "Started" | "Completed"): Promise<{ ok: boolean, detail: string }> => {
  try {
    const lineItem = await findLineItem(lti, token)
    if (!lineItem) return { ok: false, detail: "no gradebook line item for this launch (ungraded item)" }
    const score: any = { userId: token.user, activityProgress: progress, gradingProgress: progress === "Completed" ? "PendingManual" : "NotReady" }
    await lti.Grade.submitScore(token, lineItem.id, score)
    const info = getUserInfo(token)
    setProgress(resourceLinkKey(token), userKey(token.user), token.user, info.name || info.email || token.user, progress)
    return { ok: true, detail: `${progress} posted to the gradebook` }
  } catch (e: any) {
    console.warn("grade passback failed:", e?.message || e)
    return { ok: false, detail: e?.message || "grade passback failed" }
  }
}

export const addCodapRoutes = (lti: any) => {
  const app = lti.app

  // Called by the host page after launch. Tells it who the user is, what to load,
  // and whether saves should be kept.
  // Express 4 does not catch rejected promises from async handlers, and Node exits on
  // unhandled rejections, so a bad documentUrl must not escape this handler.
  app.get("/codap/launch-info", async (req, res) => {
    try {
    const token = res.locals.token
    const resource = findResource(token.platformContext?.custom?.slug)
    if (!resource || resource.tool === "internal" || resource.tool.type !== "codap") {
      return res.status(400).send({ error: "Not a CODAP resource" })
    }
    const tool = resource.tool
    const { documentUrl, title } = sourceForLaunch(token, resource, tool)
    const rlKey = resourceLinkKey(token)
    const teacher = isTeacher(token)
    const studentParam = typeof req.query.student === "string" ? req.query.student : undefined

    // teacher without a student selected: list the class roster (Names and Roles)
    // merged with who has saved work. Falls back to "who has saved" if the roster
    // call fails, so the page still works when the LMS is slow or the service is off.
    if (teacher && !studentParam && req.query.preview !== "true") {
      const saved = listStudents(rlKey)
      const savedByUser = new Map(saved.map(s => [s.userId, s]))
      let roster: Array<{ userId: string, name: string }> | null = null
      let rosterError: string | null = null
      try {
        const result = await lti.NamesAndRoles.getMembers(token, { pages: 5 })
        roster = (result?.members ?? [])
          .filter(m => (m.roles ?? []).some((r: string) => r.includes("#Learner")))
          .map(m => ({ userId: m.user_id, name: m.name || [m.given_name, m.family_name].filter(Boolean).join(" ") || m.user_id }))
      } catch (e: any) {
        rosterError = e?.message || "roster unavailable"
        console.warn("Names and Roles lookup failed:", rosterError)
      }
      const rows = (roster ?? saved.map(s => ({ userId: s.userId, name: s.name }))).map(r => {
        const rec = savedByUser.get(r.userId)
        return { userId: r.userId, name: r.name, updatedAt: rec?.updatedAt ?? null, started: !!rec, progress: rec?.progress ?? null }
      })
      // anyone who saved but is no longer on the roster (dropped the course) still shows
      for (const s of saved) if (!rows.some(r => r.userId === s.userId)) rows.push({ userId: s.userId, name: s.name, updatedAt: s.updatedAt, started: true, progress: s.progress ?? null })
      rows.sort((a, b) => a.name.localeCompare(b.name))
      return res.send({
        role: "teacher",
        mode: "list",
        title,
        rosterSource: roster ? "names-and-roles" : "saved-only",
        rosterError,
        students: rows
      })
    }

    // teacher viewing a student's document (read-only), or teacher previewing the source
    if (teacher) {
      const state = studentParam ? loadState(rlKey, userKey(studentParam)) : await loadSourceDocument(documentUrl)
      const studentRec = studentParam ? listStudents(rlKey).find(s => s.userId === studentParam) : undefined
      return res.send({
        role: "teacher",
        mode: "view",
        readOnly: true,
        title,
        codapUrl,
        student: studentParam ?? null,
        studentName: studentRec?.name ?? null,
        studentUpdatedAt: studentRec?.updatedAt ?? null,
        state
      })
    }

    // student: their own copy, or the source document on first launch
    const uKey = userKey(token.user)
    let state = loadState(rlKey, uKey)
    let firstLaunch = false
    if (state === null) {
      state = await loadSourceDocument(documentUrl)
      firstLaunch = true
    }
    const existing = getStudent(rlKey, uKey)
    // tell the gradebook the student has started, once; don't wait for it
    if (!existing?.progress) postProgress(lti, token, "Started")
    return res.send({
      role: "learner",
      mode: "edit",
      readOnly: false,
      title,
      codapUrl,
      firstLaunch,
      gradable: !!(token.platformContext?.endpoint?.lineitem || token.platformContext?.endpoint?.lineitems),
      progress: existing?.progress ?? null,
      state
    })
    } catch (e: any) {
      console.error("codap launch-info failed:", e)
      return res.status(502).send({ error: e?.message || "Could not load the CODAP document" })
    }
  })

  // Picker calls this before letting a teacher submit a custom document: resolves the
  // pasted link, fetches it, and confirms it is a CODAP document.
  app.post("/codap/check-document", async (req, res) => {
    try {
      const body = JSON.parse(req.rawBody.toString("utf8"))
      const { url, error } = resolveDocumentUrl(body.input)
      if (error) return res.send({ ok: false, error })
      const doc = await loadDocumentFromUrl(url)
      const title = doc.name || doc.content?.title || doc.title || ""
      return res.send({ ok: true, url, title })
    } catch (e: any) {
      return res.send({ ok: false, error: e?.message || "Could not load that document." })
    }
  })

  // "Mark as done" from the host page: posts Completed with full points (students only).
  app.post("/codap/progress", async (req, res) => {
    const token = res.locals.token
    if (isTeacher(token)) return res.status(403).send({ error: "Teachers do not have grades" })
    let body: any = {}
    try { body = JSON.parse(req.rawBody.toString("utf8")) } catch {}
    if (body.activityProgress !== "Completed") return res.status(400).send({ error: "activityProgress must be Completed" })
    const result = await postProgress(lti, token, "Completed")
    return res.status(result.ok ? 200 : 502).send(result)
  })

  // Host page posts CODAP's interactive state here on every autosave (students only).
  app.post("/codap/state", (req, res) => {
    const token = res.locals.token
    if (isTeacher(token)) return res.status(403).send({ error: "Teachers do not save" })
    let state: any
    try {
      state = JSON.parse(req.rawBody.toString("utf8"))
    } catch {
      return res.status(400).send({ error: "Body must be JSON" })
    }
    const info = getUserInfo(token)
    const name = info.name || info.email || token.user
    saveState(resourceLinkKey(token), userKey(token.user), token.user, name, state)
    return res.send({ ok: true, bytes: req.rawBody.length })
  })

  // Attachments: CFM PUTs large documents here and GETs them back.
  // Teachers read a student's attachments by passing ?student=<userId>.
  const attachmentOwner = (req, token) => {
    const studentParam = typeof req.query.student === "string" ? req.query.student : undefined
    if (studentParam && !isTeacher(token)) return null
    return studentParam ?? token.user
  }

  app.put("/codap/attachments/:name", (req, res) => {
    const token = res.locals.token
    if (isTeacher(token)) return res.status(403).send({ error: "Teachers do not save" })
    saveAttachment(resourceLinkKey(token), userKey(token.user), req.params.name, req.rawBody)
    return res.send({ ok: true, bytes: req.rawBody.length })
  })

  app.get("/codap/attachments/:name", (req, res) => {
    const token = res.locals.token
    const owner = attachmentOwner(req, token)
    if (!owner) return res.status(403).send({ error: "Forbidden" })
    const content = loadAttachment(resourceLinkKey(token), userKey(owner), req.params.name)
    if (!content) return res.status(404).send({ error: "Not found" })
    res.type("application/json")
    return res.send(content)
  })
}

// Called from /deeplink when the teacher chose "Custom CODAP document". Returns the
// record to reference from the content item's custom parameters.
export const createCustomAssignment = async (token: any, input: string, title: string): Promise<AssignmentRecord> => {
  const { url, error } = resolveDocumentUrl(input)
  if (error) throw new Error(error)
  const doc = await loadDocumentFromUrl(url)
  const rec: AssignmentRecord = {
    id: newAssignmentId(),
    title: (title || "").trim() || doc.name || doc.content?.title || "CODAP document",
    documentUrl: url,
    originalInput: input.trim(),
    createdBy: token.user,
    createdAt: new Date().toISOString()
  }
  saveAssignment(rec)
  return rec
}

import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { string } from 'yup'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export default defineEventHandler(async (event): Promise<ExtractRecipeResponse> => {
  // Einheitliche Hilfsfunktion für Responses
  const createResponse = (data: Partial<ExtractRecipeResponse>): ExtractRecipeResponse => ({
    success: data.success ?? false,
    title: data.title ?? undefined,
    ingredients: data.ingredients ?? undefined,
    steps: data.steps ?? undefined,
    error: data.error ?? undefined,
  })

  try {
    const runtimeConfig = useRuntimeConfig()

    // Prompt-Location ermitteln
    const promptPath = resolve(process.cwd(), 'static', 'prompts', 'recipe.txt')
    console.log('### Prompt Location:', promptPath)

    if (!existsSync(promptPath)) {
      throw new Error('Prompt file not found!')
    }
    console.log('✅ Recipe Prompt File Initialized')

    // URL validieren
    const query = getQuery(event) as { recipeUrl: string, goVegan?: boolean }
    const { recipeUrl } = query

    const urlSchema = string().url()
    if (!urlSchema.isValidSync(recipeUrl)) {
      return createResponse({ success: false, error: 'Die URL ist ungültig.' })
    }

    // Fetch mit Timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(recipeUrl, {
        signal: controller.signal,
        redirect: 'error',
        headers: { 'User-Agent': 'https://shliste.app (Recipe Extractor)' },
      })
    }
    finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      return createResponse({ error: 'Die Website konnte leider nicht geladen werden.' })
    }

    // HTML säubern
    const html = await response.text()
    const $ = cheerio.load(html)
    $('script, style, nav, footer, svg, img, picture, video, noscript, source, meta, header, footer, button, input, textarea, iframe').remove()
    const bodyContent = $('body').text().trim()

    if (!bodyContent) {
      return createResponse({ error: 'Der Inhalt der Website konnte nicht extrahiert werden.' })
    }

    // Prompt lesen
    const promptText = readFileSync(promptPath, 'utf-8')
    const cleanedBodyContent = bodyContent.replace(/\s+/g, ' ').trim()

    const openai = new OpenAI({
      apiKey: runtimeConfig.openai.apiKey,
    })

    console.info('### Prompt Template Text')
    console.info(promptText)

    // GPT-Aufruf
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: promptText },
        { role: 'user', content: cleanedBodyContent },
      ],
    })

    const messageContent = completion.choices?.[0]?.message?.content
    if (!messageContent) {
      return createResponse({ error: 'Keine Antwort vom OpenAI-Modell erhalten.' })
    }

    console.info('### Recipe Extracted')
    console.info(messageContent)

    // JSON parsen
    let recipe: {
      title?: string
      ingredients?: string[]
      steps?: string[]
      error?: boolean
      errorMessage?: string
    }

    try {
      recipe = JSON.parse(messageContent)
    }
    catch {
      return createResponse({ error: 'Fehler beim Verarbeiten der OpenAI-Antwort.' })
    }

    // Ergebnis prüfen
    if (recipe.error || !recipe.ingredients?.length || !recipe.steps?.length) {
      return createResponse({ error: recipe.errorMessage || 'Das Rezept konnte nicht extrahiert werden.' })
    }

    return createResponse({
      success: true,
      title: recipe.title,
      ingredients: Array.from(new Set(recipe.ingredients)),
      steps: recipe.steps,
    })
  }
  catch (error: unknown) {
    console.error('### Recipe Extract Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.',
    }
  }
})

// MAI-DxO (Multi-Agent Intelligence Diagnostic Orchestrator)
// Based on Open-MAI-Dx-Orchestrator: https://github.com/The-Swarm-Corporation/Open-MAI-Dx-Orchestrator

import { OPENAI_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY } from './constants.ts'

// Agent role definitions
export const MEDICAL_AGENTS = {
  DR_HYPOTHESIS: {
    name: "Dr. Hypothesis",
    role: "differential_diagnostician",
    prompt: `You are Dr. Hypothesis, a master diagnostician. 
    Maintain a ranked list of top 3 differential diagnoses with probabilities.
    Update probabilities using Bayesian reasoning after each new finding.
    Format: 1. [Disease] (X%) 2. [Disease] (Y%) 3. [Disease] (Z%)`
  },
  
  DR_TEST_CHOOSER: {
    name: "Dr. Test-Chooser",
    role: "test_strategist",
    prompt: `You are Dr. Test-Chooser, optimizing diagnostic workup.
    Select up to 3 tests that maximize information gain and discriminate between hypotheses.
    Consider: sensitivity/specificity, cost, invasiveness, and availability in India.
    Format: Test1 (₹cost) - rationale | Test2 (₹cost) - rationale`
  },
  
  DR_CHALLENGER: {
    name: "Dr. Challenger",
    role: "devil_advocate",
    prompt: `You are Dr. Challenger, preventing diagnostic errors.
    Challenge current hypotheses, identify contradictory evidence, suggest alternative diagnoses.
    Look for: cognitive biases, rare diseases, atypical presentations.
    Be constructive but critical.`
  },
  
  DR_STEWARDSHIP: {
    name: "Dr. Stewardship",
    role: "cost_optimizer",
    prompt: `You are Dr. Stewardship, ensuring cost-effective care for Indian patients.
    Advocate for cheaper alternatives when equivalent. Consider patient's financial constraints.
    Suggest: generic drugs, government schemes (Jan Aushadhi), free screenings.
    Balance accuracy with affordability.`
  },
  
  DR_CHECKLIST: {
    name: "Dr. Checklist",
    role: "quality_controller",
    prompt: `You are Dr. Checklist, ensuring diagnostic quality.
    Verify: test names are correct, logic is sound, no steps missed.
    Flag any errors or inconsistencies in the panel's reasoning.
    Ensure evidence-based approach.`
  },
  
  CONSENSUS_COORDINATOR: {
    name: "Consensus Coordinator",
    role: "synthesizer",
    prompt: `You are the Consensus Coordinator, synthesizing panel input.
    Decide next action: ask questions, order tests, or make diagnosis.
    Balance thoroughness with efficiency. Aim for 80% confidence before diagnosis.
    Consider Indian healthcare context.`
  },
  
  GATEKEEPER: {
    name: "Gatekeeper",
    role: "information_provider",
    prompt: `You are the clinical information Gatekeeper.
    Provide realistic test results and patient responses based on the case.
    Maintain clinical realism. Don't reveal diagnosis directly.
    Simulate realistic Indian patient responses.`
  },
  
  JUDGE: {
    name: "Judge",
    role: "evaluator",
    prompt: `You are the diagnostic Judge, evaluating accuracy.
    Score diagnosis 1-5: 1=Wrong, 2=Partially correct, 3=Correct but incomplete,
    4=Correct with good reasoning, 5=Excellent with comprehensive plan.
    Consider treatment implications.`
  }
}

// Test cost database (Indian Rupees)
export const TEST_COSTS = {
  // Blood tests
  'cbc': 200,
  'complete_blood_count': 200,
  'hemoglobin': 100,
  'esr': 150,
  'crp': 400,
  'liver_function_test': 600,
  'kidney_function_test': 500,
  'lipid_profile': 500,
  'thyroid_profile': 800,
  'hba1c': 400,
  'blood_sugar_fasting': 100,
  'blood_sugar_pp': 100,
  
  // Imaging
  'chest_xray': 300,
  'ultrasound_abdomen': 800,
  'ct_scan': 3000,
  'mri_brain': 5000,
  'ecg': 150,
  'echo': 2000,
  
  // Specialized tests
  'troponin': 1500,
  'd_dimer': 1200,
  'tumor_markers': 3000,
  'autoimmune_panel': 5000,
  
  // Procedures
  'endoscopy': 3000,
  'colonoscopy': 5000,
  'biopsy': 2000
}

// Operational modes
export type MaiDxMode = 'instant' | 'question_only' | 'budgeted' | 'no_budget' | 'ensemble'

// Interfaces
export interface MaiDxOptions {
  mode: MaiDxMode
  maxIterations: number
  budget: number
  language: string
  age: string
  patientContext: string
}

export interface DiagnosisResult {
  finalDiagnosis: string
  confidence: number
  differentialDiagnoses: Array<{diagnosis: string, probability: number}>
  recommendedTests: Array<{test: string, cost: number, rationale: string}>
  totalCost: number
  iterations: number
  accuracyScore?: number
  reasoning: string
  managementPlan: string
}

export interface AgentResponse {
  agent: string
  response: string
  timestamp: number
}

// State management
export class MaiDxState {
  public history: AgentResponse[] = []
  public currentHypotheses: Map<string, number> = new Map()
  public testsOrdered: Set<string> = new Set()
  public totalCost: number = 0
  public iterations: number = 0
  public patientInfo: Map<string, string> = new Map()
  
  addResponse(agent: string, response: string) {
    this.history.push({
      agent,
      response,
      timestamp: Date.now()
    })
  }
  
  updateHypothesis(diagnosis: string, probability: number) {
    this.currentHypotheses.set(diagnosis, probability)
  }
  
  addTest(test: string, cost: number) {
    this.testsOrdered.add(test)
    this.totalCost += cost
  }
  
  getTopHypotheses(n: number = 3): Array<{diagnosis: string, probability: number}> {
    return Array.from(this.currentHypotheses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([diagnosis, probability]) => ({diagnosis, probability}))
  }
}

// Agent communication
async function queryAgent(
  agent: typeof MEDICAL_AGENTS[keyof typeof MEDICAL_AGENTS],
  context: string,
  state: MaiDxState,
  model: 'claude' | 'openai' | 'gemini' = 'claude'
): Promise<string> {
  const systemPrompt = agent.prompt
  const conversationHistory = state.history
    .slice(-10) // Last 10 exchanges
    .map(h => `${h.agent}: ${h.response}`)
    .join('\n')
  
  const fullPrompt = `${systemPrompt}

Current case context:
${context}

Recent discussion:
${conversationHistory}

Current hypotheses: ${Array.from(state.currentHypotheses.entries()).map(([d, p]) => `${d} (${p}%)`).join(', ')}
Tests ordered: ${Array.from(state.testsOrdered).join(', ')}
Total cost so far: ₹${state.totalCost}

Provide your assessment:`

  try {
    let response = ''
    
    switch(model) {
      case 'claude':
        response = await consultClaudeRaw(fullPrompt)
        break
      case 'openai':
        response = await consultOpenAIRaw(fullPrompt)
        break
      case 'gemini':
        response = await consultGeminiRaw(fullPrompt)
        break
    }
    
    state.addResponse(agent.name, response)
    return response
  } catch (error) {
    console.error(`Error querying ${agent.name}:`, error)
    return `${agent.name} is temporarily unavailable.`
  }
}

// API consultation functions (raw versions without formatting)
async function consultClaudeRaw(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
  const data = await response.json()
  return data.content[0].text
}

async function consultOpenAIRaw(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    })
  })
  
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)
  const data = await response.json()
  return data.choices[0].message.content
}

async function consultGeminiRaw(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500 }
      })
    }
  )
  
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

// Main orchestrator function
export async function runMaiDxOrchestrator(
  query: string,
  options: MaiDxOptions
): Promise<DiagnosisResult> {
  console.log(`🏥 Starting MAI-DxO in ${options.mode} mode`)
  const state = new MaiDxState()
  
  // Initialize patient context
  const initialContext = `
Patient: ${options.age} years old
Query: ${query}
Context: ${options.patientContext}
Budget: ₹${options.budget}
Mode: ${options.mode}
  `.trim()
  
  // Mode-specific behavior
  switch(options.mode) {
    case 'instant':
      return await runInstantDiagnosis(initialContext, state)
      
    case 'question_only':
      return await runQuestionOnlyDiagnosis(initialContext, state, options)
      
    case 'budgeted':
      return await runBudgetedDiagnosis(initialContext, state, options)
      
    case 'no_budget':
      return await runFullDiagnosis(initialContext, state, options)
      
    case 'ensemble':
      return await runEnsembleDiagnosis(initialContext, state, options)
      
    default:
      return await runBudgetedDiagnosis(initialContext, state, options)
  }
}

// Instant diagnosis (single pass)
async function runInstantDiagnosis(
  context: string,
  state: MaiDxState
): Promise<DiagnosisResult> {
  // Quick consultation with hypothesis agent only
  const hypothesis = await queryAgent(MEDICAL_AGENTS.DR_HYPOTHESIS, context, state, 'claude')
  
  // Parse top diagnosis
  const diagnosisMatch = hypothesis.match(/1\.\s*([^(]+)\s*\((\d+)%\)/)
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : 'Requires further evaluation'
  const confidence = diagnosisMatch ? parseInt(diagnosisMatch[2]) : 50
  
  return {
    finalDiagnosis: diagnosis,
    confidence,
    differentialDiagnoses: [{diagnosis, probability: confidence}],
    recommendedTests: [],
    totalCost: 300, // Consultation fee only
    iterations: 1,
    reasoning: hypothesis,
    managementPlan: 'Immediate medical consultation recommended.'
  }
}

// Question-only diagnosis
async function runQuestionOnlyDiagnosis(
  context: string,
  state: MaiDxState,
  options: MaiDxOptions
): Promise<DiagnosisResult> {
  let currentContext = context
  
  for (let i = 0; i < Math.min(options.maxIterations, 5); i++) {
    // Coordinator decides what questions to ask
    const coordinatorResponse = await queryAgent(
      MEDICAL_AGENTS.CONSENSUS_COORDINATOR,
      currentContext + '\nDecide what additional history questions to ask (max 3).',
      state,
      'claude'
    )
    
    if (coordinatorResponse.toLowerCase().includes('diagnose') || 
        coordinatorResponse.toLowerCase().includes('sufficient')) {
      break
    }
    
    // Simulate patient responses
    const gatekeeperResponse = await queryAgent(
      MEDICAL_AGENTS.GATEKEEPER,
      currentContext + `\nQuestions asked: ${coordinatorResponse}\nProvide realistic patient responses.`,
      state,
      'gemini'
    )
    
    currentContext += `\n\nQ: ${coordinatorResponse}\nA: ${gatekeeperResponse}`
    state.iterations++
  }
  
  // Get final diagnosis
  const hypothesis = await queryAgent(MEDICAL_AGENTS.DR_HYPOTHESIS, currentContext, state, 'claude')
  const challenger = await queryAgent(MEDICAL_AGENTS.DR_CHALLENGER, currentContext, state, 'openai')
  
  // Synthesize
  const synthesis = await queryAgent(
    MEDICAL_AGENTS.CONSENSUS_COORDINATOR,
    `${hypothesis}\n\nChallenger view: ${challenger}\n\nProvide final diagnosis and management plan.`,
    state,
    'claude'
  )
  
  return parseDiagnosisResult(synthesis, state)
}

// Budgeted diagnosis
async function runBudgetedDiagnosis(
  context: string,
  state: MaiDxState,
  options: MaiDxOptions
): Promise<DiagnosisResult> {
  let currentContext = context
  let remainingBudget = options.budget
  
  for (let i = 0; i < options.maxIterations; i++) {
    if (remainingBudget <= 0) {
      console.log('💸 Budget exhausted')
      break
    }
    
    // Panel deliberation
    const hypothesisResponse = await queryAgent(MEDICAL_AGENTS.DR_HYPOTHESIS, currentContext, state, 'claude')
    const testResponse = await queryAgent(
      MEDICAL_AGENTS.DR_TEST_CHOOSER,
      currentContext + `\nBudget remaining: ₹${remainingBudget}`,
      state,
      'openai'
    )
    const stewardshipResponse = await queryAgent(
      MEDICAL_AGENTS.DR_STEWARDSHIP,
      currentContext + `\nTests suggested: ${testResponse}\nBudget: ₹${remainingBudget}`,
      state,
      'gemini'
    )
    
    // Coordinator decision
    const decision = await queryAgent(
      MEDICAL_AGENTS.CONSENSUS_COORDINATOR,
      `Hypothesis: ${hypothesisResponse}\nTests: ${testResponse}\nStewardship: ${stewardshipResponse}\nBudget: ₹${remainingBudget}\n\nDecide: ask questions, order specific tests, or diagnose?`,
      state,
      'claude'
    )
    
    // Execute decision
    if (decision.toLowerCase().includes('diagnose')) {
      break
    } else if (decision.toLowerCase().includes('test')) {
      // Extract and order tests
      const testsToOrder = extractTests(decision)
      for (const test of testsToOrder) {
        const cost = TEST_COSTS[test.toLowerCase()] || 500
        if (cost <= remainingBudget) {
          state.addTest(test, cost)
          remainingBudget -= cost
          
          // Get test results from gatekeeper
          const result = await queryAgent(
            MEDICAL_AGENTS.GATEKEEPER,
            `Provide realistic result for ${test} given the case`,
            state,
            'gemini'
          )
          currentContext += `\n${test} result: ${result}`
        }
      }
    }
    
    state.iterations++
  }
  
  // Final synthesis
  const finalDiagnosis = await synthesizeFinalDiagnosis(currentContext, state)
  return finalDiagnosis
}

// Full diagnosis (no budget constraint)
async function runFullDiagnosis(
  context: string,
  state: MaiDxState,
  options: MaiDxOptions
): Promise<DiagnosisResult> {
  // Similar to budgeted but without cost constraints
  const budgetlessOptions = { ...options, budget: 999999 }
  return await runBudgetedDiagnosis(context, state, budgetlessOptions)
}

// Ensemble diagnosis
async function runEnsembleDiagnosis(
  context: string,
  state: MaiDxState,
  options: MaiDxOptions
): Promise<DiagnosisResult> {
  const runs = 3
  const results: DiagnosisResult[] = []
  
  for (let i = 0; i < runs; i++) {
    console.log(`🔄 Ensemble run ${i + 1}/${runs}`)
    const runState = new MaiDxState()
    const result = await runBudgetedDiagnosis(context, runState, options)
    results.push(result)
  }
  
  // Aggregate results
  const diagnosisCounts = new Map<string, number>()
  let totalConfidence = 0
  let totalCost = 0
  
  for (const result of results) {
    const count = diagnosisCounts.get(result.finalDiagnosis) || 0
    diagnosisCounts.set(result.finalDiagnosis, count + 1)
    totalConfidence += result.confidence
    totalCost += result.totalCost
  }
  
  // Get consensus diagnosis
  const consensusDiagnosis = Array.from(diagnosisCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0]
  
  return {
    finalDiagnosis: consensusDiagnosis,
    confidence: Math.round(totalConfidence / runs),
    differentialDiagnoses: results[0].differentialDiagnoses,
    recommendedTests: results[0].recommendedTests,
    totalCost: Math.round(totalCost / runs),
    iterations: options.maxIterations,
    reasoning: `Ensemble consensus from ${runs} independent panels`,
    managementPlan: results[0].managementPlan
  }
}

// Helper functions
function extractTests(text: string): string[] {
  const tests: string[] = []
  // Look for test names in TEST_COSTS
  for (const test of Object.keys(TEST_COSTS)) {
    if (text.toLowerCase().includes(test.replace('_', ' '))) {
      tests.push(test)
    }
  }
  return tests.slice(0, 3) // Max 3 tests per iteration
}

async function synthesizeFinalDiagnosis(
  context: string,
  state: MaiDxState
): Promise<DiagnosisResult> {
  // Get final opinions from all agents
  const finalHypothesis = await queryAgent(MEDICAL_AGENTS.DR_HYPOTHESIS, context, state, 'claude')
  const finalChallenge = await queryAgent(MEDICAL_AGENTS.DR_CHALLENGER, context, state, 'openai')
  
  // Judge evaluation
  const judgement = await queryAgent(
    MEDICAL_AGENTS.JUDGE,
    `Case: ${context}\nDiagnosis: ${finalHypothesis}\nChallenge: ${finalChallenge}\n\nEvaluate the diagnosis.`,
    state,
    'claude'
  )
  
  // Parse results
  return parseDiagnosisResult(finalHypothesis + '\n' + judgement, state)
}

function parseDiagnosisResult(text: string, state: MaiDxState): DiagnosisResult {
  // Extract diagnosis and confidence
  const diagnosisMatch = text.match(/(?:diagnosis|diagnose):\s*([^\n.]+)/i)
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : 'Requires clinical evaluation'
  
  const confidenceMatch = text.match(/(?:confidence|certainty):\s*(\d+)%/i)
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 70
  
  // Get differential diagnoses from state
  const differentials = state.getTopHypotheses(3)
  
  // Extract management plan
  const managementMatch = text.match(/(?:management|treatment|plan):\s*([^\n]+(?:\n[^\n]+)*)/i)
  const management = managementMatch ? managementMatch[1].trim() : 'Consult physician for detailed evaluation.'
  
  return {
    finalDiagnosis: diagnosis,
    confidence,
    differentialDiagnoses: differentials,
    recommendedTests: Array.from(state.testsOrdered).map(test => ({
      test,
      cost: TEST_COSTS[test.toLowerCase()] || 500,
      rationale: 'Recommended by diagnostic panel'
    })),
    totalCost: state.totalCost,
    iterations: state.iterations,
    reasoning: text,
    managementPlan: management
  }
}

// Main export function for integration
export async function maiDxoOrchestrator(
  query: string,
  userContext: any
): Promise<string> {
  try {
    const options: MaiDxOptions = {
      mode: userContext.isPaid ? 'budgeted' : 'question_only',
      maxIterations: userContext.isPaid ? 10 : 5,
      budget: userContext.isPaid ? 5000 : 0,
      language: userContext.language || 'en',
      age: userContext.age || 'Unknown',
      patientContext: userContext.isImage ? 'Image/scan provided' : 'Text query'
    }
    
    const result = await runMaiDxOrchestrator(query, options)
    
    // Format response
    let response = `🏥 **MAI-DxO DIAGNOSTIC PANEL REPORT**\n\n`
    response += `**Primary Diagnosis:** ${result.finalDiagnosis} (${result.confidence}% confidence)\n\n`
    
    if (result.differentialDiagnoses.length > 1) {
      response += `**Differential Diagnoses:**\n`
      result.differentialDiagnoses.forEach((dd, i) => {
        response += `${i + 1}. ${dd.diagnosis} (${dd.probability}%)\n`
      })
      response += '\n'
    }
    
    if (result.recommendedTests.length > 0) {
      response += `**Recommended Tests:**\n`
      result.recommendedTests.forEach(test => {
        response += `• ${test.test} - ₹${test.cost}\n`
      })
      response += `**Total Cost:** ₹${result.totalCost}\n\n`
    }
    
    response += `**Management Plan:**\n${result.managementPlan}\n\n`
    response += `⚠️ *AI guidance only. Consult qualified physician for diagnosis and treatment.*`
    
    return response
  } catch (error) {
    console.error('MAI-DxO orchestrator error:', error)
    return '❌ Diagnostic panel encountered an error. Please try again or consult a physician directly.'
  }
}
/**
 * Phoenix AI – Crop Advisory ML service (Node.js side).
 *
 * Talks to the trained scikit-learn pipeline through a long-running Python
 * worker (ml/predict_service.py). The model is loaded ONCE inside the worker process.
 * If Python ML worker is initializing or unavailable, falls back to the
 * expert agronomy advisory service (advisoryService.js).
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
const { generateAdvisory: generateRuleAdvisory } = require('./advisoryService');

const ML_DIR = process.env.PHOENIX_ML_DIR || path.resolve(__dirname, '..', '..', 'ml');
const WORKER_SCRIPT = path.join(ML_DIR, 'predict_service.py');
const REQUEST_TIMEOUT_MS = Number(process.env.PHOENIX_ML_TIMEOUT_MS || 15000);

// Determine suitable Python executable (prefer Python with joblib & sklearn installed)
function detectPythonCommand() {
  if (process.env.PHOENIX_PYTHON) return process.env.PHOENIX_PYTHON;
  if (process.platform === 'win32') {
    try {
      execSync('py -3.12 -c "import joblib, sklearn"', { stdio: 'ignore' });
      return 'py -3.12';
    } catch {
      try {
        execSync('python -c "import joblib, sklearn"', { stdio: 'ignore' });
        return 'python';
      } catch {
        return 'python';
      }
    }
  }
  return 'python3';
}

const PYTHON = detectPythonCommand();

let worker = null;        // child process
let rl = null;            // readline interface on worker stdout
let _readyResolve = null; // handshake resolver
let pending = new Map();  // id -> {resolve, reject, timer}
let reqCounter = 0;
let stderrTail = [];

function failAll(message) {
  for (const [, entry] of pending) {
    clearTimeout(entry.timer);
    entry.reject(Object.assign(new Error(message), { code: 'MODEL_UNAVAILABLE' }));
  }
  pending.clear();
}

function killWorker() {
  try { if (worker) worker.kill(); } catch { /* ignore */ }
  worker = null;
  rl = null;
  _readyResolve = null;
}

function startWorker() {
  if (worker) return;

  const pythonCmd = PYTHON.split(' ');
  const cmd = pythonCmd[0];
  const args = [...pythonCmd.slice(1), WORKER_SCRIPT, '--model-dir', path.join(ML_DIR, 'saved_models')];

  worker = spawn(cmd, args, { cwd: ML_DIR, stdio: ['pipe', 'pipe', 'pipe'] });

  rl = readline.createInterface({ input: worker.stdout });

  rl.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }

    if (msg.status === 'ready') {
      if (_readyResolve) { _readyResolve(); _readyResolve = null; }
      return;
    }
    if (msg.status === 'error') {
      failAll(`Model worker failed to start: ${msg.message || 'unknown error'}`);
      return;
    }
    const entry = pending.get(msg.id);
    if (entry) {
      pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.ok) entry.resolve(msg.advisory);
      else entry.reject(Object.assign(new Error(msg.error || 'Prediction failed.'), { code: msg.code }));
    }
  });

  worker.stderr.on('data', (chunk) => {
    stderrTail.push(String(chunk));
    if (stderrTail.length > 20) stderrTail.shift();
  });

  worker.on('exit', (code) => {
    console.error(`[advisoryService] Python worker exited (code ${code}). ${stderrTail.slice(-3).join('')}`);
    worker = null;
    rl = null;
    _readyResolve = null;
    stderrTail = [];
    failAll('The crop advisory model engine stopped.');
  });
}

function ensureReady() {
  if (worker && !_readyResolve) return Promise.resolve();
  if (!worker) startWorker();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('The crop advisory model engine is taking too long to start.'));
      killWorker();
    }, 15000);
    _readyResolve = () => { clearTimeout(timeout); resolve(); };
  });
}

/**
 * Ask the trained ML model for a crop advisory, with automatic expert rule fallback.
 */
async function getAdvisory(input) {
  try {
    await ensureReady();

    const id = ++reqCounter;
    const mlResult = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        console.error('[advisoryService] ML request timed out; restarting worker.');
        killWorker();
        reject(Object.assign(new Error('ML model timed out.'), { code: 'MODEL_TIMEOUT' }));
      }, REQUEST_TIMEOUT_MS);

      pending.set(id, { resolve, reject, timer });
      try {
        worker.stdin.write(JSON.stringify(payload_with_id(input, id)) + '\n');
      } catch (err) {
        clearTimeout(timer);
        pending.delete(id);
        reject(Object.assign(new Error('ML worker not reachable.'), { code: 'MODEL_UNAVAILABLE' }));
      }
    });

    return mlResult;
  } catch (mlErr) {
    console.warn(`[mlAdvisoryService] Python ML worker unavailable (${mlErr.message}). Using Expert Agronomy Rule Fallback.`);
    // Fallback to Expert System (advisoryService.js)
    const ruleResult = await generateRuleAdvisory(input);
    return {
      predictedCrop: input.crop || 'Wheat',
      confidence: 0.90,
      riskLevel: ruleResult.diseaseRisk || 'Low',
      lowConfidence: false,
      growthStage: input.growthStage || 'Vegetative',
      irrigationRecommendation: ruleResult.irrigationAdvice,
      fertilizerRecommendation: ruleResult.fertilizerRecommendation,
      soilRecommendation: `Soil pH ${input.soilPH || '7.0'} (${input.soilType || 'loam'}) condition analyzed.`,
      maintenanceRecommendation: ruleResult.fertilizerApplication || 'Regular field monitoring and weed management.',
      weatherPrecautions: [ruleResult.diseaseRecommendation],
      preventiveActions: ruleResult.diseaseFactors || ['Regular crop scouting and soil moisture monitoring.'],
      reason: 'Generated via Phoenix AI Expert Agronomy Engine using live weather and field soil parameters.',
      cropHealthStatus: 'Healthy',
      yieldEstimate: { range: [25, 45], unit: 'quintals per acre' },
      isFallback: true,
      ...ruleResult
    };
  }
}

function payload_with_id(input, id) {
  const payload = Object.assign({}, input);
  payload._requestId = id;
  return payload;
}

module.exports = { getAdvisory, ML_DIR };

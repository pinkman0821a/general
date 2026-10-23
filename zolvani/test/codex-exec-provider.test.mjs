import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { CodexExecProvider } from '../server/providers/codex-exec.mjs';

function fakeSpawn({ events, exitCode = 0, autoClose = true } = {}) {
  let captured = '';
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new Writable({
    write(chunk, _encoding, callback) { captured += chunk.toString(); callback(); },
    final(callback) {
      if(autoClose)queueMicrotask(() => {
        for (const event of events ?? []) child.stdout.write(`${JSON.stringify(event)}\n`);
        child.stdout.end();child.stderr.end();child.emit('close', exitCode, null);
      });
      callback();
    },
  });
  let killed=false;child.kill = () => { killed=true;return true; };child.wasKilled=()=>killed;
  child.capturedPrompt = () => captured;
  return child;
}

test('CodexExecProvider usa sandbox de solo lectura y entrega resultado estructurado', async () => {
  const resultEvent = { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify({ summary: 'Revisión local terminada.', evidence: ['Solo se inspeccionó el contexto permitido.'] }) } };
  const usageEvent = { type: 'turn.completed', usage: { input_tokens: 80, output_tokens: 20 } };
  let invoked, childProcess;
  const provider = new CodexExecProvider({
    command: 'codex-test-double',
    spawnProcess(command, args, options) { invoked = { command, args, options }; childProcess = fakeSpawn({ events: [resultEvent, usageEvent] }); return childProcess; },
  });

  const result = await provider.execute({ id: 'HUEVO-demo', title: 'Revisar una nota ficticia', details: 'Solo análisis interno.' });

  assert.equal(invoked.command, 'codex-test-double');
  assert.ok(invoked.args.includes('--sandbox') && invoked.args.includes('read-only'));
  assert.ok(invoked.args.includes('--ephemeral') && invoked.args.includes('--skip-git-repo-check'));
  assert.ok(invoked.args.includes('--ignore-user-config'));
  assert.ok(invoked.args.includes('--json'));
  assert.equal(invoked.options.windowsHide, true);
  assert.equal('OPENAI_API_KEY' in invoked.options.env, false);
  assert.equal('CLOUDFLARE_API_KEY' in invoked.options.env, false);
  assert.match(invoked.args.join(' '), /read-only/);
  assert.match(childProcess.capturedPrompt(), /no invoques shell/);
  assert.match(result.summary, /Revisión local/);
  assert.deepEqual(result.evidence, ['Solo se inspeccionó el contexto permitido.']);
  assert.equal(result.provider, 'codex-exec');
  assert.equal(result.simulated, false);
  assert.deepEqual(result.usage, { inputTokens: 80, outputTokens: 20 });
});

test('CodexExecProvider rechaza una salida sin el formato exigido', async () => {
  const provider = new CodexExecProvider({
    command: 'codex-test-double',
    spawnProcess: () => fakeSpawn({ events: [{ type: 'item.completed', item: { type: 'agent_message', text: 'No es JSON' } }] }),
  });

  await assert.rejects(provider.execute({ id: 'HUEVO-demo', title: 'Tarea ficticia' }), /respuesta estructurada válida/);
});

test('CodexExecProvider aplica timeout y termina el proceso activo', async () => {
  let running;
  const provider = new CodexExecProvider({ command: 'codex-test-double', timeoutMs: 10,
    spawnProcess: () => { running = fakeSpawn({ autoClose: false }); return running; },
  });
  await assert.rejects(provider.execute({ id: 'HUEVO-timeout', title: 'Una tarea que excede el tiempo' }), /tiempo máximo/);
  assert.equal(running.wasKilled(), true);
});

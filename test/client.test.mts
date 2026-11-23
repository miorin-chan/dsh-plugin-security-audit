import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

let registration
globalThis.window = { __ModuleLoader__: { load(entry) { registration = entry } } }
await import('../client.js')
assert.equal(registration.id, '@miorin/dsh-plugin-security-audit')
const require = createRequire(import.meta.url)

const bundle = { name: '@fixture/plugin', installed: true, availability: 'profile', version: '1.0.0', update: 'registry' }
const versions = { status: 'listed', installed: bundle.version, registry: 'https://registry.example/', versions: [
  { version: '3.0.0-rc.1', bundle: true, prerelease: true },
  { version: '2.1.0', bundle: false },
  { version: '2.0.0', bundle: true },
] }

test('opens an unsent audit draft for the compatible stable update and cleans up on disable', async () => {
  let action
  let registered
  const states = []
  let hookIndex = 0
  let runEffect
  let refuseVersions = false
  let requestSignal
  let listCalls = 0
  const effects = []
  const requests = []
  const access = new Set(['pluginManager/listBundles', 'pluginManager/listVersions'])
  const htmlHead = new Set()
  globalThis.document = {
    head: { append: style => htmlHead.add(style) },
    createElement: () => ({ remove() { htmlHead.delete(this) } }),
  }
  const plugin = registration.factory(id => id === 'react' ? {
    useEffect: effect => { runEffect = effect },
    useState: initial => {
      const index = hookIndex++
      if (!(index in states)) states[index] = initial
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    },
  } : require(id))
  plugin.apply({
    effect(install) { effects.push(install()) },
    locale: {
      register(ns, labels) { registered = { ns, labels }; return () => { registered = undefined } },
      getLocale: () => ({ active: 'zh' }),
    },
    slots: {
      inject(name, register) {
        assert.equal(name, 'plugins.detail.actions')
        effects.push(register())
      },
      register(options, render) {
        assert.equal(options.id, 'dsh-plugin-security-audit')
        action = render
        return () => { action = undefined }
      },
    },
    remote: { $on: () => () => {}, pluginManager: {
      async listBundles() { listCalls += 1; return { ok: true, value: [bundle] } },
      async listVersions(name, options, signal) {
        assert.equal(name, bundle.name)
        assert.deepEqual(options, {})
        requestSignal = signal
        return { ok: true, value: refuseVersions ? { status: 'refused' } : versions }
      },
    } },
    uiWorkspace: { startSession(...args) { requests.push(args) } },
  })
  assert.equal(registered.ns, 'dsh-plugin-security-audit')
  assert.equal(Object.keys(registered.labels).length, 8)
  assert.equal(htmlHead.size, 1)
  const props = { subject: { kind: 'bundle', pkg: bundle }, t: key => registered.labels.zh[key], useRemoteAccess: key => access.has(key) }
  const render = (input = props) => { hookIndex = 0; return action(input) }
  refuseVersions = true
  assert.equal(render(), null)
  const cancelFirst = runEffect()
  await new Promise(resolve => setImmediate(resolve))
  const [retry] = render()
  assert.equal(retry.props.children, '重试查找审计版本')
  retry.props.onClick()
  cancelFirst()
  refuseVersions = false
  assert.equal(render(), null)
  const cancel = runEffect()
  await new Promise(resolve => setImmediate(resolve))
  const [button] = render()
  assert.equal(button.type, 'button')
  assert.equal(button.props.type, 'button')
  assert.equal(button.props.children.join(''), '审计更新 2.0.0')
  assert.deepEqual(requests, [])
  button.props.onClick()
  assert.equal(requests.length, 1)
  assert.equal(requests[0][0], undefined)
  assert.equal(requests[0][1].whenDraftExists, 'append')
  assert.match(requests[0][1].prompt, /"installedVersion":"1.0.0","targetVersion":"2.0.0"/)
  assert.equal(render({ ...props, subject: { kind: 'bundle', pkg: { ...bundle, name: 'another' } } }), null)
  cancel()
  assert.equal(requestSignal.aborted, true)

  access.clear()
  assert.equal(render(), null)
  runEffect()
  assert.equal(listCalls, 2)
  effects.reverse().forEach(dispose => dispose())
  assert.equal(action, undefined)
  assert.equal(registered, undefined)
  assert.equal(htmlHead.size, 0)
})
